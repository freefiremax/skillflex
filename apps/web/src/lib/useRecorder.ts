import { useCallback, useEffect, useRef, useState } from 'react'

export type RecorderState = 'idle' | 'ready' | 'recording' | 'stopped' | 'denied'

interface UseRecorder {
  state: RecorderState
  seconds: number
  error: string | null
  previewRef: (el: HTMLVideoElement | null) => void
  blob: Blob | null
  blobUrl: string | null
  /** Ask for the camera. Must be called from a user gesture. */
  arm: () => Promise<void>
  start: () => void
  stop: () => void
  reset: () => void
}

/**
 * getUserMedia + MediaRecorder wrapped for one purpose: record a short take,
 * hand back a Blob. The whole product's core loop depends on this working on a
 * mid-range Android Chrome, so it stays deliberately boring — no fancy codecs,
 * a hard duration cap, and it always releases the camera when it's done.
 */
export function useRecorder(maxSeconds = 120): UseRecorder {
  const [state, setState] = useState<RecorderState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const videoElRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const attachStream = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el
    if (el && streamRef.current) {
      el.srcObject = streamRef.current
      el.muted = true
      void el.play().catch(() => {})
    }
  }, [])

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const releaseCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const arm = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      })
      streamRef.current = stream
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream
        videoElRef.current.muted = true
        void videoElRef.current.play().catch(() => {})
      }
      setState('ready')
    } catch (err) {
      setState('denied')
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera and mic access was blocked. Enable it in your browser and retry.'
          : 'Could not start the camera. Check that no other app is using it.',
      )
    }
  }, [])

  const start = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []

    // Pick the first supported mime; Chrome/Android like webm, Safari mp4.
    const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    const mimeType = candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = () => {
      const out = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      setBlob(out)
      setBlobUrl(URL.createObjectURL(out))
      releaseCamera()
      setState('stopped')
    }
    recorder.start()
    recorderRef.current = recorder
    setSeconds(0)
    setState('recording')

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= maxSeconds) {
          // Hard cap: stop exactly at the limit.
          queueMicrotask(() => recorderRef.current?.state === 'recording' && recorderRef.current.stop())
        }
        return s + 1
      })
    }, 1000)
  }, [maxSeconds, releaseCamera])

  const stop = useCallback(() => {
    stopTimer()
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  const reset = useCallback(() => {
    stopTimer()
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlob(null)
    setBlobUrl(null)
    setSeconds(0)
    setError(null)
    setState('idle')
  }, [blobUrl])

  // Always release the camera on unmount — a hot green light after you leave
  // the page is exactly the kind of thing that torches trust in a video app.
  useEffect(
    () => () => {
      stopTimer()
      releaseCamera()
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    },
    [blobUrl, releaseCamera],
  )

  return { state, seconds, error, previewRef: attachStream, blob, blobUrl, arm, start, stop, reset }
}

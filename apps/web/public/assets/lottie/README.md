Lottie animations for the mascot go here.

Nothing in this folder yet — the owl currently renders as the SMIL-animated SVG
at ../mascot/angry-owl.svg, which is what `<object>` loads in
apps/web/src/components/MascotGuide.tsx.

When a real Lottie export lands (say `angry-owl.json` in this folder):

1. Uncomment `initLottie()` in MascotGuide.tsx and call it from an effect.
2. Delete the `<object>` element.

`#mascot-container` is the mount point either way, so nothing else moves.
`lottie-web` is already declared in apps/web/package.json; because the import in
that function is dynamic and currently unreachable, Rollup leaves it out of the
bundle entirely — the dependency costs zero shipped bytes until it is used.

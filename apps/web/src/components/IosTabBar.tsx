import React, { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

export interface IosTabItem {
  to: string
  label: string
  icon: (active: boolean) => React.ReactNode
}

interface IosTabBarProps {
  items: IosTabItem[]
  className?: string
}

export function IosTabBar({ items, className = '' }: IosTabBarProps) {
  const { pathname } = useLocation()

  // Find active index
  const activeIndex = useMemo(() => {
    const idx = items.findIndex((item) =>
      item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
    )
    return idx !== -1 ? idx : 0
  }, [pathname, items])

  const count = items.length

  return (
    <nav
      className={`ios-tab-bar ${className}`}
      aria-label="Navigation"
      style={
        {
          '--tab-count': count,
          '--active-index': activeIndex,
        } as React.CSSProperties
      }
    >
      <div className="ios-tab-backdrop" />
      <div className="ios-tab-glow" />

      {/* Liquid sliding active capsule indicator */}
      <div className="ios-tab-indicator-track">
        <div className="ios-tab-indicator">
          <div className="ios-indicator-inner" />
          <div className="ios-indicator-glow" />
        </div>
      </div>

      <div className="ios-tab-items">
        {items.map((item, index) => {
          const isActive = index === activeIndex

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={`ios-tab-item ${isActive ? 'active' : ''}`}
            >
              <span className="ios-tab-icon-wrap" aria-hidden="true">
                {item.icon(isActive)}
              </span>
              <span className="ios-tab-label">{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}

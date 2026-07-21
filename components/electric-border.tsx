'use client'

import React from 'react'

export function ElectricBorder({
  children,
  className = '',
  color = 'var(--primary)',
  roundedClass = 'rounded-2xl',
  active = true,
  topOnly = true, // Kept for prop compatibility, though the beam will surround everything smoothly
}: {
  children: React.ReactNode
  className?: string
  color?: string
  roundedClass?: string
  active?: boolean
  topOnly?: boolean
}) {
  // The border stays mounted to allow CSS transition-opacity to fade out smoothly

  // Helper to handle transparency for both hex and CSS variables
  const isHex = /^#([0-9A-F]{3}){1,2}$/i.test(color)
  const colorTransparent = isHex ? `${color}40` : `color-mix(in srgb, ${color} 25%, transparent)`

  // A gradient pattern for 6 separate chasing beams
  const multiBeamGradient = `conic-gradient(from 0deg, 
    transparent 0%, transparent 7%, ${colorTransparent} 13%, ${color} 15.5%, #ffffff 16.66%,
    transparent 16.66%, transparent 23.66%, ${colorTransparent} 29.66%, ${color} 32.16%, #ffffff 33.33%,
    transparent 33.33%, transparent 40.33%, ${colorTransparent} 46.33%, ${color} 48.83%, #ffffff 50%,
    transparent 50%, transparent 57%, ${colorTransparent} 63%, ${color} 65.5%, #ffffff 66.66%,
    transparent 66.66%, transparent 73.66%, ${colorTransparent} 79.66%, ${color} 82.16%, #ffffff 83.33%,
    transparent 83.33%, transparent 90.33%, ${colorTransparent} 96.33%, ${color} 98.83%, #ffffff 100%)`

  // A sleek, modern "magic beam" rotating border
  return (
    <div className={`relative ${roundedClass} ${className} overflow-visible`}>
      
      {/* Wrapper to handle smooth fade in/out */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-500 ease-in-out"
        style={{ opacity: active ? 1 : 0 }}
      >
        {/* Static Primary Blurred outer glow (Entire border) */}
        <div className="absolute -inset-[2px] z-0" style={{ filter: 'blur(4px)', opacity: 0.5 }}>
          <div 
            className={`absolute inset-0 ${roundedClass}`}
            style={{
               WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
               WebkitMaskComposite: 'xor',
               maskComposite: 'exclude',
               padding: '2px', 
               backgroundColor: color
            }}
          />
        </div>

        {/* Static Secondary wide colored aura (BEHIND the card, Entire border) */}
        <div className="absolute -inset-[2px] z-0" style={{ filter: 'blur(12px)', opacity: 0.3 }}>
          <div 
            className={`absolute inset-0 ${roundedClass}`}
            style={{
               WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
               WebkitMaskComposite: 'xor',
               maskComposite: 'exclude',
               padding: '2px', 
               backgroundColor: color
            }}
          />
        </div>

        {/* Animated glowing beam layer (core worms) */}
        <div 
          className={`absolute -inset-[2px] z-0 ${roundedClass}`}
          style={{
             WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
             WebkitMaskComposite: 'xor',
             maskComposite: 'exclude',
             padding: '2px', 
          }}
        >
          <div 
            className="absolute left-1/2 top-1/2 aspect-square w-[400%] -translate-x-1/2 -translate-y-1/2 animate-[spin_3s_linear_infinite]"
            style={{ background: multiBeamGradient }}
          />
        </div>

        {/* Static Inner/Top Glow Aura (OVER the image, Entire border) */}
        <div className="absolute -inset-[2px] z-20" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
          <div 
            className={`absolute inset-0 ${roundedClass}`}
            style={{
               WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
               WebkitMaskComposite: 'xor',
               maskComposite: 'exclude',
               padding: '2px', 
               backgroundColor: color
            }}
          />
        </div>
      </div>

      {/* Content wrapper (z-10) */}
      <div className={`relative z-10 h-full w-full ${roundedClass}`}>
        {children}
      </div>
    </div>
  )
}

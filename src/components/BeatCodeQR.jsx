import React from 'react';

export default function BeatCodeQR({ cover, primaryColor = '#ec4899' }) {
  return (
    <div className="relative w-60 h-60 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <defs>
          <radialGradient id="codeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="100" r="90" fill="url(#codeGlow)" />

        {/* 4 Corner Position Targets (Spotify / Beat Code style large target rings) */}
        {/* Top-Left Target */}
        <rect x="25" y="25" width="34" height="34" rx="12" fill="none" stroke={primaryColor} strokeWidth="5" />
        <rect x="34" y="34" width="16" height="16" rx="6" fill={primaryColor} />

        {/* Top-Right Target */}
        <rect x="141" y="25" width="34" height="34" rx="12" fill="none" stroke={primaryColor} strokeWidth="5" />
        <rect x="150" y="34" width="16" height="16" rx="6" fill={primaryColor} />

        {/* Bottom-Left Target */}
        <rect x="25" y="141" width="34" height="34" rx="12" fill="none" stroke={primaryColor} strokeWidth="5" />
        <rect x="34" y="150" width="16" height="16" rx="6" fill={primaryColor} />

        {/* Bottom-Right Target */}
        <rect x="141" y="141" width="34" height="34" rx="12" fill="none" stroke={primaryColor} strokeWidth="5" />
        <rect x="150" y="150" width="16" height="16" rx="6" fill={primaryColor} />

        {/* Dense Soundwave & Code Data Dots Pattern around center */}
        {/* Outer Data Dots Grid */}
        {[
          // Top Row & Bottom Row Dots
          { x: 70, y: 30, r: 3 }, { x: 82, y: 26, r: 4 }, { x: 96, y: 32, r: 3 }, { x: 110, y: 28, r: 4 }, { x: 124, y: 30, r: 3 },
          { x: 70, y: 170, r: 4 }, { x: 84, y: 166, r: 3 }, { x: 98, y: 172, r: 4 }, { x: 112, y: 168, r: 3 }, { x: 126, y: 170, r: 4 },
          // Left & Right Edge Dots
          { x: 30, y: 70, r: 4 }, { x: 26, y: 84, r: 3 }, { x: 32, y: 98, r: 4 }, { x: 28, y: 112, r: 3 }, { x: 30, y: 126, r: 4 },
          { x: 170, y: 70, r: 3 }, { x: 166, y: 84, r: 4 }, { x: 172, y: 98, r: 3 }, { x: 168, y: 112, r: 4 }, { x: 170, y: 126, r: 3 },
          // Mid-layer Data Rects/Capsules (Sound Bars)
          { x: 68, y: 50, w: 6, h: 12, rx: 3 }, { x: 80, y: 46, w: 10, h: 6, rx: 3 }, { x: 110, y: 48, w: 6, h: 14, rx: 3 }, { x: 124, y: 52, w: 12, h: 6, rx: 3 },
          { x: 68, y: 142, w: 10, h: 6, rx: 3 }, { x: 82, y: 140, w: 6, h: 14, rx: 3 }, { x: 112, y: 144, w: 12, h: 6, rx: 3 }, { x: 126, y: 138, w: 6, h: 12, rx: 3 },
          { x: 48, y: 68, w: 12, h: 6, rx: 3 }, { x: 46, y: 82, w: 6, h: 14, rx: 3 }, { x: 50, y: 112, w: 10, h: 6, rx: 3 }, { x: 48, y: 126, w: 6, h: 12, rx: 3 },
          { x: 142, y: 68, w: 6, h: 14, rx: 3 }, { x: 140, y: 84, w: 12, h: 6, rx: 3 }, { x: 144, y: 110, w: 6, h: 12, rx: 3 }, { x: 140, y: 126, w: 10, h: 6, rx: 3 }
        ].map((item, idx) => (
          item.r ? (
            <circle key={idx} cx={item.x} cy={item.y} r={item.r} fill={primaryColor} />
          ) : (
            <rect key={idx} x={item.x} y={item.y} width={item.w} height={item.h} rx={item.rx} fill={primaryColor} />
          )
        ))}
      </svg>

      {/* Center Album Art Cover (Exact Rounded Square Frame as in visual) */}
      <div className="absolute w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl p-0.5 bg-slate-900">
        <img src={cover} alt="Beat Code Art" className="w-full h-full object-cover rounded-[14px]" />
      </div>
    </div>
  );
}

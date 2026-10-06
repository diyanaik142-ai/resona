import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function BeatCodeQR({ cover, primaryColor = '#ec4899', trackId, title, artist, size = 200 }) {
  // We construct a deep link for the QR code value
  const qrValue = trackId ? `https://resona.anchorlyhms.com/song/${trackId}` : 'https://resona.anchorlyhms.com';

  return (
    <div 
      className="relative flex items-center justify-center p-3 bg-white rounded-3xl overflow-hidden shadow-2xl border-4" 
      style={{ width: size, height: size, borderColor: `${primaryColor}40` }}
    >
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at center, ${primaryColor} 0%, transparent 70%)`
        }}
      />
      
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <QRCodeSVG 
          id="beatcode-qr-svg"
          value={qrValue} 
          size={size - 24}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="H"
          imageSettings={cover ? {
            src: cover,
            x: undefined,
            y: undefined,
            height: size * 0.25,
            width: size * 0.25,
            excavate: true,
          } : undefined}
        />
      </div>
    </div>
  );
}

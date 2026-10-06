import React, { useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export default function ImageCropModal({ imageFile, onCancel, onCrop }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      canvas.width = 400;
      canvas.height = 400;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSave = () => {
    canvasRef.current.toBlob(blob => {
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      onCrop(file);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 relative">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold text-white text-center">Crop Picture</h2>
        <div className="flex justify-center bg-black rounded-xl p-4">
          <canvas ref={canvasRef} className="w-48 h-48 rounded-full border-2 border-teal-500"></canvas>
        </div>
        <p className="text-xs text-slate-400 text-center">Image is auto-centered and squared.</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-sm flex justify-center items-center gap-2"><Check className="w-4 h-4"/> Save</button>
        </div>
      </div>
    </div>
  );
}

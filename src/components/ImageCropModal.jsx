import React, { useState, useCallback, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';

// Helper to extract the cropped image
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

export default function ImageCropModal({ imageFile, onCancel, onCrop }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCrop(croppedFile);
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 relative flex flex-col max-h-screen">
        <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10" disabled={isProcessing}>
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white text-center">Adjust Picture</h2>
        
        <div className="relative w-full h-[300px] sm:h-[400px] bg-black rounded-xl overflow-hidden shrink-0">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-2">
          <ZoomOut className="w-5 h-5 text-slate-400" />
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-teal-400 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
          <ZoomIn className="w-5 h-5 text-slate-400" />
        </div>

        <p className="text-xs text-slate-400 text-center">Drag to pan, pinch or use slider to zoom.</p>
        
        <div className="flex gap-3 mt-4 shrink-0">
          <button onClick={onCancel} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex justify-center items-center gap-2 transition disabled:opacity-50">
            {isProcessing ? 'Processing...' : <><Check className="w-4 h-4"/> Save</>}
          </button>
        </div>
      </div>
    </div>
  );
}

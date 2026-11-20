import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex,
  onClose,
}) => {
  const [index, setIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  if (images.length === 0) return null;

  const prev = () => {
    setScale(1);
    setIndex((i) => (i - 1 + images.length) % images.length);
  };
  const next = () => {
    setScale(1);
    setIndex((i) => (i + 1) % images.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="图片大图预览"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-sm font-mono-tabular">
          {index + 1} / {images.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(1, Number((s - 0.4).toFixed(1))))}
            aria-label="缩小"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.6, Number((s + 0.4).toFixed(1))))}
            aria-label="放大"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭图片预览"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-auto p-4">
        {images.length > 1 && (
          <button
            type="button"
            onClick={prev}
            aria-label="上一张"
            className="absolute left-3 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={images[index]}
          alt={`梦境配图 ${index + 1}`}
          referrerPolicy="no-referrer"
          style={{ transform: `scale(${scale})` }}
          className="max-h-[80dvh] max-w-full object-contain rounded-xl transition-transform duration-150"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="下一张"
            className="absolute right-3 z-10 min-h-[44px] min-w-[44px] rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

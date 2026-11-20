import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenTool, RotateCcw, X } from 'lucide-react';

interface DoodleModalProps {
  open: boolean;
  onClose: () => void;
  onAttach: (dataUrl: string) => void;
}

const DOODLE_COLORS = ['#e6e4ef', '#9a93c7', '#7b96b8', '#8fa98d', '#b5927c', '#a87b8d'];

export const DoodleModal: React.FC<DoodleModalProps> = ({ open, onClose, onAttach }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushColor, setBrushColor] = useState(DOODLE_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#181926';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  }, [open]);

  if (!open) return null;

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#181926' : brushColor;
    ctx.lineWidth = isEraser ? brushWidth * 3 : brushWidth;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { x, y } = getPointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (historyRef.current.length > 20) historyRef.current.shift();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    ctx.putImageData(historyRef.current[historyRef.current.length - 1], 0, 0);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#181926';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="思绪涂鸦配图"
    >
      <div className="w-full max-w-lg rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
            涂鸦画板配图
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              className="min-h-[40px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs text-slate-700 dark:text-[#d0cde2] inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>撤销</span>
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[40px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs text-slate-700 dark:text-[#d0cde2]"
            >
              清空
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭涂鸦画板"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEraser(false)}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1 ${
                !isEraser
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>画笔</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEraser(true)}
              className={`min-h-[36px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1 ${
                isEraser
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>橡皮</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {DOODLE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`选择颜色 ${c}`}
                onClick={() => {
                  setIsEraser(false);
                  setBrushColor(c);
                }}
                className={`w-6 h-6 rounded-full border border-white/20 ${
                  !isEraser && brushColor === c ? 'ring-2 ring-[#8e86c2] scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <input
            type="range"
            min={2}
            max={14}
            aria-label="画笔粗细"
            value={brushWidth}
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            className="w-20 accent-[#645f8c]"
          />
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#181926]">
          <canvas
            ref={canvasRef}
            width={640}
            height={420}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full aspect-[640/420] touch-none cursor-crosshair block"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            onAttach(canvas.toDataURL('image/png'));
          }}
          className="w-full min-h-[46px] rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium transition-colors"
        >
          添加到当前梦境配图
        </button>
      </div>
    </div>
  );
};

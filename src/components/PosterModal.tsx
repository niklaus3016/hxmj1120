import React, { useEffect, useRef, useState } from 'react';
import { Share2, X } from 'lucide-react';
import { DreamRecord, TagRecord } from '../types/dream';
import { formatDateLabel } from '../db/storage';
import { getDisplayTitle, stripBoldMarkers } from '../utils/dreamText';

type PosterStyleId = 'night' | 'mist' | 'paper';

const POSTER_STYLES: { id: PosterStyleId; name: string }[] = [
  { id: 'night', name: '暗夜星尘' },
  { id: 'mist', name: '雾蓝诗笺' },
  { id: 'paper', name: '浅灰留白' },
];

interface PosterModalProps {
  dream: DreamRecord | null;
  tags: TagRecord[];
  onClose: () => void;
  onToast: (msg: string) => void;
}

function wrapChineseLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      if (lines.length > 0 && lines.length < maxLines) lines.push('');
      continue;
    }
    let current = '';
    for (const ch of para) {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = ch;
        if (lines.length >= maxLines) break;
      } else {
        current = test;
      }
    }
    if (lines.length >= maxLines) break;
    if (current) lines.push(current);
    if (lines.length >= maxLines) break;
  }

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (last.length > 2) {
      lines[maxLines - 1] = last.slice(0, -1) + '…';
    }
  }
  return lines;
}

export const PosterModal: React.FC<PosterModalProps> = ({ dream, tags, onClose, onToast }) => {
  const [styleId, setStyleId] = useState<PosterStyleId>('night');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!dream) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 750;
    const h = 1120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background per style
    if (styleId === 'night') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#161726');
      grad.addColorStop(0.55, '#201f33');
      grad.addColorStop(1, '#182132');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle star dots
      ctx.fillStyle = 'rgba(220, 218, 244, 0.28)';
      for (let i = 0; i < 42; i++) {
        const sx = ((i * 197) % 690) + 30;
        const sy = ((i * 313) % 1040) + 40;
        const sr = (i % 3) * 0.6 + 0.7;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (styleId === 'mist') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#222b3d');
      grad.addColorStop(0.5, '#2c364d');
      grad.addColorStop(1, '#222436');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#eef0f5');
      grad.addColorStop(1, '#e3e5ee');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    const isLight = styleId === 'paper';
    const textPrimary = isLight ? '#232635' : '#eceaf7';
    const textMuted = isLight ? '#666b80' : '#9c9ab8';
    const hairline = isLight ? 'rgba(35,38,53,0.12)' : 'rgba(236,234,247,0.14)';
    const panelFill = isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.04)';

    // Inner frame card
    const pad = 54;
    ctx.fillStyle = panelFill;
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 28);
    ctx.fill();
    ctx.stroke();

    // Header date & period
    ctx.fillStyle = textMuted;
    ctx.font = '24px "Plus Jakarta Sans", "Noto Sans SC", sans-serif';
    const metaText = `${formatDateLabel(dream.createTime)}  ·  ${dream.dreamTime}${dream.mood ? `  ·  ${dream.mood}` : ''}`;
    ctx.fillText(metaText, pad + 44, pad + 78);

    // Title
    ctx.fillStyle = textPrimary;
    ctx.font = '600 40px "Noto Serif SC", Georgia, serif';
    const titleLines = wrapChineseLines(ctx, getDisplayTitle(dream), w - pad * 2 - 88, 2);
    let y = pad + 152;
    for (const line of titleLines) {
      ctx.fillText(line, pad + 44, y);
      y += 56;
    }

    // Divider
    ctx.strokeStyle = hairline;
    ctx.beginPath();
    ctx.moveTo(pad + 44, y + 12);
    ctx.lineTo(w - pad - 44, y + 12);
    ctx.stroke();

    // Content
    y += 72;
    ctx.fillStyle = isLight ? '#373b4e' : '#d4d2e5';
    ctx.font = '28px "Noto Sans SC", sans-serif';
    const cleanBody = dream.isSecret
      ? '私密梦境内容已隐藏保护'
      : stripBoldMarkers(dream.content || '（记录留白，只记住这一刻的微光）');
    const bodyLines = wrapChineseLines(ctx, cleanBody, w - pad * 2 - 88, 12);
    for (const line of bodyLines) {
      ctx.fillText(line, pad + 44, y);
      y += 46;
    }

    // Tags line near bottom
    if (tags.length > 0) {
      ctx.fillStyle = textMuted;
      ctx.font = '22px "Noto Sans SC", sans-serif';
      const tagStr = tags.map((t) => `#${t.tagName}`).join('   ');
      ctx.fillText(tagStr, pad + 44, h - pad - 115);
    }

    // Footer brand
    ctx.strokeStyle = hairline;
    ctx.beginPath();
    ctx.moveTo(pad + 44, h - pad - 82);
    ctx.lineTo(w - pad - 44, h - pad - 82);
    ctx.stroke();

    ctx.fillStyle = textMuted;
    ctx.font = '22px "Noto Serif SC", serif';
    ctx.fillText('回序梦境 · 留住转瞬即逝的梦', pad + 44, h - pad - 38);

    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [dream, tags, styleId]);

  if (!dream) return null;

  const handleSharePoster = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) return;
      const file = new File([blob], `huixu_dream_${Date.now()}.png`, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: getDisplayTitle(dream),
          files: [file],
        });
        return;
      }

      // Fallback in desktop browser: trigger system file save/share dialog
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `回序梦境_${getDisplayTitle(dream)}.png`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      onToast('已生成梦境海报图片，可在系统面板中保存或分享');
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        onToast('分享面板打开失败，请重试');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="梦境海报预览"
    >
      <div className="w-full max-w-md rounded-3xl bg-[#f5f6fa] dark:bg-[#181926] border border-slate-200/80 dark:border-white/10 p-5 flex flex-col max-h-[92dvh]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
            梦境海报预览
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭海报预览"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style switcher */}
        <div className="flex items-center gap-2 mb-4">
          {POSTER_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              className={`flex-1 min-h-[40px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                styleId === s.id
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-[#a8a6be] hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto flex justify-center rounded-2xl bg-black/10 dark:bg-black/30 p-3">
          <canvas ref={canvasRef} className="hidden" />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="梦境海报"
              referrerPolicy="no-referrer"
              className="w-full max-w-[290px] h-auto rounded-xl shadow-lg object-contain"
            />
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSharePoster}
            className="w-full min-h-[48px] rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>分享图片</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { SimilarDreamPair } from '../utils/dreamAnalytics';
import { formatDateLabel } from '../db/storage';
import { getDisplayTitle, renderFormattedText } from '../utils/dreamText';
import { SELF_REFLECTION_DISCLAIMER } from '../types/dream';

interface CompareDreamsModalProps {
  pair: SimilarDreamPair | null;
  onClose: () => void;
  onOpenDream: (dreamId: string) => void;
}

export const CompareDreamsModal: React.FC<CompareDreamsModalProps> = ({
  pair,
  onClose,
  onOpenDream,
}) => {
  if (!pair) return null;

  const pct = Math.min(99, Math.max(15, Math.round(pair.similarity * 220)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="重复梦境对比"
    >
      <div className="w-full max-w-3xl max-h-[90dvh] rounded-t-3xl sm:rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
              疑似重复梦境对照
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9c9ab8] mt-0.5 font-mono-tabular">
              本地文本相似匹配度约 {pct}% · 共同意象：{pair.sharedTokens.join(' / ')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭对照"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[pair.dreamA, pair.dreamB].map((d) => (
            <div
              key={d.id}
              className="rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/8 p-4 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs text-slate-500 dark:text-[#9593b2] font-mono-tabular mb-1.5">
                  {formatDateLabel(d.createTime)} · {d.dreamTime}
                  {d.mood ? ` · ${d.mood}` : ''}
                </div>
                <h4 className="font-serif-dream text-base font-semibold text-slate-900 dark:text-[#eceaf6] mb-3">
                  {getDisplayTitle(d)}
                </h4>
                <p className="text-sm leading-relaxed text-slate-700 dark:text-[#c7c5da] whitespace-pre-wrap">
                  {d.isSecret
                    ? '私密梦境内容已隐藏，请进入详情查看'
                    : renderFormattedText(d.content || '（无正文）')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDream(d.id);
                }}
                className="mt-4 min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-[#5d5785] dark:text-[#a69fd4] hover:underline self-start"
              >
                <span>查看完整梦境</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-slate-200/70 dark:border-white/10 text-xs text-slate-500 dark:text-[#8d8ba8]">
          {SELF_REFLECTION_DISCLAIMER}
        </div>
      </div>
    </div>
  );
};

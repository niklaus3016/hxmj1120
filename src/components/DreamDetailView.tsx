import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Edit3,
  Image as ImageIcon,
  Lock,
  Share2,
  Star,
  Trash2,
  Repeat,
} from 'lucide-react';
import {
  DreamRecord,
  GUIDE_QUESTIONS,
  SELF_REFLECTION_DISCLAIMER,
  TagRecord,
} from '../types/dream';
import { formatDateLabel, formatDateTimeLabel } from '../db/storage';
import {
  copyToClipboard,
  formatDreamPlainText,
  getDisplayTitle,
  renderFormattedText,
  shareTextNative,
} from '../utils/dreamText';
import { SimilarDreamPair, findMostSimilarDream } from '../utils/dreamAnalytics';
import { ImageLightbox } from './ImageLightbox';

interface DreamDetailViewProps {
  dream: DreamRecord;
  allDreams: DreamRecord[];
  tags: TagRecord[];
  fontSizeClass: string;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPoster: () => void;
  onCompareSimilar: (pair: SimilarDreamPair) => void;
  onToast: (msg: string) => void;
}

export const DreamDetailView: React.FC<DreamDetailViewProps> = ({
  dream,
  allDreams,
  tags,
  fontSizeClass,
  onBack,
  onEdit,
  onDelete,
  onOpenPoster,
  onCompareSimilar,
  onToast,
}) => {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const similarMatch = useMemo(
    () => (dream.isDraft ? null : findMostSimilarDream(dream, allDreams)),
    [dream, allDreams]
  );

  const hasGuideContent = GUIDE_QUESTIONS.some(
    (q) => dream.guideAnswers?.[q.key]?.trim()
  );

  const plainText = formatDreamPlainText(dream, tags);
  const displayTitle = getDisplayTitle(dream);

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3 -ml-2 rounded-xl inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-[#b4b1cc] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回时间线</span>
        </button>

        <button
          type="button"
          onClick={onEdit}
          className="min-h-[44px] px-4 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium inline-flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>编辑</span>
        </button>
      </div>

      {/* Duplicate Dream Alert Banner */}
      {similarMatch && (
        <button
          type="button"
          onClick={() => onCompareSimilar(similarMatch)}
          className="w-full text-left rounded-2xl bg-[#645f8c]/12 dark:bg-[#7e77a3]/15 border border-[#7e77a3]/30 px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#645f8c]/18 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Repeat className="w-4 h-4 text-[#645f8c] dark:text-[#b1aad8] shrink-0" />
            <span className="text-xs text-slate-700 dark:text-[#dad7ec] truncate">
              该梦境与 {formatDateLabel(similarMatch.dreamB.createTime)} 梦境相似度较高，疑似重复梦境
            </span>
          </div>
          <span className="text-xs font-medium text-[#5d5785] dark:text-[#b7b0e0] whitespace-nowrap shrink-0">
            点击对比
          </span>
        </button>
      )}

      {/* Main Content Article */}
      <article className="rounded-3xl bg-white/85 dark:bg-[#191a28]/90 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-6 sm:p-8 space-y-6">
        <header className="space-y-3 border-b border-slate-200/70 dark:border-white/8 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-[#9896b3] font-mono-tabular">
              <span>{formatDateLabel(dream.createTime)}</span>
              <span aria-hidden="true"> · </span>
              <span>{dream.dreamTime}</span>
              {dream.mood && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{dream.mood}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              {dream.isStar && (
                <span className="inline-flex items-center gap-1 text-xs text-[#a38c6d]">
                  <Star className="w-3.5 h-3.5 fill-[#a38c6d]" />
                  <span>星标</span>
                </span>
              )}
              {dream.isSecret && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#9896b3]">
                  <Lock className="w-3.5 h-3.5" />
                  <span>私密</span>
                </span>
              )}
            </div>
          </div>

          <h1 className="font-serif-dream text-xl sm:text-2xl font-semibold text-slate-900 dark:text-[#f2f0fa] leading-snug">
            {displayTitle}
          </h1>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-[#a8a6be]">
              {tags.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: t.tagColor }}
                  />
                  <span>#{t.tagName}</span>
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Body Prose */}
        <div
          className={`${fontSizeClass} leading-loose text-slate-800 dark:text-[#dfddf0] whitespace-pre-wrap`}
        >
          {dream.content.trim()
            ? renderFormattedText(dream.content)
            : '（未填写梦境原文）'}
        </div>

        {/* Attached Photos */}
        {dream.imagePathList.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-medium text-slate-500 dark:text-[#9896b3]">
              梦境配图（点击放大预览）
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {dream.imagePathList.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxIdx(idx)}
                  className="aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:opacity-90 transition-opacity"
                >
                  <img
                    src={src}
                    alt={`梦境配图 ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Review Section */}
        {dream.review.trim() && (
          <section className="pt-5 border-t border-slate-200/70 dark:border-white/8 space-y-2">
            <h2 className="text-xs font-semibold text-slate-500 dark:text-[#9c9ab8]">
              我的复盘感受
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-[#c7c5da] whitespace-pre-wrap">
              {dream.review}
            </p>
          </section>
        )}

        {/* Guided Checklist Answers */}
        {hasGuideContent && (
          <section className="pt-5 border-t border-slate-200/70 dark:border-white/8 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-[#9c9ab8]">
                自我梳理清单记录
              </h2>
              <span className="text-[11px] text-slate-400 dark:text-[#7e7c9c]">
                {SELF_REFLECTION_DISCLAIMER}
              </span>
            </div>
            <div className="space-y-2.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] p-4">
              {GUIDE_QUESTIONS.map((q) => {
                const ans = dream.guideAnswers?.[q.key];
                if (!ans?.trim()) return null;
                return (
                  <div key={q.key} className="text-xs space-y-0.5">
                    <div className="text-slate-500 dark:text-[#9896b3]">{q.label}</div>
                    <div className="text-slate-800 dark:text-[#e1dff0] leading-relaxed">
                      {ans}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Timestamps */}
        <footer className="pt-4 border-t border-slate-200/60 dark:border-white/[0.06] flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-400 dark:text-[#7a7896] font-mono-tabular">
          <span>记录于 {formatDateTimeLabel(dream.createTime)}</span>
          <span>最近修改 {formatDateTimeLabel(dream.updateTime)}</span>
        </footer>
      </article>

      {/* Bottom Action Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => copyToClipboard(plainText, onToast)}
          className="min-h-[46px] px-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-[#d0cde2] inline-flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-white/10"
        >
          <Copy className="w-4 h-4" />
          <span>复制文本</span>
        </button>

        <button
          type="button"
          onClick={() => shareTextNative(displayTitle, plainText, onToast)}
          className="min-h-[46px] px-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-[#d0cde2] inline-flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-white/10"
        >
          <Share2 className="w-4 h-4" />
          <span>分享文本</span>
        </button>

        <button
          type="button"
          onClick={onOpenPoster}
          className="min-h-[46px] px-4 rounded-2xl bg-white/80 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-[#d0cde2] inline-flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-white/10"
        >
          <ImageIcon className="w-4 h-4" />
          <span>生成海报</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="min-h-[46px] px-4 rounded-2xl bg-[#8f5768]/10 border border-[#8f5768]/25 text-xs font-medium text-[#9e5d70] inline-flex items-center justify-center gap-2 hover:bg-[#8f5768]/15"
        >
          <Trash2 className="w-4 h-4" />
          <span>删除梦境</span>
        </button>
      </div>

      {lightboxIdx !== null && (
        <ImageLightbox
          images={dream.imagePathList}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
};

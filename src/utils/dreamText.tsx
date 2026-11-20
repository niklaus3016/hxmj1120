import React from 'react';
import { DreamRecord, TagRecord } from '../types/dream';
import { formatDateLabel, formatDefaultDreamTitle } from '../db/storage';

export function getDisplayTitle(dream: DreamRecord): string {
  return dream.title.trim() || formatDefaultDreamTitle(dream.createTime);
}

export function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

export function formatDreamPlainText(dream: DreamRecord, tags: TagRecord[]): string {
  const title = getDisplayTitle(dream);
  const dateStr = formatDateLabel(dream.createTime);
  const tagText = tags.length > 0 ? tags.map((t) => `#${t.tagName}`).join(' ') : '无标签';
  const moodPart = dream.mood ? ` · ${dream.mood}` : '';
  const parts = [
    `【${title}】`,
    `${dateStr} · ${dream.dreamTime}${moodPart}`,
    `标签：${tagText}`,
    '',
    stripBoldMarkers(dream.content || '（未填写梦境正文）'),
  ];

  if (dream.review.trim()) {
    parts.push('', '—— 我的复盘感受 ——', dream.review.trim());
  }

  parts.push('', '—— 记录于 回序梦境 ——');
  return parts.join('\n');
}

export async function shareTextNative(
  title: string,
  text: string,
  onToast: (msg: string) => void
): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    onToast('已复制文本内容，可粘贴分享给其他应用');
  } catch {
    onToast('当前环境不支持自动分享，请手动复制文本');
  }
}

export async function copyToClipboard(text: string, onToast: (msg: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    onToast('已复制到剪贴板');
  } catch {
    onToast('复制失败，请手动选中复制');
  }
}

export function renderFormattedText(
  text: string,
  highlightQuery = ''
): React.ReactNode[] {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  const q = highlightQuery.trim();

  const highlightString = (str: string, keyPrefix: string): React.ReactNode[] => {
    if (!q) return [str];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = str.split(regex);
    return parts.map((part, idx) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark
          key={`${keyPrefix}-hl-${idx}`}
          className="rounded px-0.5 bg-[#7e77a3]/30 text-inherit dark:bg-[#9b93c9]/35"
        >
          {part}
        </mark>
      ) : (
        <React.Fragment key={`${keyPrefix}-tx-${idx}`}>{part}</React.Fragment>
      )
    );
  };

  return segments.map((seg, index) => {
    if (seg.startsWith('**') && seg.endsWith('**') && seg.length > 4) {
      const inner = seg.slice(2, -2);
      return (
        <strong key={`b-${index}`} className="font-semibold text-[#312d4b] dark:text-[#f2effb]">
          {highlightString(inner, `b-${index}`)}
        </strong>
      );
    }
    return <React.Fragment key={`n-${index}`}>{highlightString(seg, `n-${index}`)}</React.Fragment>;
  });
}

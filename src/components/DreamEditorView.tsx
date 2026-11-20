import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Lock,
  Palette,
  Plus,
  Save,
  FileText,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  DREAM_MOODS,
  DREAM_TEMPLATES,
  DREAM_TIMES,
  DreamMood,
  DreamRecord,
  DreamTime,
  GUIDE_QUESTIONS,
  GuideAnswers,
  SELF_REFLECTION_DISCLAIMER,
  TAG_PALETTE,
  TagRecord,
} from '../types/dream';
import { generateId } from '../db/storage';
import { ConfirmModal } from './ConfirmModal';
import { DoodleModal } from './DoodleModal';

interface DreamEditorViewProps {
  initialDream?: DreamRecord | null;
  initialTagIds?: string[];
  prefillContent?: string;
  prefillImage?: string | null;
  tags: TagRecord[];
  onCreateTag: (tagName: string, tagColor: string) => Promise<TagRecord>;
  onSaveDream: (dream: DreamRecord, tagIds: string[]) => Promise<void>;
  onDeleteDream?: (dream: DreamRecord) => Promise<void>;
  onCancel: () => void;
  onToast: (msg: string) => void;
}

const EMPTY_GUIDE: GuideAnswers = {
  env: '',
  people: '',
  thought: '',
  feeling: '',
};

export const DreamEditorView: React.FC<DreamEditorViewProps> = ({
  initialDream,
  initialTagIds = [],
  prefillContent = '',
  prefillImage = null,
  tags,
  onCreateTag,
  onSaveDream,
  onDeleteDream,
  onCancel,
  onToast,
}) => {
  const [title, setTitle] = useState(initialDream?.title || '');
  const [content, setContent] = useState(
    initialDream?.content ?? prefillContent
  );
  const [review, setReview] = useState(initialDream?.review || '');
  const [dreamTime, setDreamTime] = useState<DreamTime>(
    initialDream?.dreamTime || '深夜睡眠'
  );
  const [mood, setMood] = useState<DreamMood>(initialDream?.mood || '');
  const [isStar, setIsStar] = useState(initialDream?.isStar || false);
  const [isSecret, setIsSecret] = useState(initialDream?.isSecret || false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [images, setImages] = useState<string[]>(() => {
    const base = initialDream?.imagePathList || [];
    if (prefillImage && !base.includes(prefillImage)) {
      return [...base, prefillImage];
    }
    return base;
  });
  const [guideAnswers, setGuideAnswers] = useState<GuideAnswers>(
    initialDream?.guideAnswers || { ...EMPTY_GUIDE }
  );
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [templateExpanded, setTemplateExpanded] = useState(false);

  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [showNewTagBox, setShowNewTagBox] = useState(false);

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [doodleModalOpen, setDoodleModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (prefillImage && !images.includes(prefillImage)) {
      setImages((prev) => [...prev, prefillImage]);
    }
  }, [prefillImage]);

  useEffect(() => {
    if (prefillContent && !initialDream && !content.trim()) {
      setContent(prefillContent);
    }
  }, [prefillContent]);

  const tagSelectionKey = [...selectedTagIds].sort().join(',');
  const initialTagSelectionKey = [...initialTagIds].sort().join(',');

  const isDirty =
    title !== (initialDream?.title || '') ||
    content !== (initialDream?.content || '') ||
    review !== (initialDream?.review || '') ||
    dreamTime !== (initialDream?.dreamTime || '深夜睡眠') ||
    mood !== (initialDream?.mood || '') ||
    isStar !== Boolean(initialDream?.isStar) ||
    isSecret !== Boolean(initialDream?.isSecret) ||
    tagSelectionKey !== initialTagSelectionKey ||
    JSON.stringify(guideAnswers) !==
      JSON.stringify(initialDream?.guideAnswers || EMPTY_GUIDE) ||
    images.length !== (initialDream?.imagePathList?.length || 0);

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddInlineTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    const existing = tags.find((t) => t.tagName === trimmed);
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id]);
      }
      setNewTagInput('');
      setShowNewTagBox(false);
      return;
    }
    const created = await onCreateTag(trimmed, newTagColor);
    setSelectedTagIds((prev) => [...prev, created.id]);
    setNewTagInput('');
    setShowNewTagBox(false);
    onToast(`已添加标签「${created.tagName}」`);
  };

  const handleWrapBold = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const inner = selected || '加粗内容';
    const wrapped = `**${inner}**`;
    const next = content.slice(0, start) + wrapped + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      const innerStart = start + 2;
      el.setSelectionRange(innerStart, innerStart + inner.length);
    }, 0);
  };

  const handleSelectImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers = Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        })
    );

    try {
      const results = await Promise.all(readers);
      setImages((prev) => [...prev, ...results.filter(Boolean)]);
      onToast(`已导入 ${results.length} 张本地图片`);
    } catch {
      onToast('读取所选图片时出现问题');
    } finally {
      e.target.value = '';
    }
  };

  const buildRecord = (asDraft: boolean): DreamRecord => {
    const now = Date.now();
    return {
      id: initialDream?.id || generateId('dream'),
      title: title.trim(),
      content,
      review,
      guideAnswers,
      createTime: initialDream?.createTime || now,
      updateTime: now,
      dreamTime,
      mood,
      isStar,
      isSecret,
      imagePathList: images,
      // Editing an existing formal record must not silently turn it into a draft.
      isDraft: initialDream ? (asDraft ? initialDream.isDraft : false) : asDraft,
    };
  };

  const handleSave = async (asDraft: boolean) => {
    if (saving) return;
    setSaving(true);
    try {
      const record = buildRecord(asDraft);
      await onSaveDream(record, selectedTagIds);
      onToast(asDraft ? '已暂存到草稿箱' : '梦境已保存到本地');
    } catch {
      onToast('保存失败，本机存储空间可能已满，请删除部分配图后重试');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
    } else {
      onCancel();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="min-h-[44px] px-3 -ml-2 rounded-xl inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-[#b4b1cc] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="min-h-[44px] px-4 rounded-xl text-xs font-medium bg-white/75 dark:bg-white/[0.06] text-slate-700 dark:text-[#d0cde2] border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 whitespace-nowrap disabled:opacity-50"
          >
            暂存草稿
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="min-h-[44px] px-5 rounded-xl text-xs font-medium bg-[#645f8c] hover:bg-[#57527c] text-white inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>保存梦境</span>
          </button>
        </div>
      </div>

      {/* Main Editor Card */}
      <div className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-7 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-[#9896b3] mb-2">
            梦境标题（可留空，自动按日期生成默认标题）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给这段梦境起一个名字……"
            className="w-full min-h-[46px] px-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 font-serif-dream text-base text-slate-900 dark:text-[#efedf9] placeholder:text-slate-400 dark:placeholder:text-[#6f6d8a] focus:outline-none focus:ring-2 focus:ring-[#7e77a3]/40"
          />
        </div>

        {/* Content with Bold & Template Tools */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-medium text-slate-500 dark:text-[#9896b3]">
              梦境原文
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleWrapBold}
                className="min-h-[34px] px-2.5 rounded-lg text-xs text-slate-600 dark:text-[#b8b5cf] bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 inline-flex items-center gap-1"
              >
                <Bold className="w-3.5 h-3.5" />
                <span>加粗</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateExpanded((v) => !v)}
                className="min-h-[34px] px-2.5 rounded-lg text-xs text-slate-600 dark:text-[#b8b5cf] bg-slate-200/60 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 inline-flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>模板填充</span>
              </button>
            </div>
          </div>

          {templateExpanded && (
            <div className="mb-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 space-y-2">
              <div className="text-[11px] text-slate-500 dark:text-[#9896b3]">
                选择预设模板追加到正文（点击即可填入）
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DREAM_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setContent((prev) =>
                        prev.trim() ? `${prev.trim()}\n\n${tpl.content}` : tpl.content
                      );
                      setTemplateExpanded(false);
                      onToast(`已填入「${tpl.title}」`);
                    }}
                    className="text-left px-3 py-2 rounded-xl bg-white/80 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5"
                  >
                    <div className="text-xs font-medium text-slate-800 dark:text-[#e6e4ef]">
                      {tpl.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#8f8daa] truncate">
                      {tpl.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="趁记忆还没消散，记录刚才的画面、声音或细节……（支持 **加粗** 标记）"
            className="w-full p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 text-sm sm:text-base leading-relaxed text-slate-900 dark:text-[#efedf9] placeholder:text-slate-400 dark:placeholder:text-[#6f6d8a] focus:outline-none focus:ring-2 focus:ring-[#7e77a3]/40 resize-y"
          />
        </div>

        {/* Dream Time Period */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-[#9896b3] mb-2.5">
            入梦时段
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DREAM_TIMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setDreamTime(t)}
                className={`min-h-[42px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                  dreamTime === t
                    ? 'bg-[#645f8c] text-white'
                    : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da] hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Dream Mood */}
        <div>
          <div className="text-xs font-medium text-slate-500 dark:text-[#9896b3] mb-2.5">
            梦境情绪（再次点击可取消选择）
          </div>
          <div className="flex flex-wrap gap-2">
            {DREAM_MOODS.map((m) => {
              const active = mood === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(active ? '' : m)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#645f8c] text-white'
                      : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da] hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags + Inline Tag Creator */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-[#9896b3]">
              梦境标签（可多选）
            </span>
            <button
              type="button"
              onClick={() => setShowNewTagBox((v) => !v)}
              className="min-h-[34px] px-2.5 rounded-lg text-xs font-medium text-[#5d5785] dark:text-[#a8a1d6] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建标签</span>
            </button>
          </div>

          {showNewTagBox && (
            <div className="mb-3 p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row gap-2.5 sm:items-center">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="输入新标签名称"
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-[#eceaf6]"
              />
              <div className="flex items-center gap-1.5">
                {TAG_PALETTE.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewTagColor(c)}
                    aria-label={`选择颜色 ${c}`}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newTagColor === c ? 'ring-2 ring-offset-2 ring-[#645f8c] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddInlineTag}
                className="min-h-[40px] px-4 rounded-xl bg-[#645f8c] text-white text-xs font-medium whitespace-nowrap"
              >
                添加
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#645f8c] text-white'
                      : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da] hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: active ? '#fff' : tag.tagColor }}
                  />
                  <span>{tag.tagName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Isolated PhotoPicker & Doodle Attachment */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-[#9896b3]">
              梦境配图（仅读取你主动选中的图片，不扫描相册）
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelectImages}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-4 rounded-xl bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-[#d0cde2] inline-flex items-center gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              <span>系统照片选择器</span>
            </button>
            <button
              type="button"
              onClick={() => setDoodleModalOpen(true)}
              className="min-h-[44px] px-4 rounded-xl bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-700 dark:text-[#d0cde2] inline-flex items-center gap-2"
            >
              <Palette className="w-4 h-4" />
              <span>涂鸦画板配图</span>
            </button>
          </div>

          {images.length > 0 && (
            <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((src, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img
                    src={src}
                    alt={`已选配图 ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label="移除该图片"
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Star & Secret Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setIsStar((v) => !v)}
            className={`min-h-[48px] px-4 rounded-2xl border flex items-center justify-between transition-colors ${
              isStar
                ? 'bg-[#645f8c]/15 border-[#7e77a3] text-slate-900 dark:text-[#efedf9]'
                : 'bg-slate-100/70 dark:bg-white/[0.03] border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-[#c7c5da]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-xs font-medium">
              <Star className={`w-4 h-4 ${isStar ? 'fill-[#a38c6d] text-[#a38c6d]' : ''}`} />
              <span>星标收藏</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-[#9896b3]">
              {isStar ? '已开启' : '未开启'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsSecret((v) => !v)}
            className={`min-h-[48px] px-4 rounded-2xl border flex items-center justify-between transition-colors ${
              isSecret
                ? 'bg-[#645f8c]/15 border-[#7e77a3] text-slate-900 dark:text-[#efedf9]'
                : 'bg-slate-100/70 dark:bg-white/[0.03] border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-[#c7c5da]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-xs font-medium">
              <Lock className="w-4 h-4" />
              <span>私密梦境（首页隐藏预览）</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-[#9896b3]">
              {isSecret ? '已开启' : '未开启'}
            </span>
          </button>
        </div>

        {/* Independent Review Box */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-[#9896b3] mb-2">
            我的复盘感受（独立存储，与梦境原文区分）
          </label>
          <textarea
            rows={3}
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="写下醒来后关于近况、情绪或思绪的自我梳理……"
            className="w-full p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 text-sm leading-relaxed text-slate-900 dark:text-[#efedf9] placeholder:text-slate-400 dark:placeholder:text-[#6f6d8a] focus:outline-none focus:ring-2 focus:ring-[#7e77a3]/40"
          />
        </div>

        {/* Collapsible Dream Guide Checklist */}
        <div className="rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/8 overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideExpanded((v) => !v)}
            className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left"
          >
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-[#e1dff0]">
                梦境引导清单（可选展开梳理）
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#8f8daa] mt-0.5">
                {SELF_REFLECTION_DISCLAIMER}
              </div>
            </div>
            {guideExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          {guideExpanded && (
            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-200/60 dark:border-white/8">
              {GUIDE_QUESTIONS.map((q) => (
                <label key={q.key} className="block">
                  <span className="text-xs font-medium text-slate-700 dark:text-[#c7c5da]">
                    {q.label}
                  </span>
                  <input
                    type="text"
                    value={guideAnswers[q.key]}
                    onChange={(e) =>
                      setGuideAnswers((prev) => ({
                        ...prev,
                        [q.key]: e.target.value,
                      }))
                    }
                    placeholder={q.placeholder}
                    className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-[#eceaf6] placeholder:text-slate-400 dark:placeholder:text-[#6f6d8a]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer Secondary Actions */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 dark:border-white/8">
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="min-h-[42px] px-4 rounded-xl text-xs font-medium text-slate-500 dark:text-[#9c9ab8] hover:bg-black/5 dark:hover:bg-white/5"
          >
            清空当前填写
          </button>

          {initialDream && onDeleteDream && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="min-h-[42px] px-4 rounded-xl text-xs font-medium text-[#9e5d70] hover:bg-[#9e5d70]/10 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除本条梦境</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmations */}
      <ConfirmModal
        open={confirmClearOpen}
        title="清空已填写内容"
        description="将清空标题、原文、复盘及所选图片，是否继续？"
        confirmLabel="清空"
        destructive
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setTitle('');
          setContent('');
          setReview('');
          setDreamTime('深夜睡眠');
          setMood('');
          setIsStar(false);
          setIsSecret(false);
          setImages([]);
          setSelectedTagIds([]);
          setGuideAnswers({ ...EMPTY_GUIDE });
          setConfirmClearOpen(false);
        }}
      />

      {confirmLeaveOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#f7f8fb] dark:bg-[#1b1c2a] border border-slate-200/80 dark:border-white/10 p-6 shadow-2xl space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6] mb-1.5">
                尚未保存当前内容
              </h3>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-[#a8a6be]">
                你可以暂存到草稿箱以便下次继续填写，或放弃本次编辑。
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  setConfirmLeaveOpen(false);
                  await handleSave(true);
                }}
                className="w-full min-h-[44px] rounded-xl text-sm font-medium text-white bg-[#645f8c] hover:bg-[#57527c] transition-colors"
              >
                暂存草稿并返回
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmLeaveOpen(false)}
                  className="min-h-[44px] rounded-xl text-sm font-medium text-slate-700 dark:text-[#c7c5da] bg-slate-200/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  继续编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmLeaveOpen(false);
                    onCancel();
                  }}
                  className="min-h-[44px] rounded-xl text-sm font-medium text-[#9e5d70] bg-[#8f5768]/12 hover:bg-[#8f5768]/20 transition-colors"
                >
                  放弃并返回
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {initialDream && onDeleteDream && (
        <ConfirmModal
          open={confirmDeleteOpen}
          title="确认删除本条梦境"
          description="删除后无法恢复，将同时清除本条关联的图片与标签关系。"
          confirmLabel="确认删除"
          destructive
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            setConfirmDeleteOpen(false);
            await onDeleteDream(initialDream);
          }}
        />
      )}

      <DoodleModal
        open={doodleModalOpen}
        onClose={() => setDoodleModalOpen(false)}
        onAttach={(dataUrl) => {
          setImages((prev) => [...prev, dataUrl]);
          setDoodleModalOpen(false);
          onToast('涂鸦已添加到当前梦境配图');
        }}
      />
    </div>
  );
};

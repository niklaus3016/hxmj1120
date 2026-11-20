import React, { useMemo, useRef, useState } from 'react';
import {
  Edit3,
  FileText,
  Filter,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  Copy,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import {
  CardLayoutMode,
  DreamFilter,
  DreamRecord,
  DreamTagRelation,
  GENTLE_QUOTES,
  SortMode,
  TagRecord,
} from '../types/dream';
import { formatDateLabel } from '../db/storage';
import {
  copyToClipboard,
  formatDreamPlainText,
  getDisplayTitle,
  renderFormattedText,
  shareTextNative,
  stripBoldMarkers,
} from '../utils/dreamText';

interface TimelineViewProps {
  dreams: DreamRecord[];
  tags: TagRecord[];
  relations: DreamTagRelation[];
  filter: DreamFilter;
  sortMode: SortMode;
  cardLayout: CardLayoutMode;
  fontSizeClass: string;
  onChangeFilter: (next: DreamFilter) => void;
  onChangeSort: (next: SortMode) => void;
  onOpenFilterDrawer: () => void;
  onOpenDream: (dreamId: string) => void;
  onEditDream: (dreamId: string) => void;
  onNewDream: () => void;
  onDeleteDream: (dream: DreamRecord) => void;
  onOpenPoster: (dream: DreamRecord) => void;
  onToast: (msg: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  dreams,
  tags,
  relations,
  filter,
  sortMode,
  cardLayout,
  fontSizeClass,
  onChangeFilter,
  onChangeSort,
  onOpenFilterDrawer,
  onOpenDream,
  onEditDream,
  onNewDream,
  onDeleteDream,
  onOpenPoster,
  onToast,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuDream, setMenuDream] = useState<DreamRecord | null>(null);
  const [quoteIdx] = useState(() => Math.floor(Math.random() * GENTLE_QUOTES.length));
  const longPressTimerRef = useRef<number | null>(null);

  const tagMap = useMemo(() => {
    const map = new Map<string, TagRecord>();
    tags.forEach((t) => map.set(t.id, t));
    return map;
  }, [tags]);

  const dreamTagsMap = useMemo(() => {
    const map = new Map<string, TagRecord[]>();
    relations.forEach((rel) => {
      const t = tagMap.get(rel.tagId);
      if (t) {
        const arr = map.get(rel.dreamId) || [];
        arr.push(t);
        map.set(rel.dreamId, arr);
      }
    });
    return map;
  }, [relations, tagMap]);

  const drafts = useMemo(
    () =>
      dreams
        .filter((d) => d.isDraft)
        .sort((a, b) => b.updateTime - a.updateTime),
    [dreams]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.datePreset !== 'all') count++;
    if (filter.moods.length > 0) count++;
    if (filter.tagIds.length > 0) count++;
    if (filter.starOnly) count++;
    if (filter.secretOnly) count++;
    if (filter.hasImageOnly) count++;
    return count;
  }, [filter]);

  const filteredDreams = useMemo(() => {
    const q = filter.searchQuery.trim().toLowerCase();
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const list = dreams.filter((d) => {
      if (d.isDraft) return false;

      if (filter.datePreset === 'week' && d.createTime < startOfWeek.getTime()) return false;
      if (filter.datePreset === 'month' && d.createTime < startOfMonth) return false;
      if (filter.datePreset === 'custom') {
        if (filter.startDate) {
          const s = new Date(filter.startDate + 'T00:00:00').getTime();
          if (d.createTime < s) return false;
        }
        if (filter.endDate) {
          const e = new Date(filter.endDate + 'T23:59:59').getTime();
          if (d.createTime > e) return false;
        }
      }

      if (filter.moods.length > 0 && !filter.moods.includes(d.mood)) return false;

      const dTags = dreamTagsMap.get(d.id) || [];
      if (filter.tagIds.length > 0) {
        const dTagIds = new Set(dTags.map((t) => t.id));
        const hasAny = filter.tagIds.some((tid) => dTagIds.has(tid));
        if (!hasAny) return false;
      }

      if (filter.starOnly && !d.isStar) return false;
      if (filter.secretOnly && !d.isSecret) return false;
      if (filter.hasImageOnly && d.imagePathList.length === 0) return false;

      if (q) {
        const hayTitle = getDisplayTitle(d).toLowerCase();
        const hayContent = d.isSecret ? '' : stripBoldMarkers(d.content).toLowerCase();
        const hayReview = d.isSecret ? '' : d.review.toLowerCase();
        const hayTags = dTags.map((t) => t.tagName.toLowerCase()).join(' ');
        if (
          !hayTitle.includes(q) &&
          !hayContent.includes(q) &&
          !hayReview.includes(q) &&
          !hayTags.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortMode === 'asc') return a.createTime - b.createTime;
      if (sortMode === 'star') {
        if (a.isStar !== b.isStar) return a.isStar ? -1 : 1;
        return b.createTime - a.createTime;
      }
      return b.createTime - a.createTime;
    });
  }, [dreams, filter, sortMode, dreamTagsMap]);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const startLongPress = (dream: DreamRecord, e: React.PointerEvent) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setMenuDream(dream);
    }, 500);
  };

  const handlePointerMoveCard = (e: React.PointerEvent) => {
    if (!pointerStartRef.current) return;
    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 8 || dy > 8) {
      cancelLongPress();
    }
  };

  const cancelLongPress = () => {
    pointerStartRef.current = null;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isCompact = cardLayout === 'compact';

  return (
    <div className="space-y-6">
      {/* Gentle Built-in Literary Quote + Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="font-serif-dream text-sm sm:text-base text-slate-600 dark:text-[#b4b1cc] leading-relaxed">
              {GENTLE_QUOTES[quoteIdx]}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="搜索梦境"
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                searchOpen || filter.searchQuery
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-white/75 dark:bg-white/[0.05] text-slate-700 dark:text-[#c7c5da] border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>搜索</span>
            </button>

            <button
              type="button"
              onClick={onOpenFilterDrawer}
              aria-label="筛选梦境"
              className={`min-h-[44px] px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeFilterCount > 0
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-white/75 dark:bg-white/[0.05] text-slate-700 dark:text-[#c7c5da] border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>筛选{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>

            <div className="flex items-center bg-white/75 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 rounded-xl p-1">
              {(
                [
                  { id: 'desc', label: '最新' },
                  { id: 'asc', label: '最早' },
                  { id: 'star', label: '星标' },
                ] as { id: SortMode; label: string }[]
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSort(opt.id)}
                  className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    sortMode === opt.id
                      ? 'bg-[#645f8c] text-white'
                      : 'text-slate-600 dark:text-[#a8a6be] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(searchOpen || filter.searchQuery) && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) => onChangeFilter({ ...filter, searchQuery: e.target.value })}
              placeholder="输入关键词检索标题、正文、复盘或标签（仅本地搜索）"
              className="w-full min-h-[46px] pl-11 pr-11 rounded-2xl bg-white/85 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/10 text-sm text-slate-900 dark:text-[#eceaf6] placeholder:text-slate-400 dark:placeholder:text-[#787694] focus:outline-none focus:ring-2 focus:ring-[#7e77a3]/50"
            />
            {filter.searchQuery && (
              <button
                type="button"
                onClick={() => onChangeFilter({ ...filter, searchQuery: '' })}
                aria-label="清空搜索词"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/60 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/8 text-xs">
            <span className="text-slate-600 dark:text-[#b4b1cc]">
              已启用 {activeFilterCount} 项筛选条件 · 匹配 {filteredDreams.length} 条
            </span>
            <button
              type="button"
              onClick={() =>
                onChangeFilter({
                  ...filter,
                  datePreset: 'all',
                  startDate: '',
                  endDate: '',
                  moods: [],
                  tagIds: [],
                  starOnly: false,
                  secretOnly: false,
                  hasImageOnly: false,
                })
              }
              className="text-[#5d5785] dark:text-[#a8a1d6] font-medium hover:underline whitespace-nowrap"
            >
              清空筛选
            </button>
          </div>
        )}
      </div>

      {/* Drafts Zone (only shown when drafts exist) */}
      {drafts.length > 0 && (
        <section aria-label="未完成草稿">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-medium text-slate-500 dark:text-[#9c9ab8]">
              暂存草稿（{drafts.length}）
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-dashed border-slate-300 dark:border-white/15 px-4 py-3 flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  onClick={() => onEditDream(draft.id)}
                  className="flex-1 text-left min-w-0 py-1"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9c9ab8] font-mono-tabular mb-0.5">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>草稿 · {formatDateLabel(draft.updateTime)}</span>
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-[#e1dff0] truncate">
                    {draft.title.trim() || stripBoldMarkers(draft.content).slice(0, 26) || '未命名草稿'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteDream(draft)}
                  aria-label="删除草稿"
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-[#9e6678] hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Dream Timeline */}
      {filteredDreams.length === 0 ? (
        <div className="rounded-3xl bg-white/65 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/8 p-10 text-center">
          <p className="font-serif-dream text-base text-slate-700 dark:text-[#d1cfe3] mb-2">
            {dreams.filter((d) => !d.isDraft).length === 0
              ? '这里还是一片安静的夜空'
              : '没有找到符合当前条件的梦境记录'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#8f8daa] mb-6">
            所有文字与配图仅保存在本机私有空间
          </p>
          <button
            type="button"
            onClick={onNewDream}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>记下第一个梦</span>
          </button>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 ${
            isCompact ? 'md:grid-cols-2 lg:grid-cols-3 gap-3' : 'md:grid-cols-2 gap-4'
          }`}
        >
          {filteredDreams.map((dream) => {
            const dTags = dreamTagsMap.get(dream.id) || [];
            const title = getDisplayTitle(dream);

            return (
              <article
                key={dream.id}
                onPointerDown={(e) => startLongPress(dream, e)}
                onPointerMove={handlePointerMoveCard}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                className={`group relative rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 transition-colors hover:border-[#7e77a3]/50 dark:hover:border-[#8f88bd]/40 flex flex-col justify-between ${
                  isCompact ? 'p-4' : 'p-5 sm:p-6'
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDream(dream.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenDream(dream.id);
                    }
                  }}
                  className="cursor-pointer text-left focus:outline-none"
                >
                  {/* Unboxed quiet metadata line */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-xs text-slate-500 dark:text-[#9896b3] font-mono-tabular truncate">
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
                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400 dark:text-[#9390b0]">
                      {dream.isStar && (
                        <Star
                          className="w-3.5 h-3.5 fill-[#a38c6d] text-[#a38c6d]"
                          aria-label="已星标"
                        />
                      )}
                      {dream.isSecret && <Lock className="w-3.5 h-3.5" aria-label="私密梦境" />}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif-dream text-base sm:text-lg font-semibold text-slate-900 dark:text-[#efedf9] mb-2 leading-snug">
                    {renderFormattedText(title, filter.searchQuery)}
                  </h3>

                  {/* Content preview (max 2 lines) */}
                  {dream.isSecret ? (
                    <p className="text-xs italic text-slate-500 dark:text-[#8d8ba8] py-1">
                      私密梦境 · 点击进入详情页查看完整内容
                    </p>
                  ) : (
                    <p
                      className={`${fontSizeClass} leading-relaxed text-slate-600 dark:text-[#bab8d0] line-clamp-2`}
                    >
                      {dream.content.trim()
                        ? renderFormattedText(stripBoldMarkers(dream.content), filter.searchQuery)
                        : '（仅记录了感受或配图，点击查看详情）'}
                    </p>
                  )}

                  {/* Image thumbnails */}
                  {!dream.isSecret && dream.imagePathList.length > 0 && !isCompact && (
                    <div className="mt-3 flex items-center gap-2 overflow-hidden">
                      {dream.imagePathList.slice(0, 3).map((src, idx) => (
                        <img
                          key={idx}
                          src={src}
                          alt={`梦境配图 ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover border border-black/5 dark:border-white/10 shrink-0"
                        />
                      ))}
                      {dream.imagePathList.length > 3 && (
                        <span className="text-xs text-slate-500 dark:text-[#9593b2] font-mono-tabular">
                          +{dream.imagePathList.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom metadata: unboxed tag names & quick menu button */}
                <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#9593b2] min-w-0">
                    {dTags.length > 0 ? (
                      dTags.slice(0, 4).map((tag) => (
                        <span key={tag.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: tag.tagColor }}
                          />
                          <span>{renderFormattedText(tag.tagName, filter.searchQuery)}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 dark:text-[#6f6d8a]">未添加标签</span>
                    )}
                    {dream.imagePathList.length > 0 && isCompact && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <ImageIcon className="w-3 h-3" />
                        <span className="font-mono-tabular">{dream.imagePathList.length}</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuDream(dream);
                    }}
                    aria-label="更多操作"
                    className="min-h-[36px] min-w-[36px] -mr-1.5 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Long-press / Card Action Sheet */}
      {menuDream && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setMenuDream(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 p-4 space-y-1.5"
          >
            <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-white/15 rounded-full mx-auto mb-3" />
            <div className="px-3 pb-2 border-b border-slate-200/70 dark:border-white/10">
              <div className="text-xs text-slate-500 dark:text-[#9593b2] font-mono-tabular">
                {formatDateLabel(menuDream.createTime)}
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] truncate">
                {getDisplayTitle(menuDream)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const id = menuDream.id;
                setMenuDream(null);
                onEditDream(id);
              }}
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-sm text-slate-800 dark:text-[#e1dff0] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>编辑梦境</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const text = formatDreamPlainText(
                  menuDream,
                  dreamTagsMap.get(menuDream.id) || []
                );
                setMenuDream(null);
                copyToClipboard(text, onToast);
              }}
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-sm text-slate-800 dark:text-[#e1dff0] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              <span>复制全部文本</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const text = formatDreamPlainText(
                  menuDream,
                  dreamTagsMap.get(menuDream.id) || []
                );
                const title = getDisplayTitle(menuDream);
                setMenuDream(null);
                shareTextNative(title, text, onToast);
              }}
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-sm text-slate-800 dark:text-[#e1dff0] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Share2 className="w-4 h-4 text-slate-500" />
              <span>分享本条文本</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = menuDream;
                setMenuDream(null);
                onOpenPoster(target);
              }}
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-sm text-slate-800 dark:text-[#e1dff0] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ImageIcon className="w-4 h-4 text-slate-500" />
              <span>导出单条海报预览</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const target = menuDream;
                setMenuDream(null);
                onDeleteDream(target);
              }}
              className="w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-sm text-[#9e5d70] hover:bg-[#9e5d70]/10"
            >
              <Trash2 className="w-4 h-4" />
              <span>删除这条梦境</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

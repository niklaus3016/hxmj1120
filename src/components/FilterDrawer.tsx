import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { DREAM_MOODS, DreamFilter, DreamMood, TagRecord } from '../types/dream';

interface FilterDrawerProps {
  open: boolean;
  filter: DreamFilter;
  tags: TagRecord[];
  onChange: (next: DreamFilter) => void;
  onReset: () => void;
  onClose: () => void;
}

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  open,
  filter,
  tags,
  onChange,
  onReset,
  onClose,
}) => {
  if (!open) return null;

  const toggleMood = (m: Exclude<DreamMood, ''>) => {
    const exists = filter.moods.includes(m);
    onChange({
      ...filter,
      moods: exists ? filter.moods.filter((x) => x !== m) : [...filter.moods, m],
    });
  };

  const toggleTag = (id: string) => {
    const exists = filter.tagIds.includes(id);
    onChange({
      ...filter,
      tagIds: exists ? filter.tagIds.filter((x) => x !== id) : [...filter.tagIds, id],
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="筛选梦境"
    >
      <div className="w-full max-w-lg max-h-[88dvh] rounded-t-3xl sm:rounded-3xl bg-[#f5f6fa] dark:bg-[#191a28] border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-white/15 rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10">
          <h3 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6]">
            组合筛选梦境
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onReset}
              className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-[#a8a6be] hover:text-slate-900 dark:hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭筛选"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-500 dark:text-[#a8a6be] hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Date Range */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-[#9c9ab8] mb-2.5">
              时间范围
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'all', label: '全部时间' },
                { id: 'week', label: '本周' },
                { id: 'month', label: '本月' },
                { id: 'custom', label: '自定义' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filter,
                      datePreset: opt.id as DreamFilter['datePreset'],
                    })
                  }
                  className={`min-h-[40px] rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                    filter.datePreset === opt.id
                      ? 'bg-[#645f8c] text-white'
                      : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filter.datePreset === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] text-slate-500 dark:text-[#9593b2]">开始日期</span>
                  <input
                    type="date"
                    value={filter.startDate}
                    onChange={(e) => onChange({ ...filter, startDate: e.target.value })}
                    className="mt-1 w-full min-h-[40px] px-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-[#eceaf6]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-500 dark:text-[#9593b2]">结束日期</span>
                  <input
                    type="date"
                    value={filter.endDate}
                    onChange={(e) => onChange({ ...filter, endDate: e.target.value })}
                    className="mt-1 w-full min-h-[40px] px-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-[#eceaf6]"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Moods */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-[#9c9ab8] mb-2.5">
              情绪类型（可多选）
            </div>
            <div className="flex flex-wrap gap-2">
              {DREAM_MOODS.map((m) => {
                const active = filter.moods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMood(m)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#645f8c] text-white'
                        : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-[#9c9ab8] mb-2.5">
              自定义标签（可多选）
            </div>
            {tags.length === 0 ? (
              <p className="text-xs text-slate-400">暂无标签</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = filter.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTag(t.id)}
                      className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#645f8c] text-white'
                          : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: active ? '#fff' : t.tagColor }}
                      />
                      <span>{t.tagName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Extra Conditions */}
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-[#9c9ab8] mb-2.5">
              附加条件
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { key: 'starOnly', label: '仅看星标梦境' },
                { key: 'secretOnly', label: '仅看私密梦境' },
                { key: 'hasImageOnly', label: '有配图梦境' },
              ].map((cond) => {
                const checked = filter[cond.key as keyof Pick<DreamFilter, 'starOnly' | 'secretOnly' | 'hasImageOnly'>];
                return (
                  <button
                    key={cond.key}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...filter,
                        [cond.key]: !checked,
                      })
                    }
                    className={`min-h-[42px] px-3 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
                      checked
                        ? 'bg-[#645f8c] text-white'
                        : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                    }`}
                  >
                    {cond.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200/70 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium transition-colors"
          >
            应用筛选
          </button>
        </div>
      </div>
    </div>
  );
};

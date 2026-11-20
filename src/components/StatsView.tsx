import React from 'react';
import { Repeat, Tags } from 'lucide-react';
import { AnalyticsBundle, SimilarDreamPair } from '../utils/dreamAnalytics';
import { SELF_REFLECTION_DISCLAIMER } from '../types/dream';
import { formatDateLabel } from '../db/storage';
import { getDisplayTitle } from '../utils/dreamText';

interface StatsViewProps {
  analytics: AnalyticsBundle;
  onManageTags: () => void;
  onCompareSimilar: (pair: SimilarDreamPair) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  analytics,
  onManageTags,
  onCompareSimilar,
}) => {
  const maxTimeCount = Math.max(1, ...analytics.dreamTimeStats.map((d) => d.count));
  const maxTagCount = Math.max(1, ...analytics.tagStats.map((t) => t.count));

  // Build SVG Donut arcs
  const totalMoodCount = analytics.moodStats.reduce((acc, m) => acc + m.count, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Overview Metrics */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: '累计梦境', value: analytics.totalCount, unit: '条' },
          { label: '本月记录', value: analytics.monthCount, unit: '条' },
          { label: '连续打卡', value: analytics.streakDays, unit: '天' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-4 sm:p-5"
          >
            <div className="text-xs text-slate-500 dark:text-[#9896b3] mb-1.5">{kpi.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-[#f0eef9] font-mono-tabular">
                {kpi.value}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#8f8daa]">{kpi.unit}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Mood Distribution Donut */}
        <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] mb-5">
            情绪分布统计
          </h2>
          {analytics.moodStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">暂无已标记情绪的梦境</p>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-36 h-36 shrink-0">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-slate-200/60 dark:text-white/5"
                  />
                  {analytics.moodStats.map((item) => {
                    const segLen = (item.count / totalMoodCount) * circumference;
                    const dashArray = `${segLen} ${circumference - segLen}`;
                    const dashOffset = -accumulatedOffset;
                    accumulatedOffset += segLen;
                    return (
                      <circle
                        key={item.mood}
                        cx="70"
                        cy="70"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="16"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-semibold text-slate-900 dark:text-[#eceaf6] font-mono-tabular">
                    {totalMoodCount}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-[#9896b3]">已标记</span>
                </div>
              </div>

              <div className="flex-1 w-full grid grid-cols-2 gap-x-4 gap-y-2.5">
                {analytics.moodStats.map((item) => (
                  <div key={item.mood} className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-700 dark:text-[#d0cde2]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.mood}</span>
                    </span>
                    <span className="text-slate-500 dark:text-[#9896b3] font-mono-tabular">
                      {item.count} ({item.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Dream Time Bar Chart */}
        <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] mb-5">
            入梦时段分布
          </h2>
          <div className="space-y-4">
            {analytics.dreamTimeStats.map((item) => {
              const widthPct = Math.round((item.count / maxTimeCount) * 100);
              return (
                <div key={item.dreamTime} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-[#d0cde2]">{item.dreamTime}</span>
                    <span className="text-slate-500 dark:text-[#9896b3] font-mono-tabular">
                      {item.count} 条
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#736d9e] transition-all duration-300"
                      style={{ width: `${item.count > 0 ? Math.max(8, widthPct) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Tag Frequency + Word Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tag Ranking */}
        <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
              高频标签排行
            </h2>
            <button
              type="button"
              onClick={onManageTags}
              className="min-h-[36px] px-3 rounded-xl text-xs font-medium text-[#5d5785] dark:text-[#a8a1d6] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center gap-1.5"
            >
              <Tags className="w-3.5 h-3.5" />
              <span>标签管理</span>
            </button>
          </div>
          {analytics.tagStats.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">暂无标签关联数据</p>
          ) : (
            <div className="space-y-3">
              {analytics.tagStats.slice(0, 7).map((item) => (
                <div key={item.tag.id} className="flex items-center gap-3 text-xs">
                  <span className="w-20 truncate text-slate-700 dark:text-[#d0cde2]">
                    {item.tag.tagName}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-slate-200/70 dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(10, Math.round((item.count / maxTagCount) * 100))}%`,
                        backgroundColor: item.tag.tagColor,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right text-slate-500 dark:text-[#9896b3] font-mono-tabular">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Local Word Cloud */}
        <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
              本地意象词云
            </h2>
            <span className="text-[11px] text-slate-400 dark:text-[#7e7c9c]">
              仅本机实时分词
            </span>
          </div>
          {analytics.wordCloud.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">
              记录更多梦境文字后，将在此生成词云
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2.5 py-2">
              {analytics.wordCloud.map((w, idx) => {
                const fontSize = Math.round(12 + w.weight * 14);
                const opacity = 0.55 + w.weight * 0.45;
                return (
                  <span
                    key={`${w.word}-${idx}`}
                    title={`${w.word}（出现 ${w.count} 次）`}
                    style={{ fontSize: `${fontSize}px`, opacity }}
                    className="font-serif-dream text-slate-700 dark:text-[#d5d1ea] leading-none select-none"
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Duplicate / Similar Dreams Detection */}
      <section className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
            重复梦境识别（本地文本比对）
          </h2>
        </div>
        {analytics.similarPairs.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-[#8f8daa] py-4">
            暂未检测到内容高度相似的重复梦境。
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.similarPairs.map((pair) => {
              const pct = Math.min(99, Math.max(15, Math.round(pair.similarity * 220)));
              return (
                <div
                  key={`${pair.dreamA.id}_${pair.dreamB.id}`}
                  className="rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9896b3] font-mono-tabular">
                      <Repeat className="w-3.5 h-3.5 text-[#7e77a3]" />
                      <span>相似度约 {pct}%</span>
                      <span>·</span>
                      <span className="truncate">
                        共同片段：{pair.sharedTokens.slice(0, 3).join('、')}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800 dark:text-[#e1dff0] truncate">
                      「{getDisplayTitle(pair.dreamA)}」与「{getDisplayTitle(pair.dreamB)}」
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-[#7e7c9c] font-mono-tabular">
                      {formatDateLabel(pair.dreamA.createTime)} / {formatDateLabel(pair.dreamB.createTime)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCompareSimilar(pair)}
                    className="min-h-[40px] px-4 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    对比两条梦境
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-center text-xs text-slate-400 dark:text-[#7a7896] pt-2">
        {SELF_REFLECTION_DISCLAIMER}
      </p>
    </div>
  );
};

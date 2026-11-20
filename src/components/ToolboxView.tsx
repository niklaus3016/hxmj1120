import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eraser,
  FileText,
  Palette,
  PenTool,
  Plus,
  RotateCcw,
  Share2,
  Tags,
  Trash2,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import {
  DREAM_TEMPLATES,
  DreamRecord,
  DreamTagRelation,
  SELF_REFLECTION_DISCLAIMER,
  TAG_PALETTE,
  TagRecord,
} from '../types/dream';
import { formatDateLabel, toDateKey } from '../db/storage';
import { getDisplayTitle, stripBoldMarkers } from '../utils/dreamText';
import { ConfirmModal } from './ConfirmModal';

export type ToolboxTab = 'doodle' | 'templates' | 'calendar' | 'roam' | 'tags';

interface ToolboxViewProps {
  initialTab?: ToolboxTab;
  dreams: DreamRecord[];
  tags: TagRecord[];
  relations: DreamTagRelation[];
  onUseTemplate: (content: string) => void;
  onAttachDoodleToDream: (dataUrl: string) => void;
  onOpenDream: (dreamId: string) => void;
  onCreateTag: (tagName: string, tagColor: string) => Promise<TagRecord>;
  onUpdateTag: (tag: TagRecord) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onToast: (msg: string) => void;
}

const DOODLE_COLORS = ['#e6e4ef', '#9a93c7', '#7b96b8', '#8fa98d', '#b5927c', '#a87b8d'];

export const ToolboxView: React.FC<ToolboxViewProps> = ({
  initialTab = 'calendar',
  dreams,
  tags,
  relations,
  onUseTemplate,
  onAttachDoodleToDream,
  onOpenDream,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<ToolboxTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const formalDreams = useMemo(
    () => dreams.filter((d) => !d.isDraft).sort((a, b) => b.createTime - a.createTime),
    [dreams]
  );

  /* -------------------- 1. Doodle Canvas State -------------------- */
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushColor, setBrushColor] = useState(DOODLE_COLORS[0]);
  const [brushWidth, setBrushWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);

  useEffect(() => {
    if (activeTab !== 'doodle') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The canvas element is re-created whenever this tab unmounts, so restore
    // the latest snapshot from the persisted history instead of only painting
    // the background on first mount.
    const latest = historyRef.current[historyRef.current.length - 1];
    if (latest) {
      ctx.putImageData(latest, 0, 0);
      return;
    }
    ctx.fillStyle = '#181926';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }, [activeTab]);

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
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
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

  const handleUndoDoodle = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
  };

  const handleClearDoodle = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#181926';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
  };

  const handleShareDoodle = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
    if (!blob) return;
    const file = new File([blob], `huixu_doodle_${Date.now()}.png`, { type: 'image/png' });
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ title: '思绪涂鸦', files: [file] });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `回序梦境_思绪涂鸦_${Date.now()}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast('已生成涂鸦图片，可通过系统分享留存');
  };

  /* -------------------- 2. Calendar State -------------------- */
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(Date.now()));

  const dreamsByDateKey = useMemo(() => {
    const map = new Map<string, DreamRecord[]>();
    for (const d of formalDreams) {
      const k = toDateKey(d.createTime);
      const arr = map.get(k) || [];
      arr.push(d);
      map.set(k, arr);
    }
    return map;
  }, [formalDreams]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday first
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: { day: number | null; dateKey: string }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateKey: `empty-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      cells.push({ day: d, dateKey: `${calYear}-${mStr}-${dStr}` });
    }
    return cells;
  }, [calYear, calMonth]);

  const selectedDayDreams = dreamsByDateKey.get(selectedDateKey) || [];

  /* -------------------- 3. Time Roam State -------------------- */
  const roamDreams = useMemo(
    () => [...formalDreams].sort((a, b) => a.createTime - b.createTime),
    [formalDreams]
  );
  const [roamIdx, setRoamIdx] = useState(Math.max(0, roamDreams.length - 1));

  useEffect(() => {
    if (roamIdx >= roamDreams.length) {
      setRoamIdx(Math.max(0, roamDreams.length - 1));
    }
  }, [roamDreams.length, roamIdx]);

  /* -------------------- 4. Tag Manager State -------------------- */
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);
  const [editingTag, setEditingTag] = useState<TagRecord | null>(null);
  const [deletingTag, setDeletingTag] = useState<TagRecord | null>(null);

  const tagUsageCounts = useMemo(() => {
    const formalSet = new Set(formalDreams.map((d) => d.id));
    const map = new Map<string, number>();
    relations.forEach((r) => {
      if (formalSet.has(r.dreamId)) {
        map.set(r.tagId, (map.get(r.tagId) || 0) + 1);
      }
    });
    return map;
  }, [formalDreams, relations]);

  const tabs: { id: ToolboxTab; label: string; icon: React.ReactNode }[] = [
    { id: 'calendar', label: '梦境日历', icon: <CalendarIcon className="w-4 h-4" /> },
    { id: 'doodle', label: '涂鸦白板', icon: <Palette className="w-4 h-4" /> },
    { id: 'templates', label: '梦境模板', icon: <FileText className="w-4 h-4" /> },
    { id: 'roam', label: '时间漫游', icon: <Compass className="w-4 h-4" /> },
    { id: 'tags', label: '标签管理', icon: <Tags className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Tool Switcher */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-2.5 rounded-2xl text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#645f8c] text-white'
                  : 'bg-white/75 dark:bg-white/[0.05] text-slate-700 dark:text-[#c7c5da] border border-slate-200/80 dark:border-white/10 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Dream Calendar */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#eceaf6] font-mono-tabular">
                {calYear}年{String(calMonth + 1).padStart(2, '0')}月
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setCalYear(now.getFullYear());
                    setCalMonth(now.getMonth());
                    setSelectedDateKey(toDateKey(now.getTime()));
                  }}
                  className="min-h-[36px] px-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-[#b4b1cc] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  今天
                </button>
                <button
                  type="button"
                  aria-label="上个月"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalYear((y) => y - 1);
                      setCalMonth(11);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-[#b4b1cc]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="下个月"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalYear((y) => y + 1);
                      setCalMonth(0);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-[#b4b1cc]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 dark:text-[#8482a0] mb-2">
              {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                if (!cell.day) return <div key={cell.dateKey} className="h-11" />;
                const dayDreams = dreamsByDateKey.get(cell.dateKey) || [];
                const isSelected = selectedDateKey === cell.dateKey;
                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-mono-tabular transition-colors ${
                      isSelected
                        ? 'bg-[#645f8c] text-white'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-[#d0cde2]'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {dayDreams.length > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-[#8e86c2]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] font-mono-tabular mb-4">
              {selectedDateKey} 的梦境
            </h3>
            {selectedDayDreams.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-[#7e7c9c] py-8 text-center">
                这一天没有记录梦境
              </p>
            ) : (
              <div className="space-y-2.5">
                {selectedDayDreams.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onOpenDream(d.id)}
                    className="w-full text-left rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/60 dark:hover:bg-white/[0.08] p-3.5 transition-colors"
                  >
                    <div className="text-[11px] text-slate-500 dark:text-[#9896b3] mb-1">
                      {d.dreamTime}
                      {d.mood ? ` · ${d.mood}` : ''}
                    </div>
                    <div className="font-serif-dream text-sm font-medium text-slate-900 dark:text-[#efedf9] truncate">
                      {getDisplayTitle(d)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Doodle Board */}
      {activeTab === 'doodle' && (
        <div className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
                思绪涂鸦白板
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9896b3]">
                用简单线条留住说不清形状的梦境画面
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUndoDoodle}
                className="min-h-[40px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs text-slate-700 dark:text-[#d0cde2] inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>撤销</span>
              </button>
              <button
                type="button"
                onClick={handleClearDoodle}
                className="min-h-[40px] px-3 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs text-slate-700 dark:text-[#d0cde2]"
              >
                清空画布
              </button>
            </div>
          </div>

          {/* Tools Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEraser(false)}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
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
                className={`min-h-[38px] px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 ${
                  isEraser
                    ? 'bg-[#645f8c] text-white'
                    : 'bg-slate-200/70 dark:bg-white/5 text-slate-700 dark:text-[#c7c5da]'
                }`}
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>橡皮</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {DOODLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`画笔颜色 ${c}`}
                  onClick={() => {
                    setIsEraser(false);
                    setBrushColor(c);
                  }}
                  className={`w-7 h-7 rounded-full border border-white/20 transition-transform ${
                    !isEraser && brushColor === c ? 'ring-2 ring-[#8e86c2] scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#b4b1cc]">
              <span>粗细</span>
              <input
                type="range"
                min={2}
                max={14}
                value={brushWidth}
                onChange={(e) => setBrushWidth(Number(e.target.value))}
                className="w-24 accent-[#645f8c]"
              />
            </label>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#181926]">
            <canvas
              ref={canvasRef}
              width={720}
              height={460}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full aspect-[720/460] touch-none cursor-crosshair block"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleShareDoodle}
              className="min-h-[44px] px-4 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs font-medium text-slate-800 dark:text-[#e1dff0] inline-flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>分享涂鸦图片</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                onAttachDoodleToDream(canvas.toDataURL('image/png'));
              }}
              className="min-h-[44px] px-5 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>关联到梦境记录</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Dream Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DREAM_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 flex flex-col justify-between gap-4"
              >
                <div>
                  <h3 className="font-serif-dream text-base font-semibold text-slate-900 dark:text-[#efedf9] mb-1">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#9896b3] mb-3">{tpl.subtitle}</p>
                  <pre className="text-xs leading-relaxed text-slate-600 dark:text-[#bab8d0] whitespace-pre-wrap font-sans bg-slate-100/70 dark:bg-white/[0.03] rounded-2xl p-3.5">
                    {tpl.content}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={() => onUseTemplate(tpl.content)}
                  className="min-h-[44px] px-4 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium self-start"
                >
                  一键填入新建梦境
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400 dark:text-[#7a7896]">
            {SELF_REFLECTION_DISCLAIMER}
          </p>
        </div>
      )}

      {/* Tab 4: Dream Time Roam */}
      {activeTab === 'roam' && (
        <div className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6]">
                梦境时间漫游
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9896b3]">
                按时间顺序安静翻阅过往记忆
              </p>
            </div>
            {roamDreams.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-[#9896b3] font-mono-tabular">
                {roamIdx + 1} / {roamDreams.length}
              </span>
            )}
          </div>

          {roamDreams.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">暂无梦境记录可漫游</p>
          ) : (
            (() => {
              const current = roamDreams[roamIdx];
              return (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-slate-100/75 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/8 p-6 sm:p-8 min-h-[240px] flex flex-col justify-between">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-[#9896b3] font-mono-tabular mb-2">
                        {formatDateLabel(current.createTime)} · {current.dreamTime}
                        {current.mood ? ` · ${current.mood}` : ''}
                      </div>
                      <h3 className="font-serif-dream text-xl font-semibold text-slate-900 dark:text-[#f2f0fa] mb-4">
                        {getDisplayTitle(current)}
                      </h3>
                      <p className="text-sm leading-loose text-slate-700 dark:text-[#d0cde2] line-clamp-5 whitespace-pre-wrap">
                        {current.isSecret
                          ? '私密梦境内容已隐藏保护，请点击进入详情查看。'
                          : stripBoldMarkers(current.content) || '（无正文）'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenDream(current.id)}
                      className="mt-6 text-xs font-medium text-[#5d5785] dark:text-[#a8a1d6] hover:underline self-start"
                    >
                      进入完整详情 →
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={roamIdx <= 0}
                      onClick={() => setRoamIdx((i) => Math.max(0, i - 1))}
                      className="min-h-[44px] px-5 rounded-xl bg-slate-200/70 dark:bg-white/5 text-xs font-medium text-slate-700 dark:text-[#d0cde2] disabled:opacity-35 inline-flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>更早一条</span>
                    </button>

                    <button
                      type="button"
                      disabled={roamIdx >= roamDreams.length - 1}
                      onClick={() => setRoamIdx((i) => Math.min(roamDreams.length - 1, i + 1))}
                      className="min-h-[44px] px-5 rounded-xl bg-[#645f8c] text-white text-xs font-medium disabled:opacity-35 inline-flex items-center gap-1.5"
                    >
                      <span>更近一条</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Tab 5: Tag Management */}
      {activeTab === 'tags' && (
        <div className="rounded-3xl bg-white/80 dark:bg-[#191a28]/85 backdrop-blur-md border border-slate-200/80 dark:border-white/8 p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#eceaf6] mb-3">
              新增标签
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="输入标签名称……"
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/10 text-sm text-slate-900 dark:text-[#eceaf6]"
              />
              <div className="flex items-center gap-1.5">
                {TAG_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`选择标签色 ${c}`}
                    onClick={() => setNewTagColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      newTagColor === c ? 'ring-2 ring-offset-2 ring-[#645f8c] scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newTagName.trim();
                  if (!trimmed) return;
                  if (tags.some((t) => t.tagName === trimmed)) {
                    onToast('已存在同名标签');
                    return;
                  }
                  await onCreateTag(trimmed, newTagColor);
                  setNewTagName('');
                  onToast(`已新增标签「${trimmed}」`);
                }}
                className="min-h-[44px] px-5 rounded-xl bg-[#645f8c] hover:bg-[#57527c] text-white text-xs font-medium whitespace-nowrap"
              >
                添加标签
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/70 dark:border-white/8 pt-5">
            <h3 className="text-xs font-medium text-slate-500 dark:text-[#9896b3] mb-3">
              全部标签（{tags.length}）
            </h3>
            <div className="divide-y divide-slate-200/60 dark:divide-white/[0.06]">
              {tags.map((tag) => {
                const count = tagUsageCounts.get(tag.id) || 0;
                const isEditing = editingTag?.id === tag.id;
                return (
                  <div
                    key={tag.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex flex-wrap items-center gap-2.5">
                        <input
                          type="text"
                          value={editingTag.tagName}
                          onChange={(e) =>
                            setEditingTag({ ...editingTag, tagName: e.target.value })
                          }
                          className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-[#eceaf6]"
                        />
                        <div className="flex items-center gap-1">
                          {TAG_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditingTag({ ...editingTag, tagColor: c })}
                              className={`w-5 h-5 rounded-full ${
                                editingTag.tagColor === c ? 'ring-2 ring-[#645f8c]' : ''
                              }`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingTag.tagName.trim()) return;
                            await onUpdateTag({
                              ...editingTag,
                              tagName: editingTag.tagName.trim(),
                            });
                            setEditingTag(null);
                            onToast('标签已更新');
                          }}
                          aria-label="保存标签修改"
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-[#645f8c] text-white flex items-center justify-center"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTag(null)}
                          aria-label="取消修改"
                          className="min-h-[36px] min-w-[36px] rounded-lg bg-slate-200/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: tag.tagColor }}
                          />
                          <span className="text-sm font-medium text-slate-800 dark:text-[#e1dff0]">
                            {tag.tagName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-[#8482a0] font-mono-tabular">
                            {count} 条梦境
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTag(tag)}
                            aria-label={`编辑 ${tag.tagName}`}
                            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTag(tag)}
                            aria-label={`删除 ${tag.tagName}`}
                            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-[#9e5d70] hover:bg-[#9e5d70]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deletingTag)}
        title={`删除标签「${deletingTag?.tagName || ''}」`}
        description="删除后将自动从已关联的梦境中移除该标签，但不会删除任何梦境记录本身。"
        confirmLabel="确认删除"
        destructive
        onCancel={() => setDeletingTag(null)}
        onConfirm={async () => {
          if (!deletingTag) return;
          const target = deletingTag;
          setDeletingTag(null);
          await onDeleteTag(target.id);
          onToast(`已删除标签「${target.tagName}」`);
        }}
      />
    </div>
  );
};

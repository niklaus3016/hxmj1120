import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  BookOpen,
  Compass,
  Plus,
  Settings,
} from 'lucide-react';
import {
  APP_VERSION,
  AppConfig,
  DreamFilter,
  DreamRecord,
  DreamTagRelation,
  SortMode,
  TagRecord,
} from './types/dream';
import {
  clearAllDreamsAndRelations,
  DEFAULT_CONFIG,
  deleteDreamById,
  deleteTagById,
  generateId,
  loadAllLocalData,
  restoreFullSnapshot,
  saveAppConfig,
  saveDreamWithTags,
  saveTagRecord,
  LocalSnapshot,
} from './db/storage';
import { computeDreamAnalytics, SimilarDreamPair } from './utils/dreamAnalytics';
import { TimelineView } from './components/TimelineView';
import { DreamEditorView } from './components/DreamEditorView';
import { DreamDetailView } from './components/DreamDetailView';
import { StatsView } from './components/StatsView';
import { ToolboxTab, ToolboxView } from './components/ToolboxView';
import { SettingsView } from './components/SettingsView';
import { FilterDrawer } from './components/FilterDrawer';
import { PosterModal } from './components/PosterModal';
import { CompareDreamsModal } from './components/CompareDreamsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ConsentGate } from './components/ConsentGate';

type MainTab = 'timeline' | 'stats' | 'toolbox' | 'settings';
type SubView =
  | { type: 'tab' }
  | { type: 'detail'; dreamId: string }
  | { type: 'editor'; dreamId?: string; prefillContent?: string; prefillImage?: string | null };

const EMPTY_FILTER: DreamFilter = {
  searchQuery: '',
  datePreset: 'all',
  startDate: '',
  endDate: '',
  moods: [],
  tagIds: [],
  starOnly: false,
  secretOnly: false,
  hasImageOnly: false,
};

const CONSENT_STORAGE_KEY = 'hxmj_consent_version';

export default function App() {
  const [consentGiven, setConsentGiven] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(CONSENT_STORAGE_KEY) === APP_VERSION;
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<DreamRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [relations, setRelations] = useState<DreamTagRelation[]>([]);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const [activeTab, setActiveTab] = useState<MainTab>('timeline');
  const [toolboxTab, setToolboxTab] = useState<ToolboxTab>('calendar');
  const [subView, setSubView] = useState<SubView>({ type: 'tab' });

  const [filter, setFilter] = useState<DreamFilter>(EMPTY_FILTER);
  const [sortMode, setSortMode] = useState<SortMode>('desc');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const [posterDream, setPosterDream] = useState<DreamRecord | null>(null);
  const [comparePair, setComparePair] = useState<SimilarDreamPair | null>(null);
  const [pendingDeleteDream, setPendingDeleteDream] = useState<DreamRecord | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark =
    config.theme === 'dark' || (config.theme === 'system' && systemPrefersDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    if (!consentGiven) return;
    loadAllLocalData()
      .then((snap) => {
        setDreams(snap.dreams);
        setTags(snap.tags);
        setRelations(snap.relations);
        setConfig(snap.config);
      })
      .catch(() => {
        showToast('本机梦境空间读取失败，请刷新页面重试');
      })
      .finally(() => setLoading(false));
  }, [consentGiven, showToast]);

  const handleAgreeConsent = useCallback(() => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, APP_VERSION);
    } catch {
      // Ignore storage failures: consent still applies to this session.
    }
    setConsentGiven(true);
  }, []);

  const analytics = useMemo(
    () => computeDreamAnalytics(dreams, tags, relations),
    [dreams, tags, relations]
  );

  const fontSizeClass = 'text-[14.5px]';

  const getTagsForDream = useCallback(
    (dreamId: string) => {
      const ids = new Set(
        relations.filter((r) => r.dreamId === dreamId).map((r) => r.tagId)
      );
      return tags.filter((t) => ids.has(t.id));
    },
    [relations, tags]
  );

  const handleSaveDream = async (dream: DreamRecord, tagIds: string[]) => {
    const nextRelations = await saveDreamWithTags(dream, tagIds);
    setDreams((prev) => {
      const exists = prev.some((d) => d.id === dream.id);
      return exists ? prev.map((d) => (d.id === dream.id ? dream : d)) : [dream, ...prev];
    });
    setRelations(nextRelations);
    setSubView({ type: 'tab' });
    setActiveTab('timeline');
  };

  const handleDeleteDreamConfirmed = async (dream: DreamRecord) => {
    const nextRelations = await deleteDreamById(dream.id);
    setDreams((prev) => prev.filter((d) => d.id !== dream.id));
    setRelations(nextRelations);
    setPendingDeleteDream(null);
    if (subView.type !== 'tab') {
      setSubView({ type: 'tab' });
    }
    showToast(dream.isDraft ? '草稿已删除' : '梦境记录已删除');
  };

  const handleCreateTag = async (tagName: string, tagColor: string): Promise<TagRecord> => {
    const tag: TagRecord = {
      id: generateId('tag'),
      tagName,
      tagColor,
    };
    await saveTagRecord(tag);
    setTags((prev) => [...prev, tag]);
    return tag;
  };

  const handleUpdateTag = async (tag: TagRecord) => {
    await saveTagRecord(tag);
    setTags((prev) => prev.map((t) => (t.id === tag.id ? tag : t)));
  };

  const handleDeleteTag = async (tagId: string) => {
    const nextRelations = await deleteTagById(tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setRelations(nextRelations);
  };

  const handleUpdateConfig = async (next: AppConfig) => {
    setConfig(next);
    await saveAppConfig(next);
  };

  const handleRestoreSnapshot = async (snap: LocalSnapshot) => {
    await restoreFullSnapshot(snap);
    setDreams(snap.dreams || []);
    setTags(snap.tags || []);
    setRelations(snap.relations || []);
    if (snap.config) {
      setConfig({ ...DEFAULT_CONFIG, ...snap.config });
    }
    setSubView({ type: 'tab' });
    setActiveTab('timeline');
  };

  const handleWipeAllDreams = async () => {
    await clearAllDreamsAndRelations();
    setDreams([]);
    setRelations([]);
    setSubView({ type: 'tab' });
    setActiveTab('timeline');
  };

  const navItems: { id: MainTab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    {
      id: 'timeline',
      label: '梦境时间线',
      shortLabel: '时间线',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      id: 'stats',
      label: '统计与图谱',
      shortLabel: '统计',
      icon: <BarChart2 className="w-5 h-5" />,
    },
    {
      id: 'toolbox',
      label: '梦境工具箱',
      shortLabel: '工具箱',
      icon: <Compass className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: '隐私与设置',
      shortLabel: '设置',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const editingDream =
    subView.type === 'editor' && subView.dreamId
      ? dreams.find((d) => d.id === subView.dreamId) || null
      : null;

  const detailDream =
    subView.type === 'detail'
      ? dreams.find((d) => d.id === subView.dreamId) || null
      : null;

  if (!consentGiven) {
    return <ConsentGate onAgree={handleAgreeConsent} />;
  }

  return (
    <div className="min-h-dvh relative text-slate-900 dark:text-[#e6e4ef]">
      {/* Atmospheric Mist Gradient Layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_rgba(126,119,163,0.14),_transparent_58%),radial-gradient(ellipse_at_bottom_right,_rgba(108,136,166,0.12),_transparent_55%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(98,89,145,0.22),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(74,97,133,0.18),_transparent_55%)]"
      />

      {/* Responsive Desktop + Mobile Frame */}
      <div className="relative z-10 max-w-6xl mx-auto flex min-h-dvh">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col justify-between py-7 px-5 border-r border-slate-200/70 dark:border-white/[0.06] sticky top-0 h-dvh">
          <div className="space-y-8">
            {/* Brand Wordmark */}
            <button
              type="button"
              onClick={() => {
                setSubView({ type: 'tab' });
                setActiveTab('timeline');
              }}
              className="flex items-center gap-3 text-left px-2"
            >
              <img
                src="/hxmj512.png"
                alt=""
                aria-hidden="true"
                className="w-8 h-8 shrink-0 rounded-full object-cover"
              />
              <span className="font-serif-dream text-lg font-semibold tracking-wide text-slate-900 dark:text-[#f2f0fa] whitespace-nowrap">
                回序梦境
              </span>
            </button>

            <nav className="space-y-1.5" aria-label="主导航">
              {navItems.map((item) => {
                const isActive = subView.type === 'tab' && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSubView({ type: 'tab' });
                      setActiveTab(item.id);
                    }}
                    className={`w-full min-h-[46px] px-3.5 rounded-2xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-[#645f8c] text-white'
                        : 'text-slate-600 dark:text-[#a8a6be] hover:bg-black/5 dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={() => setSubView({ type: 'editor' })}
            className="w-full min-h-[48px] px-4 rounded-2xl bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium inline-flex items-center justify-center gap-2 shadow-lg shadow-[#645f8c]/20 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>新建梦境</span>
          </button>
        </aside>

        {/* Main Scrollable Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Compact Mobile Header (hidden on lg desktop where sidebar holds brand) */}
          <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between bg-[#eef1f5]/85 dark:bg-[#11121b]/85 backdrop-blur-md border-b border-slate-200/70 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setSubView({ type: 'tab' });
                setActiveTab('timeline');
              }}
              className="flex items-center gap-2.5"
            >
              <img
                src="/hxmj512.png"
                alt=""
                aria-hidden="true"
                className="w-6 h-6 shrink-0 rounded-full object-cover"
              />
              <span className="font-serif-dream text-base font-semibold text-slate-900 dark:text-[#f2f0fa] whitespace-nowrap">
                回序梦境
              </span>
            </button>
          </header>

          <main className="flex-1 px-4 sm:px-7 py-5 sm:py-7 pb-24 lg:pb-8">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400 dark:text-[#8482a0]">
                正在读取本机梦境空间……
              </div>
            ) : subView.type === 'editor' ? (
              <DreamEditorView
                initialDream={editingDream}
                initialTagIds={
                  editingDream
                    ? getTagsForDream(editingDream.id).map((t) => t.id)
                    : []
                }
                prefillContent={subView.prefillContent}
                prefillImage={subView.prefillImage}
                tags={tags}
                onCreateTag={handleCreateTag}
                onSaveDream={handleSaveDream}
                onDeleteDream={
                  editingDream ? handleDeleteDreamConfirmed : undefined
                }
                onCancel={() => setSubView({ type: 'tab' })}
                onToast={showToast}
              />
            ) : subView.type === 'detail' && detailDream ? (
              <DreamDetailView
                dream={detailDream}
                allDreams={dreams}
                tags={getTagsForDream(detailDream.id)}
                fontSizeClass={fontSizeClass}
                onBack={() => setSubView({ type: 'tab' })}
                onEdit={() =>
                  setSubView({ type: 'editor', dreamId: detailDream.id })
                }
                onDelete={() => setPendingDeleteDream(detailDream)}
                onOpenPoster={() => setPosterDream(detailDream)}
                onCompareSimilar={(pair) => setComparePair(pair)}
                onToast={showToast}
              />
            ) : activeTab === 'timeline' ? (
              <TimelineView
                dreams={dreams}
                tags={tags}
                relations={relations}
                filter={filter}
                sortMode={sortMode}
                cardLayout="airy"
                fontSizeClass={fontSizeClass}
                onChangeFilter={setFilter}
                onChangeSort={setSortMode}
                onOpenFilterDrawer={() => setFilterDrawerOpen(true)}
                onOpenDream={(dreamId) => setSubView({ type: 'detail', dreamId })}
                onEditDream={(dreamId) => setSubView({ type: 'editor', dreamId })}
                onNewDream={() => setSubView({ type: 'editor' })}
                onDeleteDream={(dream) => setPendingDeleteDream(dream)}
                onOpenPoster={(dream) => setPosterDream(dream)}
                onToast={showToast}
              />
            ) : activeTab === 'stats' ? (
              <StatsView
                analytics={analytics}
                onManageTags={() => {
                  setActiveTab('toolbox');
                  setToolboxTab('tags');
                }}
                onCompareSimilar={(pair) => setComparePair(pair)}
              />
            ) : activeTab === 'toolbox' ? (
              <ToolboxView
                initialTab={toolboxTab}
                dreams={dreams}
                tags={tags}
                relations={relations}
                onUseTemplate={(tplContent) =>
                  setSubView({ type: 'editor', prefillContent: tplContent })
                }
                onAttachDoodleToDream={(dataUrl) => {
                  setSubView({ type: 'editor', prefillImage: dataUrl });
                  showToast('涂鸦已添加到梦境配图');
                }}
                onOpenDream={(dreamId) => setSubView({ type: 'detail', dreamId })}
                onCreateTag={handleCreateTag}
                onUpdateTag={handleUpdateTag}
                onDeleteTag={handleDeleteTag}
                onToast={showToast}
              />
            ) : (
              <SettingsView
                config={config}
                snapshot={{ dreams, tags, relations, config }}
                onUpdateConfig={handleUpdateConfig}
                onRestoreSnapshot={handleRestoreSnapshot}
                onWipeAllDreams={handleWipeAllDreams}
                onToast={showToast}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Floating Action Button (Only on main timeline tab) */}
      {subView.type === 'tab' && activeTab === 'timeline' && (
        <button
          type="button"
          onClick={() => setSubView({ type: 'editor' })}
          aria-label="新建梦境"
          className="lg:hidden fixed right-5 bottom-20 z-30 h-12 px-5 rounded-full bg-[#645f8c] hover:bg-[#57527c] text-white text-sm font-medium inline-flex items-center gap-2 shadow-xl shadow-[#645f8c]/30 transition-transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>新建梦境</span>
        </button>
      )}

      {/* Mobile Bottom Tab Bar */}
      {subView.type === 'tab' && (
        <nav
          aria-label="底部导航"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#eef1f5]/90 dark:bg-[#11121b]/90 backdrop-blur-md border-t border-slate-200/70 dark:border-white/[0.06] pb-safe"
        >
          <div className="grid grid-cols-4 h-16 items-center">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors ${
                    isActive
                      ? 'text-[#645f8c] dark:text-[#b7b0e0]'
                      : 'text-slate-500 dark:text-[#8482a0]'
                  }`}
                >
                  {item.icon}
                  <span className="text-[11px] font-medium whitespace-nowrap">
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* Modals & Drawers */}
      <FilterDrawer
        open={filterDrawerOpen}
        filter={filter}
        tags={tags}
        onChange={setFilter}
        onReset={() => setFilter(EMPTY_FILTER)}
        onClose={() => setFilterDrawerOpen(false)}
      />

      <PosterModal
        dream={posterDream}
        tags={posterDream ? getTagsForDream(posterDream.id) : []}
        onClose={() => setPosterDream(null)}
        onToast={showToast}
      />

      <CompareDreamsModal
        pair={comparePair}
        onClose={() => setComparePair(null)}
        onOpenDream={(dreamId) => setSubView({ type: 'detail', dreamId })}
      />

      <ConfirmModal
        open={Boolean(pendingDeleteDream)}
        title={pendingDeleteDream?.isDraft ? '删除这条草稿' : '确认删除梦境'}
        description="删除后无法恢复，将同时清理关联图片与标签关系。"
        confirmLabel="确认删除"
        destructive
        onCancel={() => setPendingDeleteDream(null)}
        onConfirm={() => {
          if (pendingDeleteDream) {
            handleDeleteDreamConfirmed(pendingDeleteDream);
          }
        }}
      />

      {/* Quiet Toast Feedback */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-[#27283b]/95 text-white text-xs font-medium shadow-xl backdrop-blur-md whitespace-nowrap"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

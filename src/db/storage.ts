import {
  AppConfig,
  DREAM_MOODS,
  DREAM_TIMES,
  DreamMood,
  DreamRecord,
  DreamTagRelation,
  DreamTime,
  GuideAnswers,
  TAG_PALETTE,
  TagRecord,
} from '../types/dream';

const DB_NAME = 'huixu_dream_db';
const DB_VERSION = 1;

const STORE_DREAMS = 'dream_table';
const STORE_TAGS = 'tag_table';
const STORE_RELATIONS = 'dream_tag_relation';
const STORE_CONFIG = 'config_table';

export const DEFAULT_CONFIG: AppConfig = {
  id: 'app_config',
  theme: 'dark',
  fontSize: 'md',
  cardLayout: 'airy',
  enableAnimation: true,
  enableStarBg: true,
  backupPassword: '',
  initialized: true,
};

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDefaultDreamTitle(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日·无名梦境`;
}

export function formatDateLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

export function formatDateTimeLabel(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

export function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DREAM_TIME_SET = new Set<string>(DREAM_TIMES);
const MOOD_SET = new Set<string>(['', ...DREAM_MOODS]);

function normalizeDream(raw?: Partial<DreamRecord> | null): DreamRecord {
  const now = Date.now();
  const createTime = typeof raw?.createTime === 'number' ? raw.createTime : now;
  const guide = (raw?.guideAnswers || {}) as Partial<GuideAnswers>;
  const dreamTime = raw?.dreamTime ?? '';
  const mood = raw?.mood ?? '';
  return {
    id: raw?.id || generateId('dream'),
    title: typeof raw?.title === 'string' ? raw.title : '',
    content: typeof raw?.content === 'string' ? raw.content : '',
    review: typeof raw?.review === 'string' ? raw.review : '',
    guideAnswers: {
      env: typeof guide.env === 'string' ? guide.env : '',
      people: typeof guide.people === 'string' ? guide.people : '',
      thought: typeof guide.thought === 'string' ? guide.thought : '',
      feeling: typeof guide.feeling === 'string' ? guide.feeling : '',
    },
    createTime,
    updateTime: typeof raw?.updateTime === 'number' ? raw.updateTime : createTime,
    dreamTime: DREAM_TIME_SET.has(dreamTime) ? (dreamTime as DreamTime) : '深夜睡眠',
    mood: MOOD_SET.has(mood) ? (mood as DreamMood) : '',
    isStar: Boolean(raw?.isStar),
    isSecret: Boolean(raw?.isSecret),
    imagePathList: Array.isArray(raw?.imagePathList)
      ? raw.imagePathList.filter((src): src is string => typeof src === 'string')
      : [],
    isDraft: Boolean(raw?.isDraft),
  };
}

function normalizeTag(raw?: Partial<TagRecord> | null): TagRecord | null {
  if (!raw || !raw.id || typeof raw.tagName !== 'string') return null;
  return {
    id: raw.id,
    tagName: raw.tagName,
    tagColor: typeof raw.tagColor === 'string' ? raw.tagColor : TAG_PALETTE[0],
  };
}

function normalizeRelation(
  raw?: Partial<DreamTagRelation> | null
): DreamTagRelation | null {
  if (!raw || !raw.id || !raw.dreamId || !raw.tagId) return null;
  return { id: raw.id, dreamId: raw.dreamId, tagId: raw.tagId };
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DREAMS)) {
        db.createObjectStore(STORE_DREAMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_TAGS)) {
        db.createObjectStore(STORE_TAGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_RELATIONS)) {
        db.createObjectStore(STORE_RELATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function putInStore<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function replaceStoreContents<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface LocalSnapshot {
  dreams: DreamRecord[];
  tags: TagRecord[];
  relations: DreamTagRelation[];
  config: AppConfig;
}

export async function loadAllLocalData(): Promise<LocalSnapshot> {
  const [configs, tags, dreams, relations] = await Promise.all([
    getAllFromStore<AppConfig>(STORE_CONFIG),
    getAllFromStore<TagRecord>(STORE_TAGS),
    getAllFromStore<DreamRecord>(STORE_DREAMS),
    getAllFromStore<DreamTagRelation>(STORE_RELATIONS),
  ]);

  const legacyDreamIds = dreams
    .filter((d) => d.id.startsWith('dream_seed_'))
    .map((d) => d.id);
  const legacyTagIds = tags
    .filter((t) => t.id.startsWith('tag_preset_'))
    .map((t) => t.id);

  let remainingDreams = dreams;
  let remainingTags = tags;
  let remainingRelations = relations;

  if (legacyDreamIds.length > 0 || legacyTagIds.length > 0) {
    await Promise.all([
      ...legacyDreamIds.map((id) => deleteFromStore(STORE_DREAMS, id)),
      ...legacyTagIds.map((id) => deleteFromStore(STORE_TAGS, id)),
    ]);
    remainingDreams = dreams.filter((d) => !legacyDreamIds.includes(d.id));
    remainingTags = tags.filter((t) => !legacyTagIds.includes(t.id));
    remainingRelations = relations.filter(
      (r) => !legacyDreamIds.includes(r.dreamId) && !legacyTagIds.includes(r.tagId)
    );
    await replaceStoreContents(STORE_RELATIONS, remainingRelations);
  }

  const existingConfig = configs.find((c) => c.id === 'app_config');
  if (!existingConfig) {
    const config = { ...DEFAULT_CONFIG };
    await putInStore(STORE_CONFIG, config);
    return { dreams: [], tags: [], relations: [], config };
  }

  return {
    dreams: remainingDreams.map((d) => normalizeDream(d)),
    tags: remainingTags
      .map((t) => normalizeTag(t))
      .filter((t): t is TagRecord => t !== null),
    relations: remainingRelations
      .map((r) => normalizeRelation(r))
      .filter((r): r is DreamTagRelation => r !== null),
    // Backup password is never persisted in plain text.
    config: { ...DEFAULT_CONFIG, ...existingConfig, backupPassword: '' },
  };
}

export async function saveDreamWithTags(
  dream: DreamRecord,
  tagIds: string[]
): Promise<DreamTagRelation[]> {
  await putInStore(STORE_DREAMS, dream);
  const allRelations = await getAllFromStore<DreamTagRelation>(STORE_RELATIONS);
  const kept = allRelations.filter((r) => r.dreamId !== dream.id);
  const added: DreamTagRelation[] = tagIds.map((tagId) => ({
    id: generateId('rel'),
    dreamId: dream.id,
    tagId,
  }));
  const next = [...kept, ...added];
  await replaceStoreContents(STORE_RELATIONS, next);
  return next;
}

export async function deleteDreamById(dreamId: string): Promise<DreamTagRelation[]> {
  await deleteFromStore(STORE_DREAMS, dreamId);
  const allRelations = await getAllFromStore<DreamTagRelation>(STORE_RELATIONS);
  const next = allRelations.filter((r) => r.dreamId !== dreamId);
  await replaceStoreContents(STORE_RELATIONS, next);
  return next;
}

export async function saveTagRecord(tag: TagRecord): Promise<void> {
  await putInStore(STORE_TAGS, tag);
}

export async function deleteTagById(tagId: string): Promise<DreamTagRelation[]> {
  await deleteFromStore(STORE_TAGS, tagId);
  const allRelations = await getAllFromStore<DreamTagRelation>(STORE_RELATIONS);
  const next = allRelations.filter((r) => r.tagId !== tagId);
  await replaceStoreContents(STORE_RELATIONS, next);
  return next;
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  await putInStore(STORE_CONFIG, config);
}

export async function restoreFullSnapshot(snapshot: LocalSnapshot): Promise<void> {
  const safeConfig: AppConfig = {
    ...DEFAULT_CONFIG,
    ...snapshot.config,
    id: 'app_config',
    initialized: true,
    backupPassword: '',
  };
  const safeDreams = (snapshot.dreams || []).map((d) => normalizeDream(d));
  const safeTags = (snapshot.tags || [])
    .map((t) => normalizeTag(t))
    .filter((t): t is TagRecord => t !== null);
  const safeRelations = (snapshot.relations || [])
    .map((r) => normalizeRelation(r))
    .filter((r): r is DreamTagRelation => r !== null);
  await Promise.all([
    replaceStoreContents(STORE_DREAMS, safeDreams),
    replaceStoreContents(STORE_TAGS, safeTags),
    replaceStoreContents(STORE_RELATIONS, safeRelations),
    putInStore(STORE_CONFIG, safeConfig),
  ]);
}

export async function clearAllDreamsAndRelations(): Promise<void> {
  await Promise.all([
    replaceStoreContents(STORE_DREAMS, []),
    replaceStoreContents(STORE_RELATIONS, []),
  ]);
}

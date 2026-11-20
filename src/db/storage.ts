import {
  AppConfig,
  DREAM_MOODS,
  DREAM_TIMES,
  DreamMood,
  DreamRecord,
  DreamTagRelation,
  DreamTime,
  GuideAnswers,
  PRESET_TAGS,
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

function buildInitialSeedData(): LocalSnapshot {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const tags: TagRecord[] = PRESET_TAGS.map((t, idx) => ({
    id: `tag_preset_${idx + 1}`,
    tagName: t.tagName,
    tagColor: t.tagColor,
  }));

  const findTagId = (name: string) => tags.find((t) => t.tagName === name)?.id;

  const dreams: DreamRecord[] = [
    {
      id: 'dream_seed_1',
      title: '潮汐漫过旧教学楼',
      content:
        '傍晚的天色呈淡青灰，我和几个**早年同学**站在旧教学楼三层的走廊上。走廊尽头的窗户没有玻璃，**海水沿着楼梯一层层安静地漫上来**，却没有发出一点声响。水面清澈得能看到台阶上的青苔，我握着一本湿了边角的笔记本，突然意识到自己好像能轻轻浮在水面上往前滑行。',
      review: '最近工作节奏有点紧，梦里那种“水漫上来却不慌张”的平静感，反而像给自己腾出了一小块喘息的地方。',
      guideAnswers: {
        env: '黄昏微暗的旧教学楼走廊，空气有些潮湿但很安静',
        people: '几位很久没联系的中学同学，面孔有些模糊',
        thought: '不想弄湿手里的笔记本，同时好奇水会涨到多高',
        feeling: '醒来时窗外天刚微亮，心里出奇地安稳',
      },
      createTime: now - dayMs * 1 + 1000 * 60 * 40,
      updateTime: now - dayMs * 1 + 1000 * 60 * 40,
      dreamTime: '清晨醒前',
      mood: '平静',
      isStar: true,
      isSecret: false,
      imagePathList: [],
      isDraft: false,
    },
    {
      id: 'dream_seed_2',
      title: '无尽盘旋的夜班地铁',
      content:
        '坐上一趟没有报站名的地铁，车厢里只有橘黄色的老式顶灯在轻微闪烁。透过黑漆漆的车窗，能看见隧道壁上偶尔闪过蓝色的指示牌。我在一个陌生的换乘站下车，扶梯一直向下延伸，仿佛通往城市地底深处。走着走着又回到了同一条昏暗站台。',
      review: '这周一直在赶一个跨部门的方案，也许心里隐约觉得流程像在原地绕圈。',
      guideAnswers: {
        env: '空旷的地下换乘站，微弱暖灯和冷色调瓷砖',
        people: '车厢角落里有一位低头看报纸的陌生人',
        thought: '想找到标注着出口方向的白色路牌',
        feeling: '略微有些疲惫，喝了口温水后慢慢散去',
      },
      createTime: now - dayMs * 3,
      updateTime: now - dayMs * 3,
      dreamTime: '深夜睡眠',
      mood: '迷茫',
      isStar: false,
      isSecret: false,
      imagePathList: [],
      isDraft: false,
    },
    {
      id: 'dream_seed_3',
      title: '又见涨潮的白色楼梯',
      content:
        '再次回到那座靠近海岸的旧建筑里，**海水沿着白色楼梯一层层安静地漫上来**。这次走廊更长，风从没有玻璃的窗洞吹进来，带着很淡的盐味。我和熟人沿楼梯向上走，每上一层，外面的天色就亮一点，直到推开天台门看到一整片雾蓝色的海。',
      review: '第二次出现相似的“走廊与涨潮楼梯”画面，但这次是主动往高处走，最后见到了开阔的海面。',
      guideAnswers: {
        env: '白色阶梯与靠海走廊，光影随楼层升高而变亮',
        people: '一位熟悉的友人走在前面',
        thought: '去天台看看风是从哪里吹过来的',
        feeling: '醒来后对这个画面印象很深，有种释然的感觉',
      },
      createTime: now - dayMs * 6,
      updateTime: now - dayMs * 6,
      dreamTime: '清晨醒前',
      mood: '喜悦',
      isStar: true,
      isSecret: false,
      imagePathList: [],
      isDraft: false,
    },
  ];

  const relations: DreamTagRelation[] = [];
  const link = (dreamId: string, tagName: string) => {
    const tagId = findTagId(tagName);
    if (tagId) {
      relations.push({
        id: `rel_seed_${dreamId}_${tagId}`,
        dreamId,
        tagId,
      });
    }
  };

  link('dream_seed_1', '水');
  link('dream_seed_1', '熟人');
  link('dream_seed_1', '飞翔');
  link('dream_seed_2', '陌生人');
  link('dream_seed_2', '被追赶');
  link('dream_seed_3', '水');
  link('dream_seed_3', '重复梦境');
  link('dream_seed_3', '熟人');

  return {
    dreams,
    tags,
    relations,
    config: { ...DEFAULT_CONFIG },
  };
}

export async function loadAllLocalData(): Promise<LocalSnapshot> {
  const [configs, tags, dreams, relations] = await Promise.all([
    getAllFromStore<AppConfig>(STORE_CONFIG),
    getAllFromStore<TagRecord>(STORE_TAGS),
    getAllFromStore<DreamRecord>(STORE_DREAMS),
    getAllFromStore<DreamTagRelation>(STORE_RELATIONS),
  ]);

  const existingConfig = configs.find((c) => c.id === 'app_config');
  if (!existingConfig) {
    const seed = buildInitialSeedData();
    await Promise.all([
      putInStore(STORE_CONFIG, seed.config),
      replaceStoreContents(STORE_TAGS, seed.tags),
      replaceStoreContents(STORE_DREAMS, seed.dreams),
      replaceStoreContents(STORE_RELATIONS, seed.relations),
    ]);
    return seed;
  }

  return {
    dreams: dreams.map((d) => normalizeDream(d)),
    tags: tags
      .map((t) => normalizeTag(t))
      .filter((t): t is TagRecord => t !== null),
    relations: relations
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

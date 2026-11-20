import {
  DREAM_MOODS,
  DREAM_TIMES,
  DreamMood,
  DreamRecord,
  DreamTagRelation,
  DreamTime,
  MOOD_COLORS,
  TagRecord,
} from '../types/dream';
import { toDateKey } from '../db/storage';

export interface MoodStat {
  mood: Exclude<DreamMood, ''>;
  count: number;
  percent: number;
  color: string;
}

export interface DreamTimeStat {
  dreamTime: DreamTime;
  count: number;
}

export interface TagFrequencyStat {
  tag: TagRecord;
  count: number;
}

export interface WordCloudItem {
  word: string;
  count: number;
  weight: number; // 0..1
}

export interface SimilarDreamPair {
  dreamA: DreamRecord;
  dreamB: DreamRecord;
  similarity: number; // 0..1
  sharedTokens: string[];
}

export interface AnalyticsBundle {
  totalCount: number;
  monthCount: number;
  streakDays: number;
  moodStats: MoodStat[];
  dreamTimeStats: DreamTimeStat[];
  tagStats: TagFrequencyStat[];
  wordCloud: WordCloudItem[];
  similarPairs: SimilarDreamPair[];
}

// In-memory temporary calculation cache (clearable in Settings per PRD 4.4 & 5.8)
let cachedSignature = '';
let cachedResult: AnalyticsBundle | null = null;

export function clearAnalyticsCache(): void {
  cachedSignature = '';
  cachedResult = null;
}

const ZH_STOP_WORDS = new Set([
  '一个', '一些', '这个', '那个', '自己', '我们', '他们', '她们', '什么', '怎么', '为什么',
  '没有', '还是', '但是', '然后', '因为', '所以', '如果', '虽然', '已经', '觉得', '好像',
  '仿佛', '突然', '慢慢', '一直', '只是', '时候', '地方', '东西', '里面', '外面', '上面',
  '下面', '不知', '知道', '看到', '看见', '听见', '起来', '下来', '出来', '进去', '过去',
  '回来', '不过', '非常', '有点', '有些', '一种', '这里', '那里', '这样', '那样', '就是',
  '不是', '可以', '能够', '应该', '还有', '或者', '而且', '层层',
]);

function stripFormatting(text: string): string {
  return text.replace(/\*\*/g, '').replace(/[【】\[\]()（）「」『』，。！？、；：“”‘’\s\n\r.,!?;:"'—…·]/g, ' ');
}

function extractChineseTokens(text: string): string[] {
  const cleaned = stripFormatting(text);
  const tokens: string[] = [];
  // Extract contiguous CJK blocks and slide 2-char / 3-char windows for local Chinese tokenization
  const cjkBlocks = cleaned.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const block of cjkBlocks) {
    if (block.length <= 4 && !ZH_STOP_WORDS.has(block)) {
      tokens.push(block);
    }
    if (block.length >= 2) {
      for (let i = 0; i <= block.length - 2; i++) {
        const bg = block.slice(i, i + 2);
        if (!ZH_STOP_WORDS.has(bg)) {
          tokens.push(bg);
        }
      }
    }
    if (block.length >= 3) {
      for (let i = 0; i <= block.length - 3; i++) {
        const tg = block.slice(i, i + 3);
        if (!ZH_STOP_WORDS.has(tg)) {
          tokens.push(tg);
        }
      }
    }
  }
  const latinWords = cleaned.toLowerCase().match(/[a-z]{3,}/g) || [];
  tokens.push(...latinWords);
  return tokens;
}

function extractWordCloudTokens(text: string): string[] {
  const cleaned = stripFormatting(text);
  const counts = new Map<string, number>();
  const cjkBlocks = cleaned.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const block of cjkBlocks) {
    if (block.length >= 2 && block.length <= 4 && !ZH_STOP_WORDS.has(block)) {
      counts.set(block, (counts.get(block) || 0) + 2);
    }
    for (let i = 0; i <= block.length - 2; i++) {
      const bg = block.slice(i, i + 2);
      if (!ZH_STOP_WORDS.has(bg)) {
        counts.set(bg, (counts.get(bg) || 0) + 1);
      }
    }
  }
  const result: string[] = [];
  counts.forEach((c, w) => {
    for (let i = 0; i < c; i++) result.push(w);
  });
  return result;
}

export function computeDreamSimilarity(
  a: DreamRecord,
  b: DreamRecord
): { score: number; sharedTokens: string[] } {
  const textA = `${a.title} ${a.content}`;
  const textB = `${b.title} ${b.content}`;
  const tokensA = new Set(extractChineseTokens(textA));
  const tokensB = new Set(extractChineseTokens(textB));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return { score: 0, sharedTokens: [] };
  }
  const shared: string[] = [];
  tokensA.forEach((t) => {
    if (tokensB.has(t)) shared.push(t);
  });
  const unionSize = tokensA.size + tokensB.size - shared.length;
  const jaccard = unionSize > 0 ? shared.length / unionSize : 0;
  // Prioritize longer meaningful shared phrases for display
  const dedupedShared = Array.from(new Set(shared))
    .sort((x, y) => y.length - x.length)
    .slice(0, 5);
  return { score: jaccard, sharedTokens: dedupedShared };
}

export function computeStreakDays(formalDreams: DreamRecord[]): number {
  if (formalDreams.length === 0) return 0;
  const dateSet = new Set(formalDreams.map((d) => toDateKey(d.createTime)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);

  let cursor: Date | null = null;
  if (dateSet.has(toDateKey(today.getTime()))) {
    cursor = today;
  } else if (dateSet.has(toDateKey(yesterday.getTime()))) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (cursor && dateSet.has(toDateKey(cursor.getTime()))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
}

export function computeDreamAnalytics(
  dreams: DreamRecord[],
  tags: TagRecord[],
  relations: DreamTagRelation[]
): AnalyticsBundle {
  const formalDreams = dreams.filter((d) => !d.isDraft);
  const tagSig = tags.map((t) => `${t.id}:${t.tagName}:${t.tagColor}`).join('|');
  const relationSig = relations
    .map((r) => `${r.dreamId}>${r.tagId}`)
    .sort()
    .join('|');
  const sig = `${formalDreams
    .map((d) => `${d.id}:${d.updateTime}`)
    .join('|')}__${tagSig}__${relationSig}`;

  if (cachedResult && cachedSignature === sig) {
    return cachedResult;
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthCount = formalDreams.filter((d) => {
    const dt = new Date(d.createTime);
    return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
  }).length;

  const streakDays = computeStreakDays(formalDreams);

  // Mood stats
  const moodCounts = new Map<Exclude<DreamMood, ''>, number>();
  for (const m of DREAM_MOODS) moodCounts.set(m, 0);
  let moodTotal = 0;
  for (const d of formalDreams) {
    if (d.mood) {
      moodCounts.set(d.mood, (moodCounts.get(d.mood) || 0) + 1);
      moodTotal += 1;
    }
  }
  const moodStats: MoodStat[] = DREAM_MOODS.map((m) => {
    const count = moodCounts.get(m) || 0;
    return {
      mood: m,
      count,
      percent: moodTotal > 0 ? Math.round((count / moodTotal) * 100) : 0,
      color: MOOD_COLORS[m],
    };
  }).filter((item) => item.count > 0);

  // DreamTime stats
  const timeCounts = new Map<DreamTime, number>();
  for (const t of DREAM_TIMES) timeCounts.set(t, 0);
  for (const d of formalDreams) {
    timeCounts.set(d.dreamTime, (timeCounts.get(d.dreamTime) || 0) + 1);
  }
  const dreamTimeStats: DreamTimeStat[] = DREAM_TIMES.map((dt) => ({
    dreamTime: dt,
    count: timeCounts.get(dt) || 0,
  }));

  // Tag stats
  const formalIds = new Set(formalDreams.map((d) => d.id));
  const tagCounts = new Map<string, number>();
  for (const rel of relations) {
    if (formalIds.has(rel.dreamId)) {
      tagCounts.set(rel.tagId, (tagCounts.get(rel.tagId) || 0) + 1);
    }
  }
  const tagStats: TagFrequencyStat[] = tags
    .map((tag) => ({ tag, count: tagCounts.get(tag.id) || 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  // Word cloud
  const freqMap = new Map<string, number>();
  for (const d of formalDreams) {
    const words = extractWordCloudTokens(`${d.title} ${d.content}`);
    for (const w of words) {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    }
  }
  const sortedWords = Array.from(freqMap.entries())
    .filter(([, count]) => count >= 2 || formalDreams.length <= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 28);
  const maxFreq = sortedWords[0]?.[1] || 1;
  const wordCloud: WordCloudItem[] = sortedWords.map(([word, count]) => ({
    word,
    count,
    weight: Math.max(0.2, count / maxFreq),
  }));

  // Duplicate / Similar Dreams
  const similarPairs: SimilarDreamPair[] = [];
  for (let i = 0; i < formalDreams.length; i++) {
    for (let j = i + 1; j < formalDreams.length; j++) {
      const a = formalDreams[i];
      const b = formalDreams[j];
      const { score, sharedTokens } = computeDreamSimilarity(a, b);
      if (score >= 0.14 && sharedTokens.length >= 2) {
        similarPairs.push({
          dreamA: a,
          dreamB: b,
          similarity: score,
          sharedTokens,
        });
      }
    }
  }
  similarPairs.sort((x, y) => y.similarity - x.similarity);

  cachedSignature = sig;
  cachedResult = {
    totalCount: formalDreams.length,
    monthCount,
    streakDays,
    moodStats,
    dreamTimeStats,
    tagStats,
    wordCloud,
    similarPairs: similarPairs.slice(0, 10),
  };
  return cachedResult;
}

export function findMostSimilarDream(
  target: DreamRecord,
  allDreams: DreamRecord[]
): SimilarDreamPair | null {
  let best: SimilarDreamPair | null = null;
  for (const other of allDreams) {
    if (other.id === target.id || other.isDraft) continue;
    const { score, sharedTokens } = computeDreamSimilarity(target, other);
    if (score >= 0.14 && sharedTokens.length >= 2) {
      if (!best || score > best.similarity) {
        best = {
          dreamA: target,
          dreamB: other,
          similarity: score,
          sharedTokens,
        };
      }
    }
  }
  return best;
}

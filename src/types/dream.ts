export const APP_PACKAGE_NAME = 'com.hxmj.app';
export const APP_VERSION = '1.0';

export type DreamTime = '深夜睡眠' | '清晨醒前' | '午休小睡' | '白日幻想';

export type DreamMood =
  | '平静'
  | '喜悦'
  | '恐惧'
  | '压抑'
  | '迷茫'
  | '诡异'
  | '伤感'
  | '亢奋'
  | '无特殊感受'
  | '';

export type ThemeMode = 'dark' | 'light' | 'system';
export type FontSizeScale = 'sm' | 'md' | 'lg';
export type CardLayoutMode = 'airy' | 'compact';
export type SortMode = 'desc' | 'asc' | 'star';

export interface GuideAnswers {
  env: string;
  people: string;
  thought: string;
  feeling: string;
}

export interface DreamRecord {
  id: string;
  title: string;
  content: string;
  review: string;
  guideAnswers: GuideAnswers;
  createTime: number;
  updateTime: number;
  dreamTime: DreamTime;
  mood: DreamMood;
  isStar: boolean;
  isSecret: boolean;
  imagePathList: string[]; // Local data URLs stored inside app IndexedDB
  isDraft: boolean;
}

export interface TagRecord {
  id: string;
  tagName: string;
  tagColor: string;
}

export interface DreamTagRelation {
  id: string;
  dreamId: string;
  tagId: string;
}

export interface AppConfig {
  id: string;
  theme: ThemeMode;
  fontSize: FontSizeScale;
  cardLayout: CardLayoutMode;
  enableAnimation: boolean;
  enableStarBg: boolean;
  backupPassword: string;
  initialized: boolean;
}

export interface DreamFilter {
  searchQuery: string;
  datePreset: 'all' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
  moods: DreamMood[];
  tagIds: string[];
  starOnly: boolean;
  secretOnly: boolean;
  hasImageOnly: boolean;
}

export const DREAM_TIMES: DreamTime[] = ['深夜睡眠', '清晨醒前', '午休小睡', '白日幻想'];

export const DREAM_MOODS: Exclude<DreamMood, ''>[] = [
  '平静',
  '喜悦',
  '恐惧',
  '压抑',
  '迷茫',
  '诡异',
  '伤感',
  '亢奋',
  '无特殊感受',
];

export const MOOD_COLORS: Record<Exclude<DreamMood, ''>, string> = {
  平静: '#7b8eb8',
  喜悦: '#8fa98d',
  恐惧: '#9a7081',
  压抑: '#696c82',
  迷茫: '#8c83a6',
  诡异: '#7c6b96',
  伤感: '#6b7e96',
  亢奋: '#a38973',
  无特殊感受: '#787d8c',
};

export const TAG_PALETTE = [
  '#7e77a3', // 雾紫
  '#6c88a6', // 雾蓝
  '#799488', // 苔绿
  '#9e8476', // 暖陶
  '#947183', // 藕粉灰
  '#6d7896', // 靛蓝灰
  '#8c8c73', // 苔米
  '#756b8c', // 暗堇
];

export const PRESET_TAGS: Omit<TagRecord, 'id'>[] = [
  { tagName: '飞翔', tagColor: '#6c88a6' },
  { tagName: '坠落', tagColor: '#7e77a3' },
  { tagName: '被追赶', tagColor: '#947183' },
  { tagName: '熟人', tagColor: '#799488' },
  { tagName: '陌生人', tagColor: '#6d7896' },
  { tagName: '考试', tagColor: '#9e8476' },
  { tagName: '水', tagColor: '#6c88a6' },
  { tagName: '穿越', tagColor: '#756b8c' },
  { tagName: '重复梦境', tagColor: '#8c8c73' },
];

export const GENTLE_QUOTES: string[] = [
  '醒来后残存的微光，是夜色留给白昼的信笺。',
  '那些没有逻辑的片段，也是自我安静呼吸的方式。',
  '把飘散的梦轻轻收好，不必急着追问答案。',
  '夜深时的每一次漂流，都会在晨光里慢慢落定。',
  '梦境不曾远离，它只是换了一种语言与你相遇。',
  '留住转瞬即逝的片刻，其余交给时间自己整理。',
];

export const GUIDE_QUESTIONS: { key: keyof GuideAnswers; label: string; placeholder: string }[] = [
  { key: 'env', label: '梦里环境是什么样？', placeholder: '光线、空间大小、天气或熟悉程度……' },
  { key: 'people', label: '梦里出现的人物是谁？', placeholder: '熟人、陌生人，或是模糊的背影……' },
  { key: 'thought', label: '梦里你最强烈的想法是什么？', placeholder: '想逃离、寻找某物，还是单纯旁观……' },
  { key: 'feeling', label: '醒来之后第一感受？', placeholder: '松了一口气、有些怅然，还是很快忘却……' },
];

export interface DreamTemplate {
  id: string;
  title: string;
  subtitle: string;
  content: string;
}

export const DREAM_TEMPLATES: DreamTemplate[] = [
  {
    id: 'tpl-classic',
    title: '标准四段式记录',
    subtitle: '场景 · 人物 · 事件 · 醒来感受',
    content:
      '【场景】\n所在的空间、色调与氛围：\n\n【人物】\n出现的人与彼此关系：\n\n【事件】\n梦里发生了什么转折：\n\n【醒来感受】\n睁开眼时的情绪与身体感觉：',
  },
  {
    id: 'tpl-fragment',
    title: '碎片片段速记',
    subtitle: '适合刚醒来时快速留存意象',
    content:
      '【最深的一个画面】\n\n【听到的一句话或声音】\n\n【梦里的主色调与气味】\n',
  },
  {
    id: 'tpl-chase',
    title: '追逐与迷路梳理',
    subtitle: '记录方位变化与心理节奏',
    content:
      '【起点与路线】\n我从哪里出发，试图去往哪里：\n\n【阻碍或追赶者】\n是什么在阻挡或靠近：\n\n【停下来的瞬间】\n最后是如何结束或醒来的：',
  },
  {
    id: 'tpl-revisit',
    title: '似曾相识的旧地',
    subtitle: '适合记录重复梦境或旧时场景',
    content:
      '【和现实不同的细节】\n这个地方与记忆中有什么偏差：\n\n【在那里寻找的东西】\n\n【上次梦到类似场景是什么时候】\n',
  },
];

export const PRIVACY_STATEMENT = [
  '回序梦境不会申请麦克风、相机、通知、定位、完整存储等敏感权限。',
  '图片选择使用系统隔离照片选择器，仅读取你主动选中的图片，不会扫描你的全部相册。',
  '所有梦境文字、图片、涂鸦仅保存在本机私有空间，不会收集任何个人信息。',
  '备份文件需要你手动分享或保存，应用不会自动写入公共文件夹。',
];

export const SELF_REFLECTION_DISCLAIMER =
  '提示：内容仅用于自我记录与思绪梳理，不具备科学解梦作用，仅供娱乐参考。';

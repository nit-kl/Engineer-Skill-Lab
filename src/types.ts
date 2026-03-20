export type Category = 
  | 'クラウド' 
  | 'DevOps' 
  | 'バックエンド' 
  | 'セキュリティ' 
  | 'ネットワーク' 
  | 'CS基礎' 
  | 'インフラ' 
  | 'データベース';

export type Difficulty = 1 | 2 | 3;

export type AppStatus = 'available' | 'designing' | 'planning';

export interface SkillApp {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  status: AppStatus;
  tags: string[];
  icon: string;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  'クラウド': '#0078D4',
  'DevOps': '#43A047',
  'バックエンド': '#E65100',
  'セキュリティ': '#D32F2F',
  'ネットワーク': '#C62828',
  'CS基礎': '#6A1B9A',
  'インフラ': '#F9A825',
  'データベース': '#FF6B9D',
};

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; bg: string }> = {
  1: { label: '★ やさしい', color: '#43A047', bg: '#E8F5E9' },
  2: { label: '★★ ふつう', color: '#F9A825', bg: '#FFF8E1' },
  3: { label: '★★★ むずかしい', color: '#E53935', bg: '#FFEBEE' },
};

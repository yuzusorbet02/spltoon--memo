export type RuleId = 'turf' | 'zones' | 'tower' | 'rainmaker' | 'clams';

export interface RuleInfo {
  id: RuleId;
  name: string;
  shortName: string;
  fullName: string;
  englishName: string;
  description: string;
  colors: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  };
}

export interface StageInfo {
  id: string;
  name: string;
  shortName: string;
  englishName: string;
  kana: string;
  desc?: string;
}

export interface MemoData {
  ruleId: RuleId;
  stageId: string;
  content: string;
  weapon?: string;
  tags?: string[];
  updatedAt: number;
}

export type MemoStore = Record<string, MemoData>;

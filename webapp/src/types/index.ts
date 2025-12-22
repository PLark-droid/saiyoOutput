/**
 * 候補者情報の型定義
 */
export interface Candidate {
  name: string;
  email: string;
  phone?: string;
  position: string;
  status: CandidateStatus;
  applicationDate: string;
  interviewDate?: string;
  evaluation?: number;
  notes?: string;
  resumeUrl?: string;
  skills?: string[];
}

export type CandidateStatus =
  | 'new'
  | 'screening'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'offer'
  | 'hired'
  | 'rejected';

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: '新規',
  screening: '書類選考中',
  interview_scheduled: '面接予定',
  interview_completed: '面接完了',
  offer: 'オファー中',
  hired: '採用',
  rejected: '不採用',
};

/**
 * LarkBase API レスポンス型
 */
export interface LarkBaseRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface LarkBaseResponse {
  code: number;
  msg: string;
  data: {
    records: LarkBaseRecord[];
    has_more: boolean;
    page_token?: string;
    total: number;
  };
}

export interface LarkBaseCreateResponse {
  code: number;
  msg: string;
  data: {
    record: LarkBaseRecord;
  };
}

/**
 * LarkBase API 設定
 */
export interface LarkConfig {
  appId: string;
  appSecret: string;
  baseAppToken: string;
  tableId: string;
}

/**
 * AI生成JSONの入力型
 */
export interface AIGeneratedInput {
  candidates?: Candidate[];
  candidate?: Candidate;
  markdown?: string;
}

/**
 * アプリケーション状態
 */
export interface AppState {
  candidates: Candidate[];
  isLoading: boolean;
  error: string | null;
  lastSync: Date | null;
}

/**
 * 採用候補者ドキュメント型定義
 * - 職務経歴書 (CareerHistory)
 * - 推薦文 (Recommendation)
 * - キャリアプラン (CareerPlan)
 */

// ============================================
// 共通型
// ============================================

export type DocumentType = '職務経歴書' | '推薦文' | 'キャリアプラン';

export interface BaseDocument {
  document_type: DocumentType;
  candidate_name: string;
  creation_date?: string;
}

// ============================================
// 職務経歴書 (CareerHistory)
// ============================================

export interface CareerHistoryDocument {
  document_type: '職務経歴書';
  last_updated: string;
  candidate_name: {
    value: string;
    format: string;
  };
  sections: CareerHistorySection[];
  footer: {
    text: string;
    alignment: string;
  };
}

export type CareerHistorySection = SummarySection | WorkHistorySection | SkillsSection | SelfPRSection;

export interface SummarySection {
  section_id: 'summary';
  heading: string;
  heading_level: string;
  content: {
    text: string;
    max_length?: number;
  };
}

export interface WorkHistorySection {
  section_id: 'work_history';
  heading: string;
  heading_level: string;
  companies: CompanyEntry[];
}

export interface CompanyEntry {
  company_id: string;
  table: {
    format: string;
    rows: CompanyRow[];
  };
}

export interface CompanyRow {
  row_type: 'period_and_company' | 'department_and_duties';
  cells: CompanyCell[];
}

export interface CompanyCell {
  type: string;
  content: string | CompanyInfo | DepartmentDetails;
  width: string;
}

export interface CompanyInfo {
  company_name: string;
  employment_type: string;
  company_details?: {
    business?: string;
    capital?: string;
    revenue?: string;
    employees?: string;
    listing?: string;
  };
}

export interface DepartmentDetails {
  department: string;
  業務内容?: ListItemGroup;
  主な実績?: ListItemGroup;
  主な取り組み?: ListItemGroup;
}

export interface ListItemGroup {
  list_items: ListItem[];
}

export interface ListItem {
  id: string;
  content: string;
  metrics?: string;
}

export interface SkillsSection {
  section_id: 'skills';
  heading: string;
  heading_level: string;
  content: {
    list_items: ListItem[];
  };
}

export interface SelfPRSection {
  section_id: 'self_pr';
  heading: string;
  heading_level: string;
  content: {
    pr_points: PRPoint[];
  };
}

export interface PRPoint {
  id: string;
  heading: string;
  heading_level: string;
  content: string;
}

// ============================================
// 推薦文 (Recommendation)
// ============================================

export interface RecommendationDocument {
  document_type: '推薦文';
  candidate_name: string;
  creation_date: string;
  sections: RecommendationSection[];
  footer: {
    recommender: string;
    creation_date: string;
  };
}

export type RecommendationSection =
  | TextSection
  | RecommendationReasonSection
  | ConditionsSection;

export interface TextSection {
  section_id: 'candidate_overview' | 'reason_for_job_change' | 'summary';
  heading: string;
  heading_level: string;
  content: {
    text: string;
  };
}

export interface RecommendationReasonSection {
  section_id: 'recommendation_reason';
  heading: string;
  heading_level: string;
  content: {
    introduction: string;
    reasons: RecommendationReason[];
  };
}

export interface RecommendationReason {
  id: string;
  heading: string;
  heading_level?: string;
  content?: string;
  description?: string; // 新しいJSON形式ではdescriptionを使用
}

export interface ConditionsSection {
  section_id: 'conditions';
  heading: string;
  heading_level: string;
  content: {
    table: {
      rows: ConditionRow[];
    };
  };
}

export interface ConditionRow {
  item: string;
  detail: string;
}

// ============================================
// キャリアプラン (CareerPlan)
// ============================================

export interface CareerPlanDocument {
  document_type: 'キャリアプラン';
  candidate_name: string;
  creation_date: string;
  sections: CareerPlanSection[];
  footer: {
    author: string;
    creation_date: string;
  };
}

export type CareerPlanSection =
  | CareerVisionSection
  | PlanSection
  | PotentialSection
  | CareerPlanSummarySection;

export interface CareerVisionSection {
  section_id: 'career_vision';
  heading: string;
  heading_level: string;
  content: {
    text: string;
  };
}

export interface PlanSection {
  section_id: 'short_term_plan' | 'mid_term_plan' | 'long_term_plan';
  heading: string;
  heading_level: string;
  content: {
    introduction: string;
    goals: PlanGoal[];
    conclusion: string;
  };
}

export interface PlanGoal {
  id: string;
  heading: string;
  content: string;
  targets?: string[];
  initiatives?: string[];
  skills?: string[];
  roles?: string[];
  activities?: string[];
  conclusion?: string;
}

export interface PotentialSection {
  section_id: 'potential';
  heading: string;
  heading_level: string;
  content: {
    introduction: string;
    potentials: Potential[];
  };
}

export interface Potential {
  id: string;
  heading: string;
  content: string;
}

export interface CareerPlanSummarySection {
  section_id: 'summary';
  heading: string;
  heading_level: string;
  content: {
    text: string;
  };
}

// ============================================
// Baseテーブルレコード型
// ============================================

export interface CompanyDetailRecord {
  会社名: string;
  期間: string;
  雇用形態: string;
  事業内容: string;
  資本金: string;
  売上高: string;
  従業員数: string;
  上場区分: string;
  部署: string;
  業務内容: string;
  主な実績: string;
  主な取り組み: string;
}

// 会社フィールドのキー名（動的生成用）
export const COMPANY_FIELD_NAMES = [
  '会社名',
  '期間',
  '雇用形態',
  '事業内容',
  '資本金',
  '売上高',
  '従業員数',
  '上場区分',
  '部署',
  '業務内容',
  '主な実績',
  '主な取り組み',
] as const;

export type CompanyFieldName = typeof COMPANY_FIELD_NAMES[number];

// 動的な会社フィールドを含むレコード型
// 例: 会社名_会社1, 期間_会社1, ..., 会社名_会社N, 期間_会社N
export interface CareerHistoryBaseRecord {
  候補者名: string;
  最終更新日: string;
  職務要約: string;
  会社数: number;
  '活かせる経験・知識・技術': string;
  '自己PR': string;
  元データJSON: string;
  // 動的な会社フィールド（会社名_会社1, 期間_会社1, ... 会社名_会社N, 期間_会社N）
  [key: string]: string | number;
}

export interface RecommendationBaseRecord {
  候補者名: string;
  作成日: string;
  候補者概要: string;
  転職理由: string;
  推薦理由: string;
  志向性と将来性: string;
  総評: string;
  希望年収: string;
  転職時期: string;
  希望勤務地: string;
  希望休日: string;
  希望職種: string;
  その他条件: string;
  元データJSON: string;
}

export interface CareerPlanBaseRecord {
  候補者名: string;
  作成日: string;
  はじめに: string;
  短期計画: string;
  中期計画: string;
  長期計画: string;
  ポテンシャル: string;
  まとめ: string;
  キャリアロードマップ: string;
  元データJSON: string;
}

// Union type for all document types
export type CandidateDocument =
  | CareerHistoryDocument
  | RecommendationDocument
  | CareerPlanDocument;

// Union type for all base records
export type BaseRecord =
  | CareerHistoryBaseRecord
  | RecommendationBaseRecord
  | CareerPlanBaseRecord;

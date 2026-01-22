/**
 * ドキュメントJSON → Baseレコード変換ユーティリティ
 */

import type {
  CareerHistoryDocument,
  RecommendationDocument,
  CareerPlanDocument,
  CareerHistoryBaseRecord,
  RecommendationBaseRecord,
  CareerPlanBaseRecord,
  CompanyEntry,
  CompanyInfo,
  DepartmentDetails,
  RecommendationReason,
  CandidateDocument,
  DocumentType,
  ListItem,
  PRPoint,
} from '../types/documents';

// ============================================
// ドキュメントタイプ判定
// ============================================

export function detectDocumentType(json: unknown): DocumentType | null {
  if (typeof json !== 'object' || json === null) {
    return null;
  }
  const doc = json as { document_type?: string };
  if (doc.document_type === '職務経歴書') return '職務経歴書';
  if (doc.document_type === '推薦文') return '推薦文';
  if (doc.document_type === 'キャリアプラン') return 'キャリアプラン';
  return null;
}

export function validateDocument(json: unknown): CandidateDocument | null {
  const type = detectDocumentType(json);
  if (!type) return null;
  // Basic validation - check required fields
  const doc = json as CandidateDocument;
  if (!doc.sections || !Array.isArray(doc.sections)) return null;
  return doc;
}

// ============================================
// 職務経歴書変換
// ============================================

interface ExtractedCompanyData {
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

interface TopicItem {
  id: string;
  title: string;
  description: string;
}

interface TopicsContent {
  heading?: string;
  topics: TopicItem[];
}

function extractCompanyData(company: CompanyEntry): ExtractedCompanyData {
  let companyName = '';
  let period = '';
  let employmentType = '';
  let business = '';
  let capital = '';
  let revenue = '';
  let employees = '';
  let listing = '';
  let department = '';
  let duties: string[] = [];
  let achievements: string[] = [];
  let initiatives: string[] = [];
  let topics: TopicItem[] = [];

  for (const row of company.table.rows) {
    for (const cell of row.cells) {
      // 期間は最初の非空値を採用（topics行の空文字で上書きされないように）
      if (cell.type === 'period' && typeof cell.content === 'string' && cell.content && !period) {
        period = cell.content;
      }
      if (cell.type === 'company_info' && typeof cell.content === 'object') {
        const info = cell.content as CompanyInfo;
        companyName = info.company_name || '';
        employmentType = (info.employment_type || '').replace('として勤務', '');
        if (info.company_details) {
          business = (info.company_details.business || '').replace('事業内容:', '');
          capital = (info.company_details.capital || '').replace('資本金:', '');
          revenue = (info.company_details.revenue || '').replace('売上高:', '');
          employees = (info.company_details.employees || '').replace('従業員数:', '');
          listing = (info.company_details.listing || '').replace('上場:', '');
        }
      }
      if (cell.type === 'details' && typeof cell.content === 'object') {
        const details = cell.content as DepartmentDetails;
        // department_and_duties 行の場合
        if (details.department) {
          department = details.department;
          duties = details.業務内容?.list_items?.map(item => item.content) || [];
          achievements = details.主な実績?.list_items?.map(item =>
            item.metrics ? `${item.content}（${item.metrics}）` : item.content
          ) || [];
          initiatives = details.主な取り組み?.list_items?.map(item => item.content) || [];
        }
        // topics 行の場合
        const topicsContent = cell.content as unknown as TopicsContent;
        if (topicsContent.topics && Array.isArray(topicsContent.topics)) {
          topics = topicsContent.topics;
        }
      }
    }
  }

  // 主な実績をフォーマット（トピックスがあれば追記）
  let formattedAchievements = achievements.map(a => `・${a}`).join('\n');
  if (topics.length > 0) {
    const formattedTopics = topics.map(t => `${t.title}\n${t.description}`).join('\n\n');
    formattedAchievements += (formattedAchievements ? '\n\n' : '') + '【トピックス】\n' + formattedTopics;
  }

  return {
    会社名: companyName,
    期間: period,
    雇用形態: employmentType,
    事業内容: business,
    資本金: capital,
    売上高: revenue,
    従業員数: employees,
    上場区分: listing,
    部署: department,
    業務内容: duties.map(d => `・${d}`).join('\n'),
    主な実績: formattedAchievements,
    主な取り組み: initiatives.map(i => `・${i}`).join('\n'),
  };
}

function formatSkills(items: ListItem[]): string {
  return items.map(item => `・${item.content}`).join('\n');
}

function formatSelfPR(prPoints: PRPoint[]): string {
  const lines: string[] = [];
  for (const pr of prPoints) {
    lines.push(pr.heading);
    lines.push(pr.content);
    lines.push('');
  }
  return lines.join('\n');
}

export function convertCareerHistory(doc: CareerHistoryDocument): CareerHistoryBaseRecord {
  const candidateName = doc.candidate_name.value;
  const lastUpdated = doc.last_updated;

  // Get summary
  const summarySection = doc.sections.find(s => s.section_id === 'summary');
  const summary = summarySection && 'content' in summarySection && 'text' in summarySection.content
    ? summarySection.content.text
    : '';

  // Get work history
  const workHistorySection = doc.sections.find(s => s.section_id === 'work_history');
  const companies = workHistorySection && 'companies' in workHistorySection
    ? workHistorySection.companies
    : [];

  const companyCount = companies.length;

  // Get skills
  const skillsSection = doc.sections.find(s => s.section_id === 'skills');
  const skills = skillsSection && 'content' in skillsSection && 'list_items' in skillsSection.content
    ? formatSkills(skillsSection.content.list_items as ListItem[])
    : '';

  // Get self PR
  const selfPRSection = doc.sections.find(s => s.section_id === 'self_pr');
  const selfPR = selfPRSection && 'content' in selfPRSection && 'pr_points' in selfPRSection.content
    ? formatSelfPR(selfPRSection.content.pr_points as PRPoint[])
    : '';

  // ベースレコード作成
  const record: CareerHistoryBaseRecord = {
    候補者名: candidateName,
    最終更新日: lastUpdated,
    職務要約: summary,
    会社数: companyCount,
    '活かせる経験・知識・技術': skills,
    '自己PR': selfPR,
    元データJSON: JSON.stringify(doc, null, 2),
  };

  // 全ての会社データを動的に追加（会社数に制限なし）
  for (let i = 0; i < companies.length; i++) {
    const companyNum = i + 1;
    const companyData = extractCompanyData(companies[i]);

    // 各会社のフィールドを追加
    record[`会社名_会社${companyNum}`] = companyData.会社名;
    record[`期間_会社${companyNum}`] = companyData.期間;
    record[`雇用形態_会社${companyNum}`] = companyData.雇用形態;
    record[`事業内容_会社${companyNum}`] = companyData.事業内容;
    record[`資本金_会社${companyNum}`] = companyData.資本金;
    record[`売上高_会社${companyNum}`] = companyData.売上高;
    record[`従業員数_会社${companyNum}`] = companyData.従業員数;
    record[`上場区分_会社${companyNum}`] = companyData.上場区分;
    record[`部署_会社${companyNum}`] = companyData.部署;
    record[`業務内容_会社${companyNum}`] = companyData.業務内容;
    record[`主な実績_会社${companyNum}`] = companyData.主な実績;
    record[`主な取り組み_会社${companyNum}`] = companyData.主な取り組み;
  }

  return record;
}

// ============================================
// 推薦文変換
// ============================================

interface RecommendationReasonContent {
  introduction: string;
  reasons: RecommendationReason[];
  aspiration_and_potential?: {
    heading: string;
    content: string;
  };
  overall_assessment?: {
    heading: string;
    content: string;
  };
}

interface ConditionCell {
  content: string;
  type: 'label' | 'value';
}

interface ConditionTableRow {
  cells: ConditionCell[];
}

function formatRecommendationReasons(reasons: RecommendationReason[]): string {
  const lines: string[] = [];

  for (const reason of reasons) {
    lines.push(`【${reason.heading}】`);
    // description または content をサポート
    const text = reason.description || reason.content || '';
    lines.push(text);
    lines.push('');
  }

  return lines.join('\n');
}

function getConditionValueFromTable(rows: ConditionTableRow[], label: string): string {
  for (const row of rows) {
    const labelCell = row.cells.find(c => c.type === 'label');
    const valueCell = row.cells.find(c => c.type === 'value');
    if (labelCell && valueCell && labelCell.content === label) {
      return valueCell.content;
    }
  }
  return '';
}

export function convertRecommendation(doc: RecommendationDocument): RecommendationBaseRecord {
  const candidateName = doc.candidate_name;
  const creationDate = doc.creation_date;

  // Get sections by ID
  const findSection = (id: string) => doc.sections.find(s => s.section_id === id);

  // Text sections
  const overviewSection = findSection('candidate_overview');
  const overview = overviewSection && 'content' in overviewSection && 'text' in overviewSection.content
    ? overviewSection.content.text
    : '';

  // reason_for_change または reason_for_job_change をサポート
  const reasonSection = findSection('reason_for_change') || findSection('reason_for_job_change');
  const reason = reasonSection && 'content' in reasonSection && 'text' in reasonSection.content
    ? reasonSection.content.text
    : '';

  // Recommendation reasons (with aspiration_and_potential and overall_assessment)
  const recReasonSection = findSection('recommendation_reason');
  let recommendationReasons = '';
  let aspirationAndPotential = '';
  let overallAssessment = '';

  if (recReasonSection && 'content' in recReasonSection) {
    const content = recReasonSection.content as RecommendationReasonContent;

    // 推薦理由本文
    if (content.introduction && content.reasons) {
      recommendationReasons = content.introduction + '\n\n' + formatRecommendationReasons(content.reasons);
    }

    // 志向性と将来性
    if (content.aspiration_and_potential) {
      aspirationAndPotential = `【${content.aspiration_and_potential.heading}】\n${content.aspiration_and_potential.content}`;
    }

    // 総評
    if (content.overall_assessment) {
      overallAssessment = `【${content.overall_assessment.heading}】\n${content.overall_assessment.content}`;
    }
  }

  // Conditions (新しいテーブル形式に対応)
  const conditionsSection = findSection('conditions');
  let conditionRows: ConditionTableRow[] = [];
  if (conditionsSection && 'content' in conditionsSection && 'table' in conditionsSection.content) {
    const content = conditionsSection.content as unknown as { table: { rows: ConditionTableRow[] } };
    conditionRows = content.table.rows;
  }

  return {
    候補者名: candidateName,
    作成日: creationDate,
    候補者概要: overview,
    転職理由: reason,
    推薦理由: recommendationReasons,
    志向性と将来性: aspirationAndPotential,
    総評: overallAssessment,
    希望年収: getConditionValueFromTable(conditionRows, '希望年収'),
    転職時期: getConditionValueFromTable(conditionRows, '転職時期'),
    希望勤務地: getConditionValueFromTable(conditionRows, '勤務地'),
    希望休日: getConditionValueFromTable(conditionRows, '休日'),
    希望職種: getConditionValueFromTable(conditionRows, '職種'),
    その他条件: getConditionValueFromTable(conditionRows, 'その他'),
    元データJSON: JSON.stringify(doc, null, 2),
  };
}

// ============================================
// キャリアプラン変換
// ============================================

interface CareerPlanSectionContent {
  phase?: string;
  goal?: string;
  recommended_positions?: {
    heading: string;
    list_items: { id: string; content: string }[];
  };
  target_income?: {
    heading: string;
    content: string;
  };
  skills_to_acquire?: {
    heading: string;
    list_items: { id: string; content: string }[];
  };
  career_strategy?: {
    heading: string;
    content: string;
  };
  text?: string;
  introduction?: string;
  potentials?: { id: string; heading: string; content: string }[];
  summary?: { heading: string; content: string };
  roadmap?: {
    heading: string;
    table: { rows: { cells: { content: string; type: string }[] }[] };
  };
  final_message?: string;
}

function formatCareerPlanSection(content: CareerPlanSectionContent): string {
  const lines: string[] = [];

  if (content.phase && content.goal) {
    lines.push(`【${content.phase}】`);
    lines.push(`目標: ${content.goal}`);
    lines.push('');
  }

  if (content.recommended_positions) {
    lines.push(`${content.recommended_positions.heading}:`);
    content.recommended_positions.list_items.forEach(item => {
      lines.push(`・${item.content}`);
    });
    lines.push('');
  }

  if (content.target_income) {
    lines.push(`${content.target_income.heading}: ${content.target_income.content}`);
    lines.push('');
  }

  if (content.skills_to_acquire) {
    lines.push(`${content.skills_to_acquire.heading}:`);
    content.skills_to_acquire.list_items.forEach(item => {
      lines.push(`・${item.content}`);
    });
    lines.push('');
  }

  if (content.career_strategy) {
    lines.push(`${content.career_strategy.heading}:`);
    lines.push(content.career_strategy.content);
  }

  return lines.join('\n');
}

function formatPotentialsSection(content: CareerPlanSectionContent): string {
  const lines: string[] = [];

  if (content.introduction) {
    lines.push(content.introduction);
    lines.push('');
  }

  if (content.potentials) {
    for (const potential of content.potentials) {
      lines.push(`【${potential.heading}】`);
      lines.push(potential.content);
      lines.push('');
    }
  }

  if (content.summary) {
    lines.push(`【${content.summary.heading}】`);
    lines.push(content.summary.content);
  }

  return lines.join('\n');
}

function formatConclusionSection(content: CareerPlanSectionContent): string {
  const lines: string[] = [];

  if (content.text) {
    lines.push(content.text);
    lines.push('');
  }

  if (content.final_message) {
    lines.push(content.final_message);
  }

  return lines.join('\n');
}

function formatRoadmap(content: CareerPlanSectionContent): string {
  if (!content.roadmap) return '';

  const lines: string[] = [];
  lines.push(`【${content.roadmap.heading}】`);

  for (const row of content.roadmap.table.rows) {
    const cells = row.cells.map(c => c.content).join(' | ');
    lines.push(cells);
  }

  return lines.join('\n');
}

export function convertCareerPlan(doc: CareerPlanDocument): CareerPlanBaseRecord {
  const candidateName = doc.candidate_name;
  const creationDate = doc.creation_date;

  // Get sections by ID
  const findSection = (id: string) => doc.sections.find(s => s.section_id === id);

  // はじめに (introduction)
  const introSection = findSection('introduction');
  const introduction = introSection && 'content' in introSection && 'text' in introSection.content
    ? introSection.content.text
    : '';

  // 短期計画 (short_term)
  const shortTermSection = findSection('short_term');
  const shortTerm = shortTermSection && 'content' in shortTermSection
    ? formatCareerPlanSection(shortTermSection.content as CareerPlanSectionContent)
    : '';

  // 中期計画 (mid_term)
  const midTermSection = findSection('mid_term');
  const midTerm = midTermSection && 'content' in midTermSection
    ? formatCareerPlanSection(midTermSection.content as CareerPlanSectionContent)
    : '';

  // 長期計画 (long_term)
  const longTermSection = findSection('long_term');
  const longTerm = longTermSection && 'content' in longTermSection
    ? formatCareerPlanSection(longTermSection.content as CareerPlanSectionContent)
    : '';

  // ポテンシャル (hidden_potential)
  const potentialSection = findSection('hidden_potential');
  const potentials = potentialSection && 'content' in potentialSection
    ? formatPotentialsSection(potentialSection.content as CareerPlanSectionContent)
    : '';

  // まとめ (conclusion)
  const conclusionSection = findSection('conclusion');
  const conclusion = conclusionSection && 'content' in conclusionSection
    ? formatConclusionSection(conclusionSection.content as CareerPlanSectionContent)
    : '';

  // キャリアロードマップ
  const roadmap = conclusionSection && 'content' in conclusionSection
    ? formatRoadmap(conclusionSection.content as CareerPlanSectionContent)
    : '';

  return {
    候補者名: candidateName,
    作成日: creationDate,
    はじめに: introduction,
    短期計画: shortTerm,
    中期計画: midTerm,
    長期計画: longTerm,
    ポテンシャル: potentials,
    まとめ: conclusion,
    キャリアロードマップ: roadmap,
    元データJSON: JSON.stringify(doc, null, 2),
  };
}

// ============================================
// 統合変換関数
// ============================================

export function convertDocument(doc: CandidateDocument): {
  type: DocumentType;
  record: CareerHistoryBaseRecord | RecommendationBaseRecord | CareerPlanBaseRecord;
} {
  switch (doc.document_type) {
    case '職務経歴書':
      return {
        type: '職務経歴書',
        record: convertCareerHistory(doc as CareerHistoryDocument),
      };
    case '推薦文':
      return {
        type: '推薦文',
        record: convertRecommendation(doc as RecommendationDocument),
      };
    case 'キャリアプラン':
      return {
        type: 'キャリアプラン',
        record: convertCareerPlan(doc as CareerPlanDocument),
      };
    default:
      throw new Error(`Unknown document type: ${(doc as CandidateDocument).document_type}`);
  }
}

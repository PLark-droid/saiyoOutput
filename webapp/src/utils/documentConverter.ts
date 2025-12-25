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
  ConditionRow,
  PlanSection,
  PlanGoal,
  Potential,
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

  for (const row of company.table.rows) {
    for (const cell of row.cells) {
      if (cell.type === 'period' && typeof cell.content === 'string') {
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
        department = details.department;
        duties = details.業務内容?.list_items?.map(item => item.content) || [];
        achievements = details.主な実績?.list_items?.map(item =>
          item.metrics ? `${item.content}（${item.metrics}）` : item.content
        ) || [];
        initiatives = details.主な取り組み?.list_items?.map(item => item.content) || [];
      }
    }
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
    主な実績: achievements.map(a => `・${a}`).join('\n'),
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

function formatRecommendationReasons(reasons: RecommendationReason[]): string {
  const lines: string[] = [];

  for (const reason of reasons) {
    lines.push(`【${reason.heading}】`);
    lines.push(reason.content);
    lines.push('');
  }

  return lines.join('\n');
}

function getConditionValue(rows: ConditionRow[], item: string): string {
  const row = rows.find(r => r.item === item);
  return row ? row.detail : '';
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

  const reasonSection = findSection('reason_for_job_change');
  const reason = reasonSection && 'content' in reasonSection && 'text' in reasonSection.content
    ? reasonSection.content.text
    : '';

  const summarySection = findSection('summary');
  const summary = summarySection && 'content' in summarySection && 'text' in summarySection.content
    ? summarySection.content.text
    : '';

  // Recommendation reasons
  const recReasonSection = findSection('recommendation_reason');
  let recommendationReasons = '';
  if (recReasonSection && 'content' in recReasonSection && 'reasons' in recReasonSection.content) {
    const content = recReasonSection.content as { introduction: string; reasons: RecommendationReason[] };
    recommendationReasons = content.introduction + '\n\n' + formatRecommendationReasons(content.reasons);
  }

  // Conditions
  const conditionsSection = findSection('conditions');
  let conditionRows: ConditionRow[] = [];
  if (conditionsSection && 'content' in conditionsSection && 'table' in conditionsSection.content) {
    const content = conditionsSection.content as { table: { rows: ConditionRow[] } };
    conditionRows = content.table.rows;
  }

  return {
    候補者名: candidateName,
    作成日: creationDate,
    候補者概要: overview,
    転職理由: reason,
    推薦理由: recommendationReasons,
    まとめ: summary,
    希望年収: getConditionValue(conditionRows, '希望年収'),
    入社希望時期: getConditionValue(conditionRows, '入社希望時期'),
    希望勤務地: getConditionValue(conditionRows, '勤務地'),
    希望休日: getConditionValue(conditionRows, '休日'),
    希望働き方: getConditionValue(conditionRows, '働き方'),
    希望職種: getConditionValue(conditionRows, '職種'),
    その他条件: getConditionValue(conditionRows, 'その他'),
    推薦者: doc.footer.recommender,
    元データJSON: JSON.stringify(doc, null, 2),
  };
}

// ============================================
// キャリアプラン変換
// ============================================

function formatPlanGoals(goals: PlanGoal[]): string {
  const lines: string[] = [];

  for (const goal of goals) {
    lines.push(`【${goal.heading}】`);
    lines.push(goal.content);

    if (goal.targets && goal.targets.length > 0) {
      lines.push('');
      lines.push('目標:');
      goal.targets.forEach(t => lines.push(`・${t}`));
    }

    if (goal.initiatives && goal.initiatives.length > 0) {
      lines.push('');
      lines.push('施策:');
      goal.initiatives.forEach(i => lines.push(`・${i}`));
    }

    if (goal.skills && goal.skills.length > 0) {
      lines.push('');
      lines.push('習得スキル:');
      goal.skills.forEach(s => lines.push(`・${s}`));
    }

    if (goal.roles && goal.roles.length > 0) {
      lines.push('');
      lines.push('担う役割:');
      goal.roles.forEach(r => lines.push(`・${r}`));
    }

    if (goal.activities && goal.activities.length > 0) {
      lines.push('');
      lines.push('活動:');
      goal.activities.forEach(a => lines.push(`・${a}`));
    }

    if (goal.conclusion) {
      lines.push('');
      lines.push(goal.conclusion);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatPlanSection(section: PlanSection): string {
  const lines: string[] = [];
  lines.push(section.content.introduction);
  lines.push('');
  lines.push(formatPlanGoals(section.content.goals));
  lines.push(section.content.conclusion);
  return lines.join('\n');
}

function formatPotentials(potentials: Potential[]): string {
  const lines: string[] = [];

  for (const potential of potentials) {
    lines.push(`【${potential.heading}】`);
    lines.push(potential.content);
    lines.push('');
  }

  return lines.join('\n');
}

export function convertCareerPlan(doc: CareerPlanDocument): CareerPlanBaseRecord {
  const candidateName = doc.candidate_name;
  const creationDate = doc.creation_date;

  // Get sections by ID
  const findSection = (id: string) => doc.sections.find(s => s.section_id === id);

  // Vision
  const visionSection = findSection('career_vision');
  const vision = visionSection && 'content' in visionSection && 'text' in visionSection.content
    ? visionSection.content.text
    : '';

  // Plans
  const shortTermSection = findSection('short_term_plan') as PlanSection | undefined;
  const shortTerm = shortTermSection ? formatPlanSection(shortTermSection) : '';

  const midTermSection = findSection('mid_term_plan') as PlanSection | undefined;
  const midTerm = midTermSection ? formatPlanSection(midTermSection) : '';

  const longTermSection = findSection('long_term_plan') as PlanSection | undefined;
  const longTerm = longTermSection ? formatPlanSection(longTermSection) : '';

  // Potentials
  const potentialSection = findSection('potential');
  let potentials = '';
  if (potentialSection && 'content' in potentialSection && 'potentials' in potentialSection.content) {
    const content = potentialSection.content as { introduction: string; potentials: Potential[] };
    potentials = content.introduction + '\n\n' + formatPotentials(content.potentials);
  }

  // Summary
  const summarySection = findSection('summary');
  const summary = summarySection && 'content' in summarySection && 'text' in summarySection.content
    ? summarySection.content.text
    : '';

  return {
    候補者名: candidateName,
    作成日: creationDate,
    キャリアビジョン: vision,
    短期計画: shortTerm,
    中期計画: midTerm,
    長期計画: longTerm,
    ポテンシャル: potentials,
    まとめ: summary,
    作成者: doc.footer.author,
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

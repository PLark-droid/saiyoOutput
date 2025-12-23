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

function formatCompanyEntry(company: CompanyEntry): string {
  const data = extractCompanyData(company);
  const lines: string[] = [];

  lines.push(`【${data.会社名}】${data.期間}（${data.雇用形態}）`);
  lines.push(`${data.事業内容}`);
  lines.push(`${data.資本金} / ${data.従業員数}`);
  lines.push(`部署: ${data.部署}`);
  lines.push('');
  if (data.業務内容) {
    lines.push('■業務内容');
    lines.push(data.業務内容);
    lines.push('');
  }
  if (data.主な実績) {
    lines.push('■主な実績');
    lines.push(data.主な実績);
    lines.push('');
  }
  if (data.主な取り組み) {
    lines.push('■主な取り組み');
    lines.push(data.主な取り組み);
  }

  return lines.join('\n');
}

function emptyCompanyFields(): Record<string, string> {
  return {
    会社名: '',
    期間: '',
    雇用形態: '',
    事業内容: '',
    資本金: '',
    売上高: '',
    従業員数: '',
    上場区分: '',
    部署: '',
    業務内容: '',
    主な実績: '',
    主な取り組み: '',
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

  // Extract detailed company data (max 5)
  const c1 = companies[0] ? extractCompanyData(companies[0]) : emptyCompanyFields();
  const c2 = companies[1] ? extractCompanyData(companies[1]) : emptyCompanyFields();
  const c3 = companies[2] ? extractCompanyData(companies[2]) : emptyCompanyFields();
  const c4 = companies[3] ? extractCompanyData(companies[3]) : emptyCompanyFields();
  const c5 = companies[4] ? extractCompanyData(companies[4]) : emptyCompanyFields();

  // 6社目以降はその他にまとめる
  const otherCompanies = companies.slice(5).map((c) => formatCompanyEntry(c)).join('\n\n---\n\n');

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

  return {
    候補者名: candidateName,
    最終更新日: lastUpdated,
    職務要約: summary,
    // 会社1
    会社名_会社1: c1.会社名,
    期間_会社1: c1.期間,
    雇用形態_会社1: c1.雇用形態,
    事業内容_会社1: c1.事業内容,
    資本金_会社1: c1.資本金,
    売上高_会社1: c1.売上高,
    従業員数_会社1: c1.従業員数,
    上場区分_会社1: c1.上場区分,
    部署_会社1: c1.部署,
    業務内容_会社1: c1.業務内容,
    主な実績_会社1: c1.主な実績,
    主な取り組み_会社1: c1.主な取り組み,
    // 会社2
    会社名_会社2: c2.会社名,
    期間_会社2: c2.期間,
    雇用形態_会社2: c2.雇用形態,
    事業内容_会社2: c2.事業内容,
    資本金_会社2: c2.資本金,
    売上高_会社2: c2.売上高,
    従業員数_会社2: c2.従業員数,
    上場区分_会社2: c2.上場区分,
    部署_会社2: c2.部署,
    業務内容_会社2: c2.業務内容,
    主な実績_会社2: c2.主な実績,
    主な取り組み_会社2: c2.主な取り組み,
    // 会社3
    会社名_会社3: c3.会社名,
    期間_会社3: c3.期間,
    雇用形態_会社3: c3.雇用形態,
    事業内容_会社3: c3.事業内容,
    資本金_会社3: c3.資本金,
    売上高_会社3: c3.売上高,
    従業員数_会社3: c3.従業員数,
    上場区分_会社3: c3.上場区分,
    部署_会社3: c3.部署,
    業務内容_会社3: c3.業務内容,
    主な実績_会社3: c3.主な実績,
    主な取り組み_会社3: c3.主な取り組み,
    // 会社4
    会社名_会社4: c4.会社名,
    期間_会社4: c4.期間,
    雇用形態_会社4: c4.雇用形態,
    事業内容_会社4: c4.事業内容,
    資本金_会社4: c4.資本金,
    売上高_会社4: c4.売上高,
    従業員数_会社4: c4.従業員数,
    上場区分_会社4: c4.上場区分,
    部署_会社4: c4.部署,
    業務内容_会社4: c4.業務内容,
    主な実績_会社4: c4.主な実績,
    主な取り組み_会社4: c4.主な取り組み,
    // 会社5
    会社名_会社5: c5.会社名,
    期間_会社5: c5.期間,
    雇用形態_会社5: c5.雇用形態,
    事業内容_会社5: c5.事業内容,
    資本金_会社5: c5.資本金,
    売上高_会社5: c5.売上高,
    従業員数_会社5: c5.従業員数,
    上場区分_会社5: c5.上場区分,
    部署_会社5: c5.部署,
    業務内容_会社5: c5.業務内容,
    主な実績_会社5: c5.主な実績,
    主な取り組み_会社5: c5.主な取り組み,
    // その他
    職務経歴_その他: otherCompanies,
    会社数: companyCount,
    '活かせる経験・知識・技術': skills,
    '自己PR': selfPR,
    元データJSON: JSON.stringify(doc, null, 2),
  };
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

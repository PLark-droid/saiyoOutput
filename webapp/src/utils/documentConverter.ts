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
  CandidateName,
  DocumentType,
  ListItem,
  PRPoint,
  ConditionListItem,
} from '../types/documents';

/**
 * candidate_name を文字列に正規化する
 */
function resolveCandidateName(name: CandidateName): string {
  if (typeof name === 'string') return name;
  return name.display || name.value || '';
}

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
  const summary = getSectionText(summarySection);

  // Get work history
  const workHistorySection = doc.sections.find(s => s.section_id === 'work_history');
  const companies = workHistorySection && 'companies' in workHistorySection
    ? workHistorySection.companies
    : [];

  const companyCount = companies.length;

  // Get skills
  const skillsSection = doc.sections.find(s => s.section_id === 'skills');
  const skillsContent = getSectionObjectContent(skillsSection);
  const skills = Array.isArray(skillsContent?.list_items)
    ? formatSkills(skillsContent.list_items as ListItem[])
    : '';

  // Get self PR
  const selfPRSection = doc.sections.find(s => s.section_id === 'self_pr');
  const selfPRContent = getSectionObjectContent(selfPRSection);
  const selfPR = Array.isArray(selfPRContent?.pr_points)
    ? formatSelfPR(selfPRContent.pr_points as PRPoint[])
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getSectionContent(section: unknown): unknown {
  if (!isRecord(section)) return undefined;
  return section.content;
}

/**
 * section.content を安全にテキスト化する。
 * - string の場合はそのまま返す
 * - { text: string } の場合は .text を返す
 * それ以外は ''。`'text' in string` の TypeError を防ぐため in 演算子使用前に型チェックする。
 */
function getSectionText(section: unknown): string {
  const content = getSectionContent(section);
  if (typeof content === 'string') return content;
  if (isRecord(content) && 'text' in content) {
    const t = (content as { text?: unknown }).text;
    return typeof t === 'string' ? t : '';
  }
  return '';
}

function getSectionObjectContent(section: unknown): Record<string, unknown> | null {
  const content = getSectionContent(section);
  return isRecord(content) ? content : null;
}

function formatRecommendationReasons(reasons: RecommendationReason[]): string {
  const lines: string[] = [];

  reasons.forEach((reason, idx) => {
    lines.push(`${idx + 1}. ${reason.heading}`);
    const text = reason.description || reason.content || '';
    lines.push(text);
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

function getConditionValueFromTable(rows: ConditionTableRow[], label: string): string {
  for (const row of rows) {
    // cells形式: { cells: [{ type: 'label', content }, { type: 'value', content }] }
    if (row.cells) {
      const labelCell = row.cells.find(c => c.type === 'label');
      const valueCell = row.cells.find(c => c.type === 'value');
      if (labelCell && valueCell && labelCell.content === label) {
        return valueCell.content;
      }
    }
    // item/detail形式: { item: '希望年収', detail: '500万円' }
    const simpleRow = row as unknown as { item?: string; detail?: string };
    if (simpleRow.item && simpleRow.detail && simpleRow.item === label) {
      return simpleRow.detail;
    }
  }
  return '';
}

function getConditionValueFromList(items: ConditionListItem[], label: string): string {
  const item = items.find(i => i.label === label);
  return item?.content || '';
}

function getConditionValue(rows: ConditionTableRow[], listItems: ConditionListItem[], label: string): string {
  if (rows.length > 0) {
    return getConditionValueFromTable(rows, label);
  }
  if (listItems.length > 0) {
    return getConditionValueFromList(listItems, label);
  }
  return '';
}

export function convertRecommendation(doc: RecommendationDocument): RecommendationBaseRecord {
  const candidateName = resolveCandidateName(doc.candidate_name);
  const creationDate =
    doc.creation_date || doc.created_date || (doc as unknown as { last_updated?: string }).last_updated || '';

  // Get sections by ID
  const findSection = (...ids: string[]) => doc.sections.find(s => ids.includes(s.section_id));

  // Text sections — 新旧 section_id と 文字列/オブジェクト両形式の content に対応
  const overviewSection = findSection('candidate_overview', 'overview');
  const overview = getSectionText(overviewSection);

  const reasonSection = findSection('reason_for_change', 'reason_for_job_change');
  const reason = getSectionText(reasonSection);

  // Recommendation reasons — 旧形式(content.reasons) と 新形式(section直下 list_items) を両対応
  const recReasonSection = findSection('recommendation_reason', 'recommendation_reasons');
  let recommendationReasons = '';
  let aspirationAndPotential = '';
  let overallAssessment = '';

  if (recReasonSection) {
    // 新形式: section 直下の list_items
    const topLevelListItems = (recReasonSection as unknown as {
      list_items?: Array<{ id?: string; title?: string; heading?: string; content?: string; description?: string }>;
    }).list_items;

    if (Array.isArray(topLevelListItems) && topLevelListItems.length > 0) {
      recommendationReasons = topLevelListItems
        .map((item, idx) => {
          const heading = item.title || item.heading || '';
          const text = item.content || item.description || '';
          return heading ? `${idx + 1}. ${heading}\n${text}` : text;
        })
        .join('\n\n');
    } else {
      const content = getSectionObjectContent(recReasonSection) as RecommendationReasonContent | null;
      if (!content) {
        recommendationReasons = '';
      } else {
        if (content.introduction && content.reasons) {
          recommendationReasons = content.introduction + '\n\n' + formatRecommendationReasons(content.reasons);
        } else if (content.reasons) {
          recommendationReasons = formatRecommendationReasons(content.reasons);
        }

        if (content.aspiration_and_potential) {
          aspirationAndPotential = `【${content.aspiration_and_potential.heading}】\n${content.aspiration_and_potential.content}`;
        }
        if (content.overall_assessment) {
          overallAssessment = `【${content.overall_assessment.heading}】\n${content.overall_assessment.content}`;
        }
      }
    }
  }

  // 志向性と将来性（独立セクション形式） — vision も新名称として対応
  if (!aspirationAndPotential) {
    const aspirationSection = findSection('candidate_aspiration', 'vision');
    aspirationAndPotential = getSectionText(aspirationSection);
  }

  // 総評（独立セクション形式） — total_review も新名称として対応
  if (!overallAssessment) {
    const assessmentSection = findSection('overall_assessment', 'total_review');
    const rawContent = getSectionContent(assessmentSection);
    if (typeof rawContent === 'string') {
      overallAssessment = rawContent;
    } else if (isRecord(rawContent)) {
      const content = rawContent as { text?: string; closing?: string };
      const parts: string[] = [];
      if (content.text) parts.push(content.text);
      if (content.closing) parts.push(content.closing);
      overallAssessment = parts.join('\n');
    }
  }

  // Conditions — セクション形式(table/list_items) と ドキュメント直下オブジェクト形式の両方に対応
  const conditionsSection = findSection('conditions');
  let conditionRows: ConditionTableRow[] = [];
  let conditionListItems: ConditionListItem[] = [];

  const conditionsContent = getSectionObjectContent(conditionsSection);
  if (conditionsContent) {
    const content = conditionsContent as {
      table?: { rows: ConditionTableRow[] };
      list_items?: ConditionListItem[];
    };
    if (content.table?.rows) conditionRows = content.table.rows;
    if (content.list_items) conditionListItems = content.list_items;
  }

  // ドキュメント直下の conditions オブジェクト（新形式）
  const topLevelConditions = (doc as unknown as { conditions?: Record<string, string> }).conditions;
  const hasTopLevelConditions =
    !!topLevelConditions &&
    typeof topLevelConditions === 'object' &&
    !Array.isArray(topLevelConditions);

  const topLevelConditionKeyMap: Record<string, string[]> = {
    希望年収: ['expected_annual_income', 'annual_income', 'income', 'salary'],
    転職時期: ['timing', 'start_timing', 'join_timing'],
    希望勤務地: ['location', 'work_location', 'preferred_location'],
    希望休日: ['holiday', 'holidays', 'days_off'],
    希望職種: ['occupation', 'job_type', 'position'],
    その他条件: ['others', 'other', 'remarks', 'notes'],
  };

  const legacyConditionLabelMap: Record<keyof typeof topLevelConditionKeyMap, string[]> = {
    希望年収: ['希望年収'],
    転職時期: ['転職時期', '入社希望時期', '希望時期'],
    希望勤務地: ['勤務地', '希望勤務地'],
    希望休日: ['休日', '希望休日'],
    希望職種: ['職種', '希望職種'],
    その他条件: ['その他', 'その他条件'],
  };

  const getConditionForLabel = (label: keyof typeof topLevelConditionKeyMap): string => {
    if (hasTopLevelConditions && topLevelConditions) {
      for (const key of topLevelConditionKeyMap[label]) {
        const v = topLevelConditions[key];
        if (typeof v === 'string' && v) return v;
      }
    }
    for (const legacyLabel of legacyConditionLabelMap[label]) {
      const value = getConditionValue(conditionRows, conditionListItems, legacyLabel);
      if (value) return value;
    }
    return '';
  };

  return {
    候補者名: candidateName,
    作成日: creationDate,
    候補者概要: overview,
    転職理由: reason,
    推薦理由: recommendationReasons,
    志向性と将来性: aspirationAndPotential,
    総評: overallAssessment,
    希望年収: getConditionForLabel('希望年収'),
    転職時期: getConditionForLabel('転職時期'),
    希望勤務地: getConditionForLabel('希望勤務地'),
    希望休日: getConditionForLabel('希望休日'),
    希望職種: getConditionForLabel('希望職種'),
    その他条件: getConditionForLabel('その他条件'),
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
    list_items?: { id: string; content: string }[];
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
  goals?: {
    id: string;
    heading: string;
    content: string;
    targets?: string[];
    initiatives?: string[];
    skills?: string[];
    roles?: string[];
    activities?: string[];
    conclusion?: string;
  }[];
  conclusion?: string;
  potentials?: { id: string; heading: string; content: string }[];
  summary?: { heading: string; content: string };
  roadmap?: {
    heading: string;
    table?: { rows?: { cells?: { content: string; type: string }[] }[] };
  };
  final_message?: string;
}

function formatPotentialsSection(content: CareerPlanSectionContent): string {
  const lines: string[] = [];

  if (content.text) {
    lines.push(content.text);
    lines.push('');
  }

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

  return lines.join('\n').trim();
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

  if (content.conclusion) {
    lines.push(content.conclusion);
  }

  return lines.join('\n').trim();
}

interface PeriodFields {
  目標: string;
  推奨職種: string;
  目標年収: string;
  習得すべきスキル: string;
  キャリア戦略: string;
}

function extractPeriodFields(section: unknown): PeriodFields {
  const empty: PeriodFields = { 目標: '', 推奨職種: '', 目標年収: '', 習得すべきスキル: '', キャリア戦略: '' };
  if (!isRecord(section) || !isRecord(section.content)) return empty;
  const c = section.content as CareerPlanSectionContent & {
    positions?: string[];
    income?: string;
    skills?: string[];
    strategy?: string;
  };

  const goal = c.goal || '';

  // 推奨職種: flat array or nested object
  let positions = '';
  if (Array.isArray(c.positions)) {
    positions = c.positions.map(p => `・${p}`).join('\n');
  } else if (c.recommended_positions?.list_items) {
    positions = c.recommended_positions.list_items.map(i => `・${i.content}`).join('\n');
  }

  // 目標年収
  let income = '';
  if (typeof c.income === 'string') {
    income = c.income;
  } else if (c.target_income) {
    income = c.target_income.content;
  }

  // 習得すべきスキル
  let skills = '';
  if (Array.isArray(c.skills)) {
    skills = c.skills.map(s => `・${s}`).join('\n');
  } else if (c.skills_to_acquire?.list_items) {
    skills = c.skills_to_acquire.list_items.map(i => `・${i.content}`).join('\n');
  }

  // キャリア戦略
  let strategy = '';
  if (typeof c.strategy === 'string') {
    strategy = c.strategy;
  } else if (c.career_strategy) {
    strategy = c.career_strategy.content;
  }

  return { 目標: goal, 推奨職種: positions, 目標年収: income, 習得すべきスキル: skills, キャリア戦略: strategy };
}

/**
 * セクション heading から副題（テーマ）を抽出する。
 * 例: "■ 短期目標(1〜2年)：新領域への適応と施工技術の拡張" → "新領域への適応と施工技術の拡張"
 * 全角「：」と半角「:」両対応。区切りがなければ空文字。
 */
function extractTheme(section: unknown): string {
  if (!isRecord(section)) return '';
  const heading = typeof section.heading === 'string' ? section.heading : '';
  const match = heading.match(/[：:]\s*(.+)$/);
  return match ? match[1].trim() : '';
}

export function convertCareerPlan(doc: CareerPlanDocument): CareerPlanBaseRecord {
  const candidateName = resolveCandidateName(doc.candidate_name);
  const creationDate = doc.creation_date || doc.created_date
    || doc.footer?.creation_date
    || (doc as unknown as { last_updated?: string }).last_updated || '';

  const findSection = (...ids: string[]) => doc.sections.find(s => ids.includes(s.section_id));

  // はじめに
  const introSection = findSection('introduction', 'career_vision');
  const introduction = getSectionText(introSection);

  // 各期間のセクション
  const shortSection = findSection('short_term', 'short_term_plan');
  const midSection = findSection('mid_term', 'mid_term_plan');
  const longSection = findSection('long_term', 'long_term_plan');

  // 各期間のフィールド抽出
  const short = extractPeriodFields(shortSection);
  const mid = extractPeriodFields(midSection);
  const long = extractPeriodFields(longSection);

  // テーマ（heading 副題）
  const shortTheme = extractTheme(shortSection);
  const midTheme = extractTheme(midSection);
  const longTheme = extractTheme(longSection);

  // ポテンシャル — content.potentials(旧) / section直下 list_items(新) を両対応
  const potentialSection = findSection('hidden_potential', 'potential');
  let potentials = '';
  if (potentialSection) {
    const topListItems = (potentialSection as unknown as {
      list_items?: Array<{ id?: string; title?: string; heading?: string; content?: string }>;
    }).list_items;

    if (Array.isArray(topListItems) && topListItems.length > 0) {
      potentials = topListItems
        .map((item, idx) => {
          const heading = item.title || item.heading || '';
          const text = item.content || '';
          return heading ? `${idx + 1}. ${heading}\n${text}` : text;
        })
        .join('\n\n');
    } else if (isRecord(potentialSection) && isRecord(potentialSection.content)) {
      potentials = formatPotentialsSection(potentialSection.content as CareerPlanSectionContent);
    }
  }

  // 総括 — ドキュメント直下の summary.text または conclusion セクション
  const topSummary = (doc as unknown as { summary?: { text?: string } }).summary;
  let summaryText = '';
  if (topSummary && typeof topSummary.text === 'string') {
    summaryText = topSummary.text;
  } else {
    const summarySection = findSection('conclusion', 'summary');
    if (summarySection && isRecord(summarySection) && isRecord(summarySection.content)) {
      summaryText = formatConclusionSection(summarySection.content as CareerPlanSectionContent);
    }
  }

  // ロードマップ目標 — summary.roadmap_table から phase をキーに引き当て
  const topRoadmapTable = (doc as unknown as {
    summary?: { roadmap_table?: Array<{ phase: string; period?: string; goal?: string; income?: string }> };
  }).summary?.roadmap_table;
  const roadmapGoal = (phaseKey: string): string => {
    if (!Array.isArray(topRoadmapTable)) return '';
    const row = topRoadmapTable.find(r => typeof r.phase === 'string' && r.phase.includes(phaseKey));
    return row?.goal || '';
  };
  const shortRoadmapGoal = roadmapGoal('短期');
  const midRoadmapGoal = roadmapGoal('中期');
  const longRoadmapGoal = roadmapGoal('長期');

  // まとめ closing text
  let closing = '';
  const topFinalMsg = (doc as unknown as { summary?: { final_message?: string } }).summary;
  if (topFinalMsg && typeof topFinalMsg.final_message === 'string') {
    closing = topFinalMsg.final_message;
  }

  return {
    候補者名: candidateName,
    作成日: creationDate,
    はじめに: introduction,
    短期_テーマ: shortTheme,
    短期_目標: short.目標,
    短期_推奨職種: short.推奨職種,
    短期_目標年収: short.目標年収,
    短期_習得すべきスキル: short.習得すべきスキル,
    短期_キャリア戦略: short.キャリア戦略,
    短期_ロードマップ目標: shortRoadmapGoal,
    中期_テーマ: midTheme,
    中期_目標: mid.目標,
    中期_推奨職種: mid.推奨職種,
    中期_目標年収: mid.目標年収,
    中期_習得すべきスキル: mid.習得すべきスキル,
    中期_キャリア戦略: mid.キャリア戦略,
    中期_ロードマップ目標: midRoadmapGoal,
    長期_テーマ: longTheme,
    長期_目標: long.目標,
    長期_推奨職種: long.推奨職種,
    長期_目標年収: long.目標年収,
    長期_習得すべきスキル: long.習得すべきスキル,
    長期_キャリア戦略: long.キャリア戦略,
    長期_ロードマップ目標: longRoadmapGoal,
    ポテンシャル: potentials,
    総括: summaryText,
    まとめ: closing,
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

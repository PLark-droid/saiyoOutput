import { describe, it, expect } from 'vitest';
import {
  detectDocumentType,
  validateDocument,
  convertCareerHistory,
  convertRecommendation,
  convertCareerPlan,
  convertDocument,
} from '../utils/documentConverter';
import type {
  CareerHistoryDocument,
  RecommendationDocument,
  CareerPlanDocument,
} from '../types/documents';

// テスト用サンプルデータ
const sampleCareerHistory: CareerHistoryDocument = {
  document_type: '職務経歴書',
  last_updated: '2025年12月23日現在',
  candidate_name: {
    value: '山田太郎',
    format: 'no_space_between_name',
  },
  sections: [
    {
      section_id: 'summary',
      heading: '■職務要約',
      heading_level: 'heading1',
      content: {
        text: 'テスト用の職務要約テキストです。',
        max_length: 400,
      },
    },
    {
      section_id: 'work_history',
      heading: '■職務経歴',
      heading_level: 'heading1',
      companies: [
        {
          company_id: 'company_1',
          table: {
            format: 'two_column',
            rows: [
              {
                row_type: 'period_and_company',
                cells: [
                  { type: 'period', content: '2020年1月〜2024年12月', width: '30%' },
                  {
                    type: 'company_info',
                    content: {
                      company_name: '株式会社テスト',
                      employment_type: '正社員として勤務',
                      company_details: {
                        business: '事業内容:IT事業',
                        capital: '資本金:1億円',
                        revenue: '売上高:100億円',
                        employees: '従業員数:500人',
                        listing: '上場:東証プライム上場',
                      },
                    },
                    width: '70%',
                  },
                ],
              },
              {
                row_type: 'department_and_duties',
                cells: [
                  { type: 'period', content: '2020年1月〜2024年12月', width: '30%' },
                  {
                    type: 'details',
                    content: {
                      department: '開発部',
                      業務内容: {
                        list_items: [
                          { id: 'duty_1', content: 'システム開発' },
                          { id: 'duty_2', content: 'コードレビュー' },
                        ],
                      },
                      主な実績: {
                        list_items: [
                          { id: 'achievement_1', content: '売上向上', metrics: '前年比20%増' },
                        ],
                      },
                      主な取り組み: {
                        list_items: [
                          { id: 'initiative_1', content: 'CI/CD導入' },
                        ],
                      },
                    },
                    width: '70%',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
  footer: {
    text: '以上',
    alignment: 'right',
  },
};

const sampleRecommendation: RecommendationDocument = {
  document_type: '推薦文',
  candidate_name: '山田太郎',
  creation_date: '2025年12月23日',
  sections: [
    {
      section_id: 'candidate_overview',
      heading: '■候補者概要',
      heading_level: 'heading1',
      content: { text: '山田様は優秀な人材です。' },
    },
    {
      section_id: 'reason_for_job_change',
      heading: '■転職理由',
      heading_level: 'heading1',
      content: { text: 'キャリアアップのため。' },
    },
    {
      section_id: 'recommendation_reason',
      heading: '■推薦理由',
      heading_level: 'heading1',
      content: {
        introduction: '以下の理由で推薦します。',
        reasons: [
          { id: 'reason_1', heading: '1. 技術力', content: '高い技術力を持っています。' },
        ],
      },
    },
    {
      section_id: 'summary',
      heading: '■まとめ',
      heading_level: 'heading1',
      content: { text: '強く推薦します。' },
    },
    {
      section_id: 'conditions',
      heading: '■条件面',
      heading_level: 'heading1',
      content: {
        table: {
          rows: [
            { item: '希望年収', detail: '500万円以上' },
            { item: '入社希望時期', detail: '2025年4月' },
            { item: '勤務地', detail: '東京都内' },
            { item: '休日', detail: '土日祝日休み' },
            { item: '働き方', detail: 'リモートワーク希望' },
            { item: '職種', detail: 'エンジニア' },
            { item: 'その他', detail: '特になし' },
          ],
        },
      },
    },
  ],
  footer: {
    recommender: 'テストアドバイザー',
    creation_date: '2025年12月23日',
  },
};

const sampleRecommendationNewFormat: RecommendationDocument = {
  document_type: '推薦文',
  last_updated: '2026年4月9日',
  candidate_name: '石原智幸',
  sections: [
    {
      section_id: 'overview',
      heading: '■ 候補者概要',
      content: '石原様は...',
    },
    {
      section_id: 'reason_for_job_change',
      heading: '■ 転職理由',
      content: '現職での「番頭」業務...',
    },
    {
      section_id: 'recommendation_reasons',
      heading: '■ 推薦理由',
      list_items: [
        { id: 'rec_1', title: '圧倒的な安全管理実績', content: '...' },
        { id: 'rec_2', title: '一気通貫で...', content: '...' },
        { id: 'rec_3', title: '誠実な...', content: '...' },
      ],
    },
    {
      section_id: 'vision',
      heading: '### 志向性と将来性',
      content: '石原様は...',
    },
    {
      section_id: 'total_review',
      heading: '### 総評',
      content: '人間性...',
    },
  ],
  conditions: {
    expected_annual_income: '800万円〜900万円',
    timing: '決定後1〜2ヶ月',
    location: '練馬区から30分圏内',
    holiday: '完全週休二日制',
    occupation: '施工管理',
    others: '転勤なし',
  },
};

const sampleCareerPlan: CareerPlanDocument = {
  document_type: 'キャリアプラン',
  candidate_name: '山田太郎',
  creation_date: '2025年12月23日',
  sections: [
    {
      section_id: 'career_vision',
      heading: '■キャリアビジョン',
      heading_level: 'heading1',
      content: { text: 'リーダーとして活躍したい。' },
    },
    {
      section_id: 'short_term_plan',
      heading: '■短期計画',
      heading_level: 'heading1',
      content: {
        introduction: '短期的な目標です。',
        goals: [
          {
            id: 'goal_1',
            heading: '1. スキルアップ',
            content: '技術力を向上させる。',
            targets: ['資格取得', 'プロジェクト完遂'],
          },
        ],
        conclusion: '以上が短期計画です。',
      },
    },
    {
      section_id: 'mid_term_plan',
      heading: '■中期計画',
      heading_level: 'heading1',
      content: {
        introduction: '中期的な目標です。',
        goals: [
          {
            id: 'goal_1',
            heading: '1. マネジメント',
            content: 'チームリーダーになる。',
            initiatives: ['メンバー育成', 'プロジェクト管理'],
          },
        ],
        conclusion: '以上が中期計画です。',
      },
    },
    {
      section_id: 'long_term_plan',
      heading: '■長期計画',
      heading_level: 'heading1',
      content: {
        introduction: '長期的な目標です。',
        goals: [
          {
            id: 'goal_1',
            heading: '1. 経営参画',
            content: '経営層として活躍する。',
            roles: ['CTO', '技術顧問'],
          },
        ],
        conclusion: '以上が長期計画です。',
      },
    },
    {
      section_id: 'potential',
      heading: '■ポテンシャル',
      heading_level: 'heading1',
      content: {
        introduction: '以下の可能性があります。',
        potentials: [
          { id: 'potential_1', heading: '1. 技術リーダー', content: '技術リーダーとしての素質がある。' },
        ],
      },
    },
    {
      section_id: 'summary',
      heading: '■まとめ',
      heading_level: 'heading1',
      content: { text: '成長が期待できる人材です。' },
    },
  ],
  footer: {
    author: 'テストアドバイザー',
    creation_date: '2025年12月23日',
  },
};

const sampleCareerPlanNewFormat: CareerPlanDocument = {
  document_type: 'キャリアプラン',
  candidate_name: {
    value: '田中太郎',
    display: '田中 太郎',
  },
  created_date: '2026年3月3日',
  sections: [
    {
      section_id: 'career_vision',
      heading: '■キャリアビジョン',
      heading_level: 'heading1',
      content: { text: '事業成長を支えるPMになりたい。' },
    },
    {
      section_id: 'short_term',
      heading: '■短期計画',
      heading_level: 'heading1',
      content: {
        phase: '短期',
        goal: 'PM補佐として案件推進力を高める',
        recommended_positions: {
          heading: '推奨ポジション',
          list_items: [
            { id: 'position_1', content: 'プロジェクトリーダー' },
          ],
        },
      },
    },
    {
      section_id: 'mid_term',
      heading: '■中期計画',
      heading_level: 'heading1',
      content: {
        phase: '中期',
        goal: '複数案件の統括を担う',
        skills_to_acquire: {
          heading: '習得スキル',
          list_items: [
            { id: 'skill_1', content: '予実管理' },
          ],
        },
      },
    },
    {
      section_id: 'long_term',
      heading: '■長期計画',
      heading_level: 'heading1',
      content: {
        phase: '長期',
        goal: '事業責任者として組織を牽引する',
        career_strategy: {
          heading: 'キャリア戦略',
          content: '新規事業と既存事業の両方を経験する。',
        },
      },
    },
    {
      section_id: 'hidden_potential',
      heading: '■ポテンシャル',
      heading_level: 'heading1',
      content: {
        introduction: '面談から見える強みです。',
      },
    },
    {
      section_id: 'conclusion',
      heading: '■まとめ',
      heading_level: 'heading1',
      content: {
        text: '段階的な成長が期待できます。',
        roadmap: {
          heading: 'キャリアロードマップ',
          table: {
            rows: [
              {
                cells: [
                  { type: 'term', content: '1年後' },
                  { type: 'goal', content: 'PLとして案件推進' },
                ],
              },
            ],
          },
        },
      },
    },
  ],
};

const sampleCareerPlanStringIntro = {
  document_type: 'キャリアプラン',
  candidate_name: '佐藤花子',
  creation_date: '2026年4月9日',
  sections: [
    {
      section_id: 'introduction',
      heading: '■ はじめに',
      content: '文字列のイントロダクション',
    },
    {
      section_id: 'short_term',
      heading: '■ 短期計画',
      content: {
        text: '短期計画',
      },
    },
    {
      section_id: 'mid_term',
      heading: '■ 中期計画',
      content: {
        text: '中期計画',
      },
    },
    {
      section_id: 'long_term',
      heading: '■ 長期計画',
      content: {
        text: '長期計画',
      },
    },
    {
      section_id: 'potential',
      heading: '■ ポテンシャル',
      content: {
        text: 'ポテンシャル',
      },
    },
    {
      section_id: 'summary',
      heading: '■ まとめ',
      content: {
        text: 'まとめ',
      },
    },
  ],
} as CareerPlanDocument;

describe('detectDocumentType', () => {
  it('職務経歴書を正しく検出する', () => {
    expect(detectDocumentType(sampleCareerHistory)).toBe('職務経歴書');
  });

  it('推薦文を正しく検出する', () => {
    expect(detectDocumentType(sampleRecommendation)).toBe('推薦文');
  });

  it('キャリアプランを正しく検出する', () => {
    expect(detectDocumentType(sampleCareerPlan)).toBe('キャリアプラン');
  });

  it('不正なドキュメントはnullを返す', () => {
    expect(detectDocumentType({})).toBeNull();
    expect(detectDocumentType({ document_type: '不正' })).toBeNull();
    expect(detectDocumentType(null)).toBeNull();
    expect(detectDocumentType('string')).toBeNull();
  });
});

describe('validateDocument', () => {
  it('有効な職務経歴書を検証する', () => {
    const result = validateDocument(sampleCareerHistory);
    expect(result).not.toBeNull();
    expect(result?.document_type).toBe('職務経歴書');
  });

  it('sectionsがないドキュメントはnullを返す', () => {
    const invalid = { document_type: '職務経歴書' };
    expect(validateDocument(invalid)).toBeNull();
  });
});

describe('convertCareerHistory', () => {
  it('職務経歴書を正しく変換する', () => {
    const result = convertCareerHistory(sampleCareerHistory);

    expect(result.候補者名).toBe('山田太郎');
    expect(result.最終更新日).toBe('2025年12月23日現在');
    expect(result.職務要約).toBe('テスト用の職務要約テキストです。');
    expect(result.会社数).toBe(1);
    // 会社1の詳細フィールドを確認
    expect(result.会社名_会社1).toBe('株式会社テスト');
    expect(result.期間_会社1).toBe('2020年1月〜2024年12月');
    expect(result.雇用形態_会社1).toBe('正社員');
    expect(result.部署_会社1).toBe('開発部');
    expect(result.業務内容_会社1).toContain('システム開発');
    expect(result.主な実績_会社1).toContain('売上向上');
    expect(result.主な取り組み_会社1).toContain('CI/CD導入');
    // 会社2のフィールドは存在しない（1社のみのデータなので）
    expect(result.会社名_会社2).toBeUndefined();
    expect(result.元データJSON).toContain('"document_type": "職務経歴書"');
  });
});

describe('convertRecommendation', () => {
  it('推薦文を正しく変換する', () => {
    const result = convertRecommendation(sampleRecommendation);

    expect(result.候補者名).toBe('山田太郎');
    expect(result.作成日).toBe('2025年12月23日');
    expect(result.候補者概要).toBe('山田様は優秀な人材です。');
    expect(result.転職理由).toBe('キャリアアップのため。');
    expect(result.推薦理由).toContain('技術力');
    expect(result.希望年収).toBe('500万円以上');
    expect(result.希望勤務地).toBe('東京都内');
  });

  it('新形式の推薦文でも文字列contentで落ちずに変換する', () => {
    expect(() => convertRecommendation(sampleRecommendationNewFormat)).not.toThrow();

    const result = convertRecommendation(sampleRecommendationNewFormat);

    expect(result.候補者名).toBe('石原智幸');
    expect(result.作成日).toBe('2026年4月9日');
    expect(result.候補者概要).toBe('石原様は...');
    expect(result.転職理由).toBe('現職での「番頭」業務...');
    expect(result.推薦理由).toContain('圧倒的な安全管理実績');
    expect(result.志向性と将来性).toBe('石原様は...');
    expect(result.総評).toBe('人間性...');
    expect(result.希望年収).toBe('800万円〜900万円');
    expect(result.転職時期).toBe('決定後1〜2ヶ月');
    expect(result.希望勤務地).toBe('練馬区から30分圏内');
    expect(result.希望休日).toBe('完全週休二日制');
    expect(result.希望職種).toBe('施工管理');
    expect(result.その他条件).toBe('転勤なし');
  });
});

describe('convertCareerPlan', () => {
  it('キャリアプランを正しく変換する（旧goals形式）', () => {
    const result = convertCareerPlan(sampleCareerPlan);

    expect(result.候補者名).toBe('山田太郎');
    expect(result.作成日).toBe('2025年12月23日');
    expect(result.はじめに).toBeDefined();
    expect(result.ポテンシャル).toBeDefined();
    expect(result.総括).toBeDefined();
  });

  it('新形式のキャリアプランでサブフィールドに分割変換する', () => {
    const result = convertCareerPlan(sampleCareerPlanNewFormat);

    expect(result.候補者名).toBe('田中 太郎');
    expect(result.作成日).toBe('2026年3月3日');
    expect(result.はじめに).toBe('事業成長を支えるPMになりたい。');
    expect(result.短期_目標).toBe('PM補佐として案件推進力を高める');
    expect(result.短期_推奨職種).toContain('プロジェクトリーダー');
    expect(result.中期_目標).toBe('複数案件の統括を担う');
    expect(result.中期_習得すべきスキル).toContain('予実管理');
    expect(result.長期_キャリア戦略).toContain('新規事業と既存事業の両方を経験する。');
    expect(result.ポテンシャル).toContain('面談から見える強みです。');
    expect(result.キャリアロードマップ).toContain('1年後 | PLとして案件推進');
  });

  it('文字列contentのイントロダクションでもエラーなく変換する', () => {
    const result = convertCareerPlan(sampleCareerPlanStringIntro);
    expect(result.はじめに).toBe('文字列のイントロダクション');
  });

  it('flat形式(positions/income/skills/strategy)を正しく分割する', () => {
    const flatDoc: CareerPlanDocument = {
      document_type: 'キャリアプラン',
      candidate_name: '石原智幸',
      sections: [
        {
          section_id: 'introduction',
          heading: '■ はじめに',
          content: 'テスト',
        } as any,
        {
          section_id: 'short_term',
          heading: '■ 短期目標',
          heading_level: 'heading1',
          content: {
            phase: '短期(1〜2年)',
            goal: '信頼を築く',
            positions: ['施工管理主任候補', '現場責任者'],
            income: '800万円〜850万円',
            skills: ['施工工法の習得', 'リレーション構築'],
            strategy: '段取り力を活かす。',
          },
        },
      ],
    } as CareerPlanDocument;

    const result = convertCareerPlan(flatDoc);
    expect(result.短期_目標).toBe('信頼を築く');
    expect(result.短期_推奨職種).toBe('・施工管理主任候補\n・現場責任者');
    expect(result.短期_目標年収).toBe('800万円〜850万円');
    expect(result.短期_習得すべきスキル).toContain('施工工法の習得');
    expect(result.短期_キャリア戦略).toBe('段取り力を活かす。');
  });

  it('ドキュメント直下のsummaryから総括・ロードマップを取得する', () => {
    const docWithTopSummary = {
      document_type: 'キャリアプラン',
      candidate_name: '石原智幸',
      last_updated: '2026年4月9日',
      sections: [
        { section_id: 'introduction', heading: '■', content: 'intro' },
      ],
      summary: {
        text: '石原様のキャリアは美しく繋がっています。',
        roadmap_table: [
          { phase: '短期', period: '1〜2年', goal: '信頼確立', income: '800万円' },
        ],
      },
    } as unknown as CareerPlanDocument;

    const result = convertCareerPlan(docWithTopSummary);
    expect(result.総括).toBe('石原様のキャリアは美しく繋がっています。');
    expect(result.キャリアロードマップ).toContain('短期 | 1〜2年 | 信頼確立 | 800万円');
  });
});

describe('convertDocument', () => {
  it('職務経歴書を統合変換する', () => {
    const result = convertDocument(sampleCareerHistory);
    expect(result.type).toBe('職務経歴書');
    expect('候補者名' in result.record).toBe(true);
  });

  it('推薦文を統合変換する', () => {
    const result = convertDocument(sampleRecommendation);
    expect(result.type).toBe('推薦文');
    expect('候補者概要' in result.record).toBe(true);
  });

  it('新形式の推薦文を統合変換する', () => {
    const result = convertDocument(sampleRecommendationNewFormat);
    expect(result.type).toBe('推薦文');
    expect('候補者概要' in result.record).toBe(true);
  });

  it('キャリアプランを統合変換する', () => {
    const result = convertDocument(sampleCareerPlan);
    expect(result.type).toBe('キャリアプラン');
    expect('はじめに' in result.record).toBe(true);
  });
});

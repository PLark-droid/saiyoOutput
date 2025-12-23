/**
 * Lark Baseテーブルにフィールドを自動作成するスクリプト
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

// 環境変数から取得（.envファイルの値）
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'HQvXbaPaZa2fmps3S1ljetSPptb';

// テーブルID
const CAREER_HISTORY_TABLE_ID = 'tblHFpN69pkfWFQH';
const RECOMMENDATION_TABLE_ID = 'tbl1p68N0kh3qjtc';
const CAREER_PLAN_TABLE_ID = 'tblAwm7SyYcgWPxx';

// フィールド定義
const careerHistoryFields = [
  { field_name: '候補者名', type: 1 }, // 1 = テキスト
  { field_name: '最終更新日', type: 1 },
  { field_name: '職務要約', type: 1 },
  { field_name: '職務経歴_会社1', type: 1 },
  { field_name: '職務経歴_会社2', type: 1 },
  { field_name: '職務経歴_会社3', type: 1 },
  { field_name: '職務経歴_会社4', type: 1 },
  { field_name: '職務経歴_会社5', type: 1 },
  { field_name: '職務経歴_その他', type: 1 },
  { field_name: '会社数', type: 2 }, // 2 = 数値
  { field_name: '元データJSON', type: 1 },
];

const recommendationFields = [
  { field_name: '候補者名', type: 1 },
  { field_name: '作成日', type: 1 },
  { field_name: '候補者概要', type: 1 },
  { field_name: '転職理由', type: 1 },
  { field_name: '推薦理由', type: 1 },
  { field_name: 'まとめ', type: 1 },
  { field_name: '希望年収', type: 1 },
  { field_name: '入社希望時期', type: 1 },
  { field_name: '希望勤務地', type: 1 },
  { field_name: '希望休日', type: 1 },
  { field_name: '希望働き方', type: 1 },
  { field_name: '希望職種', type: 1 },
  { field_name: 'その他条件', type: 1 },
  { field_name: '推薦者', type: 1 },
  { field_name: '元データJSON', type: 1 },
];

const careerPlanFields = [
  { field_name: '候補者名', type: 1 },
  { field_name: '作成日', type: 1 },
  { field_name: 'キャリアビジョン', type: 1 },
  { field_name: '短期計画', type: 1 },
  { field_name: '中期計画', type: 1 },
  { field_name: '長期計画', type: 1 },
  { field_name: 'ポテンシャル', type: 1 },
  { field_name: 'まとめ', type: 1 },
  { field_name: '作成者', type: 1 },
  { field_name: '元データJSON', type: 1 },
];

async function getAccessToken(): Promise<string> {
  const response = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });

  if (response.data.code !== 0) {
    throw new Error(`Failed to get access token: ${response.data.msg}`);
  }

  return response.data.tenant_access_token;
}

async function createField(
  token: string,
  tableId: string,
  field: { field_name: string; type: number }
): Promise<void> {
  try {
    const response = await axios.post(
      `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${tableId}/fields`,
      field,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code === 0) {
      console.log(`  ✓ ${field.field_name}`);
    } else {
      console.log(`  ✗ ${field.field_name}: ${response.data.msg}`);
    }
  } catch (error: any) {
    console.log(`  ✗ ${field.field_name}: ${error.response?.data?.msg || error.message}`);
  }
}

async function createFieldsForTable(
  token: string,
  tableName: string,
  tableId: string,
  fields: { field_name: string; type: number }[]
): Promise<void> {
  console.log(`\n📋 ${tableName} (${tableId})`);
  console.log('─'.repeat(40));

  for (const field of fields) {
    await createField(token, tableId, field);
    // Rate limit対策
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function main() {
  console.log('🚀 Lark Baseフィールド作成開始\n');

  try {
    const token = await getAccessToken();
    console.log('✓ アクセストークン取得成功');

    await createFieldsForTable(token, '職務経歴書', CAREER_HISTORY_TABLE_ID, careerHistoryFields);
    await createFieldsForTable(token, '推薦文', RECOMMENDATION_TABLE_ID, recommendationFields);
    await createFieldsForTable(token, 'キャリアプラン', CAREER_PLAN_TABLE_ID, careerPlanFields);

    console.log('\n✅ フィールド作成完了！');
  } catch (error) {
    console.error('❌ エラー:', error);
    process.exit(1);
  }
}

main();

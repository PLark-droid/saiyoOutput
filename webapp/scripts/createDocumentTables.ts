/**
 * 推薦文・キャリアプランテーブルを作成し、フィールドを追加するスクリプト
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

// 認証情報（createLarkFields.tsから取得）
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'HQvXbaPaZa2fmps3S1ljetSPptb';

// フィールド定義
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

async function listTables(token: string): Promise<{ table_id: string; name: string }[]> {
  const response = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.data.code !== 0) {
    throw new Error(`Failed to list tables: ${response.data.msg}`);
  }

  return response.data.data.items || [];
}

async function createTable(token: string, tableName: string): Promise<string> {
  const response = await axios.post(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables`,
    {
      table: {
        name: tableName,
        default_view_name: 'Grid View',
        fields: [
          { field_name: '候補者名', type: 1 }, // 最低1フィールド必要
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.data.code !== 0) {
    throw new Error(`Failed to create table "${tableName}": ${response.data.msg}`);
  }

  return response.data.data.table_id;
}

async function addField(
  token: string,
  tableId: string,
  field: { field_name: string; type: number }
): Promise<boolean> {
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
      console.log(`    ✓ ${field.field_name}`);
      return true;
    } else if (response.data.code === 1254043) {
      // フィールドが既に存在
      console.log(`    - ${field.field_name} (既存)`);
      return true;
    } else {
      console.log(`    ✗ ${field.field_name}: ${response.data.msg}`);
      return false;
    }
  } catch (error: any) {
    console.log(`    ✗ ${field.field_name}: ${error.response?.data?.msg || error.message}`);
    return false;
  }
}

async function setupTable(
  token: string,
  tableName: string,
  fields: { field_name: string; type: number }[],
  existingTables: { table_id: string; name: string }[]
): Promise<string> {
  console.log(`\n📋 ${tableName}`);
  console.log('─'.repeat(50));

  // 既存テーブルを確認
  const existing = existingTables.find((t) => t.name === tableName);
  let tableId: string;

  if (existing) {
    console.log(`  テーブル既存: ${existing.table_id}`);
    tableId = existing.table_id;
  } else {
    console.log('  テーブル作成中...');
    tableId = await createTable(token, tableName);
    console.log(`  ✓ テーブル作成完了: ${tableId}`);
  }

  // フィールド追加
  console.log('  フィールド追加中...');
  for (const field of fields) {
    await addField(token, tableId, field);
    await new Promise((r) => setTimeout(r, 150)); // Rate limit対策
  }

  return tableId;
}

async function main() {
  console.log('🚀 LarkBase テーブル・フィールド作成スクリプト');
  console.log('='.repeat(50));

  try {
    // アクセストークン取得
    const token = await getAccessToken();
    console.log('✓ アクセストークン取得成功\n');

    // 既存テーブル一覧取得
    console.log('📂 既存テーブル確認中...');
    const existingTables = await listTables(token);
    existingTables.forEach((t) => console.log(`  - ${t.name} (${t.table_id})`));

    // 推薦文テーブル
    const recommendationTableId = await setupTable(
      token,
      '推薦文',
      recommendationFields,
      existingTables
    );

    // キャリアプランテーブル
    const careerPlanTableId = await setupTable(
      token,
      'キャリアプラン',
      careerPlanFields,
      existingTables
    );

    // 結果出力
    console.log('\n' + '='.repeat(50));
    console.log('✅ セットアップ完了！\n');
    console.log('📝 .env.local に以下を追加してください:\n');
    console.log(`VITE_LARK_RECOMMENDATION_TABLE_ID=${recommendationTableId}`);
    console.log(`VITE_LARK_CAREER_PLAN_TABLE_ID=${careerPlanTableId}`);
    console.log('');
  } catch (error) {
    console.error('\n❌ エラー:', error);
    process.exit(1);
  }
}

main();

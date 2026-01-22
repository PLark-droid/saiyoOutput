/**
 * 正しいBaseの推薦文テーブルにフィールドを追加
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';
const RECOMMENDATION_TABLE_ID = 'tbl1p68N0kh3qjtc';

// 追加するフィールド
const recommendationFields = [
  { field_name: '候補者名', type: 1 },
  { field_name: '作成日', type: 1 },
  { field_name: '候補者概要', type: 1 },
  { field_name: '転職理由', type: 1 },
  { field_name: '推薦理由', type: 1 },
  { field_name: '志向性と将来性', type: 1 },
  { field_name: '総評', type: 1 },
  { field_name: '希望年収', type: 1 },
  { field_name: '転職時期', type: 1 },
  { field_name: '希望勤務地', type: 1 },
  { field_name: '希望休日', type: 1 },
  { field_name: '希望職種', type: 1 },
  { field_name: 'その他条件', type: 1 },
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

async function getExistingFields(token: string): Promise<string[]> {
  const response = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${RECOMMENDATION_TABLE_ID}/fields`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.data.code !== 0) {
    throw new Error(`Failed to get fields: ${response.data.msg}`);
  }

  return response.data.data.items.map((f: any) => f.field_name);
}

async function addField(
  token: string,
  field: { field_name: string; type: number }
): Promise<void> {
  try {
    const response = await axios.post(
      `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${RECOMMENDATION_TABLE_ID}/fields`,
      field,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.code === 0) {
      console.log(`  ✓ ${field.field_name} (新規追加)`);
    } else if (response.data.code === 1254043) {
      console.log(`  - ${field.field_name} (既存)`);
    } else {
      console.log(`  ✗ ${field.field_name}: ${response.data.msg}`);
    }
  } catch (error: any) {
    console.log(`  ✗ ${field.field_name}: ${error.response?.data?.msg || error.message}`);
  }
}

async function main() {
  console.log('📋 正しいBaseの推薦文テーブルにフィールド追加');
  console.log('='.repeat(50));
  console.log(`Base: ${BASE_APP_TOKEN}`);
  console.log(`Table: ${RECOMMENDATION_TABLE_ID}\n`);

  try {
    const token = await getAccessToken();
    console.log('✓ アクセストークン取得成功\n');

    // 既存フィールド確認
    const existingFields = await getExistingFields(token);
    console.log('既存フィールド:', existingFields.join(', '));
    console.log('');

    // フィールド追加
    console.log('フィールド追加中...');
    for (const field of recommendationFields) {
      await addField(token, field);
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('\n✅ 完了');
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

main();

/**
 * 推薦文テーブルに不足フィールドを追加するスクリプト
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'HQvXbaPaZa2fmps3S1ljetSPptb';
const RECOMMENDATION_TABLE_ID = 'tbl9jMjqRk0nZN6t';

// 追加するフィールド
const newFields = [
  { field_name: '志向性と将来性', type: 1 },
  { field_name: '総評', type: 1 },
  { field_name: '転職時期', type: 1 },
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
      console.log(`✓ ${field.field_name}`);
    } else if (response.data.code === 1254043) {
      console.log(`- ${field.field_name} (既存)`);
    } else {
      console.log(`✗ ${field.field_name}: ${response.data.msg}`);
    }
  } catch (error: any) {
    console.log(`✗ ${field.field_name}: ${error.response?.data?.msg || error.message}`);
  }
}

async function main() {
  console.log('📋 推薦文テーブルにフィールド追加\n');

  const token = await getAccessToken();
  console.log('✓ アクセストークン取得成功\n');

  for (const field of newFields) {
    await addField(token, field);
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log('\n✅ 完了');
}

main();

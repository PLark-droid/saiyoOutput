/**
 * 正しいBaseのテーブル一覧を確認
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';

// ユーザーが見ているBase
const CORRECT_BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';

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

async function listTables(token: string): Promise<void> {
  console.log(`\n📂 Base: ${CORRECT_BASE_APP_TOKEN}`);
  console.log('─'.repeat(50));

  const response = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${CORRECT_BASE_APP_TOKEN}/tables`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.data.code !== 0) {
    console.error('❌ テーブル取得失敗:', response.data.msg);
    return;
  }

  const tables = response.data.data.items || [];
  console.log(`テーブル数: ${tables.length}\n`);

  for (const table of tables) {
    console.log(`📋 ${table.name}`);
    console.log(`   ID: ${table.table_id}`);
    console.log('');
  }

  console.log('─'.repeat(50));
  console.log('\n📝 .env.local に設定すべき値:\n');
  console.log(`VITE_LARK_BASE_APP_TOKEN=${CORRECT_BASE_APP_TOKEN}`);

  for (const table of tables) {
    if (table.name === '職務経歴書') {
      console.log(`VITE_LARK_CAREER_HISTORY_TABLE_ID=${table.table_id}`);
    } else if (table.name === '推薦文') {
      console.log(`VITE_LARK_RECOMMENDATION_TABLE_ID=${table.table_id}`);
    } else if (table.name === 'キャリアプラン') {
      console.log(`VITE_LARK_CAREER_PLAN_TABLE_ID=${table.table_id}`);
    }
  }
}

async function main() {
  console.log('🔍 正しいBaseの確認');
  console.log('='.repeat(50));

  try {
    const token = await getAccessToken();
    console.log('✓ アクセストークン取得成功');

    await listTables(token);

  } catch (error: any) {
    console.error('❌ エラー:', error.response?.data || error.message);
  }
}

main();

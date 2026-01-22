/**
 * 推薦文インポートのデバッグスクリプト
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'HQvXbaPaZa2fmps3S1ljetSPptb';
const RECOMMENDATION_TABLE_ID = 'tbl9jMjqRk0nZN6t';

// テスト用の推薦文レコード
const testRecord = {
  候補者名: 'テスト太郎',
  作成日: '2024年1月1日',
  候補者概要: 'テスト候補者概要',
  転職理由: 'テスト転職理由',
  推薦理由: 'テスト推薦理由',
  志向性と将来性: 'テスト志向性',
  総評: 'テスト総評',
  希望年収: '500万円',
  転職時期: '即日',
  希望勤務地: '東京',
  希望休日: '土日祝',
  希望職種: 'エンジニア',
  その他条件: 'リモートワーク希望',
  元データJSON: '{}',
};

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

async function getTableFields(token: string): Promise<void> {
  console.log('\n📋 テーブルフィールド一覧');
  console.log('─'.repeat(50));

  const response = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${RECOMMENDATION_TABLE_ID}/fields`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (response.data.code !== 0) {
    console.error('❌ フィールド取得失敗:', response.data.msg);
    return;
  }

  const fields = response.data.data.items;
  console.log(`総フィールド数: ${fields.length}`);
  console.log('');

  for (const field of fields) {
    const typeMap: Record<number, string> = {
      1: 'テキスト',
      2: '数値',
      3: '単一選択',
      4: '複数選択',
      5: '日付',
      7: 'チェックボックス',
      11: 'ユーザー',
      13: '電話番号',
      15: 'URL',
      17: '添付ファイル',
      18: 'リンク',
      19: '作成日時',
      20: '更新日時',
      21: '作成者',
      22: '更新者',
      23: '自動採番',
    };
    const typeName = typeMap[field.type] || `不明(${field.type})`;
    console.log(`  ${field.field_name}: ${typeName} (ID: ${field.field_id})`);
  }
}

async function createRecord(token: string): Promise<void> {
  console.log('\n📝 レコード作成テスト');
  console.log('─'.repeat(50));
  console.log('送信データ:', JSON.stringify(testRecord, null, 2));

  try {
    const response = await axios.post(
      `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${RECOMMENDATION_TABLE_ID}/records`,
      { fields: testRecord },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n📬 APIレスポンス:');
    console.log('  code:', response.data.code);
    console.log('  msg:', response.data.msg);

    if (response.data.code === 0) {
      console.log('\n✅ レコード作成成功!');
      console.log('  record_id:', response.data.data.record.record_id);
    } else {
      console.log('\n❌ レコード作成失敗');
      console.log('  詳細:', JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.log('\n❌ APIエラー');
    if (error.response) {
      console.log('  status:', error.response.status);
      console.log('  data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('  error:', error.message);
    }
  }
}

async function main() {
  console.log('🔍 推薦文インポート デバッグ');
  console.log('='.repeat(50));

  try {
    const token = await getAccessToken();
    console.log('✓ アクセストークン取得成功');

    // フィールド一覧を取得
    await getTableFields(token);

    // レコード作成テスト
    await createRecord(token);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

main();

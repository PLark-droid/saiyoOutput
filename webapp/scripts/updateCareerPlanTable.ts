/**
 * キャリアプランテーブルのフィールドを更新
 */

import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';
const CAREER_PLAN_TABLE_ID = 'tblAwm7SyYcgWPxx';

async function main() {
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ アクセストークン取得\n');

  // フィールド一覧取得
  const fieldsRes = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${CAREER_PLAN_TABLE_ID}/fields`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const fields = fieldsRes.data.data.items;

  // 1. 「テキスト」→「ID」にリネーム
  const textField = fields.find((f: any) => f.field_name === 'テキスト');
  if (textField) {
    await axios.put(
      `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${CAREER_PLAN_TABLE_ID}/fields/${textField.field_id}`,
      { field_name: 'ID', type: textField.type },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('✓ テキスト → ID');
  }

  // 2. 追加するフィールド
  const newFields = [
    { field_name: 'はじめに', type: 1 },
    { field_name: 'キャリアロードマップ', type: 1 },
    { field_name: '連番', type: 1005 },  // 自動採番
  ];

  for (const field of newFields) {
    try {
      const res = await axios.post(
        `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${CAREER_PLAN_TABLE_ID}/fields`,
        field,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      if (res.data.code === 0) {
        console.log(`✓ ${field.field_name} (新規追加)`);
      } else {
        console.log(`- ${field.field_name}: ${res.data.msg}`);
      }
    } catch (e: any) {
      const msg = e.response?.data?.msg || e.message;
      console.log(`- ${field.field_name}: ${msg}`);
    }
    await new Promise(r => setTimeout(r, 150));
  }

  // 3. 数式フィールド（キャリアプランID = CP25xxxx）
  try {
    const formulaRes = await axios.post(
      `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${CAREER_PLAN_TABLE_ID}/fields`,
      {
        field_name: 'キャリアプランID',
        type: 2,
        ui_type: 'Formula',
        property: {
          formula_expression: 'CONCATENATE("CP25", REPT("0", 4 - LEN(TEXT([連番], "0"))), TEXT([連番], "0"))'
        }
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    if (formulaRes.data.code === 0) {
      console.log('✓ キャリアプランID (数式)');
    } else {
      console.log(`- キャリアプランID: ${formulaRes.data.msg}`);
    }
  } catch (e: any) {
    const msg = e.response?.data?.msg || e.message;
    console.log(`- キャリアプランID: ${msg}`);
  }

  console.log('\n✅ 完了');
}

main().catch(e => console.log('エラー:', e));

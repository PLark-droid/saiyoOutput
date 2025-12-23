import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';

// 既存テーブルID
const RECOMMENDATION_TABLE_ID = 'tbl1p68N0kh3qjtc';  // 推薦文テーブル
const CAREER_PLAN_TABLE_ID = 'tblAwm7SyYcgWPxx';     // キャリアプランテーブル

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

async function addFieldsToTable(
  token: string,
  tableName: string,
  tableId: string,
  fields: { field_name: string; type: number }[]
) {
  console.log(`\n📋 ${tableName} (${tableId})`);
  console.log('─'.repeat(40));

  for (const field of fields) {
    try {
      const res = await axios.post(
        `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${tableId}/fields`,
        field,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (res.data.code === 0) {
        console.log(`  ✓ ${field.field_name}`);
      } else {
        console.log(`  ⚠ ${field.field_name}: ${res.data.msg}`);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { msg?: string } }; message?: string };
      console.log(`  ⚠ ${field.field_name}: ${axiosError.response?.data?.msg || axiosError.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }
}

async function main() {
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ アクセストークン取得成功');

  await addFieldsToTable(token, '推薦文テーブル', RECOMMENDATION_TABLE_ID, recommendationFields);
  await addFieldsToTable(token, 'キャリアプランテーブル', CAREER_PLAN_TABLE_ID, careerPlanFields);

  console.log('\n✅ 全フィールド追加完了！');
}

main().catch(console.error);

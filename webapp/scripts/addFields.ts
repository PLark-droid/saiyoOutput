import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';

const CAREER_HISTORY_TABLE_ID = 'tblHFpN69pkfWFQH';

const careerHistoryFields = [
  { field_name: '候補者名', type: 1 },
  { field_name: '最終更新日', type: 1 },
  { field_name: '職務要約', type: 1 },
  { field_name: '職務経歴_会社1', type: 1 },
  { field_name: '職務経歴_会社2', type: 1 },
  { field_name: '職務経歴_会社3', type: 1 },
  { field_name: '職務経歴_会社4', type: 1 },
  { field_name: '職務経歴_会社5', type: 1 },
  { field_name: '職務経歴_その他', type: 1 },
  { field_name: '会社数', type: 2 },
  { field_name: '元データJSON', type: 1 },
];

async function main() {
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ アクセストークン取得成功\n');

  console.log('📋 職務経歴書テーブルにフィールド追加');
  console.log('─'.repeat(40));

  for (const field of careerHistoryFields) {
    try {
      const res = await axios.post(
        `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${CAREER_HISTORY_TABLE_ID}/fields`,
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

  console.log('\n✅ 完了');
}

main().catch(console.error);

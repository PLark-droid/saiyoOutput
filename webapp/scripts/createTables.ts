import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';

const tablesToCreate = [
  {
    name: '職務経歴書',
    fields: [
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
    ],
  },
  {
    name: '推薦文',
    fields: [
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
    ],
  },
  {
    name: 'キャリアプラン',
    fields: [
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
    ],
  },
];

async function main() {
  // Get token
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ アクセストークン取得成功\n');

  const createdTables: Record<string, string> = {};

  for (const table of tablesToCreate) {
    console.log(`📋 テーブル作成: ${table.name}`);

    try {
      const createRes = await axios.post(
        `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables`,
        {
          table: {
            name: table.name,
            default_view_name: 'Grid',
            fields: table.fields,
          },
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (createRes.data.code === 0) {
        const tableId = createRes.data.data.table_id;
        createdTables[table.name] = tableId;
        console.log(`  ✓ 作成成功: ${tableId}`);
      } else {
        console.log(`  ✗ 失敗: ${createRes.data.msg}`);
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { msg?: string } }; message?: string };
      console.log(`  ✗ エラー: ${axiosError.response?.data?.msg || axiosError.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n📝 .envに設定するテーブルID:');
  console.log('─'.repeat(50));
  if (createdTables['職務経歴書']) console.log(`VITE_LARK_CAREER_HISTORY_TABLE_ID=${createdTables['職務経歴書']}`);
  if (createdTables['推薦文']) console.log(`VITE_LARK_RECOMMENDATION_TABLE_ID=${createdTables['推薦文']}`);
  if (createdTables['キャリアプラン']) console.log(`VITE_LARK_CAREER_PLAN_TABLE_ID=${createdTables['キャリアプラン']}`);
}

main().catch(console.error);

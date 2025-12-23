import axios from 'axios';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';
const TABLE_ID = 'tblHFpN69pkfWFQH';

// 会社ごとのフィールド名
const companyFieldNames = [
  '会社名',
  '期間',
  '雇用形態',
  '事業内容',
  '資本金',
  '売上高',
  '従業員数',
  '上場区分',
  '部署',
  '業務内容',
  '主な実績',
  '主な取り組み',
];

async function main() {
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ アクセストークン取得成功\n');

  // 会社1〜5の各フィールドを追加
  for (let companyNum = 1; companyNum <= 5; companyNum++) {
    console.log(`📋 会社${companyNum}のフィールド追加`);
    console.log('─'.repeat(40));

    for (const fieldName of companyFieldNames) {
      const fullFieldName = `${fieldName}_会社${companyNum}`;
      try {
        const res = await axios.post(
          `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${TABLE_ID}/fields`,
          { field_name: fullFieldName, type: 1 },
          { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        if (res.data.code === 0) {
          console.log(`  ✓ ${fullFieldName}`);
        } else {
          console.log(`  ⚠ ${fullFieldName}: ${res.data.msg}`);
        }
      } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { msg?: string } }; message?: string };
        console.log(`  ⚠ ${fullFieldName}: ${axiosError.response?.data?.msg || axiosError.message}`);
      }
      await new Promise(r => setTimeout(r, 150));
    }
    console.log('');
  }

  console.log('✅ 全フィールド追加完了！');
}

main().catch(console.error);

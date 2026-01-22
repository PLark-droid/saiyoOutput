import axios from 'axios';

// Lark API
const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';
const APP_ID = 'cli_a98f344fd6f8de1b';
const APP_SECRET = 'YiFmIRV7nc5cLwtfZOR2orPQ4uCqhJAf';
const BASE_APP_TOKEN = 'EKALbmBxyagk4psw4I9jzVKcpvg';
const TABLE_ID = 'tblXZyX6ICBMH3De';

// Slack member ID mapping (from channel seisansei_ruh書類作成連携)
const slackMembers: Record<string, string> = {
  '米本剛': 'U093SA1DH8T',
  '米本 剛': 'U093SA1DH8T',
  '中川達智': 'U093SA75J11',
  '中川 達智': 'U093SA75J11',
  '中間悠介': 'U093SA8QXDH',
  '大瀧広斗': 'U093SAAHJ8K',
  '大瀧 広斗': 'U093SAAHJ8K',
  '松田優海': 'U093SACQY1H',
  '松田 優海': 'U093SACQY1H',
  '寺越大智': 'U093SACV95H',
  '寺越 大智': 'U093SACV95H',
  '紺屋陽南': 'U093SAD5LHH',
  '紺屋 陽南': 'U093SAD5LHH',
  '溝口世史紀': 'U093SADARNF',
  '溝口 世史紀': 'U093SADARNF',
  '久保田陸登': 'U093SADG659',
  '久山菜々子': 'U093SADJJKD',
  '久山 菜々子': 'U093SADJJKD',
  '可知歩斗': 'U093SADMZT5',
  '可知 歩斗': 'U093SADMZT5',
  '岡田大成': 'U093SADPBHR',
  '岡田 大成': 'U093SADPBHR',
  '道村麻友子': 'U0946HG20UF',
  '倉澤亮佑': 'U0957BQKH16',
  '倉澤 亮佑': 'U0957BQKH16',
  '加藤孝典': 'U0978D4JACX',
  '加藤 孝典': 'U0978D4JACX',
  '木内翔太': 'U09BHFPC94Z',
  '木内 翔太': 'U09BHFPC94Z',
  '長谷川采奈': 'U09D0MZJRU4',
  '藤波香': 'U09J06E6SNS',
  '藤波 香': 'U09J06E6SNS',
};

async function main() {
  // Get Lark token
  const tokenRes = await axios.post(`${LARK_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    app_id: APP_ID,
    app_secret: APP_SECRET,
  });
  const token = tokenRes.data.tenant_access_token;
  console.log('✓ Larkトークン取得成功\n');

  // Get all records
  const recordsRes = await axios.get(
    `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${TABLE_ID}/records`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const records = recordsRes.data.data.items;
  console.log(`📋 RUH担当者テーブル: ${records.length}件\n`);
  console.log('─'.repeat(60));

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const name = record.fields['RUH担当者名'];
    const currentId = record.fields['メンバーID'];
    const recordId = record.record_id;

    // Find matching Slack ID
    const slackId = slackMembers[name];

    if (!slackId) {
      console.log(`⚠ ${name}: Slackメンバー見つからず`);
      skipped++;
      continue;
    }

    if (currentId === slackId || currentId === `@${slackId}`) {
      console.log(`✓ ${name}: 既に設定済み (${slackId})`);
      skipped++;
      continue;
    }

    // Update record
    try {
      await axios.put(
        `${LARK_BASE_URL}/bitable/v1/apps/${BASE_APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
        { fields: { 'メンバーID': slackId } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      console.log(`✅ ${name}: ${slackId} を設定`);
      updated++;
    } catch (e: any) {
      console.log(`❌ ${name}: 更新失敗 - ${e.response?.data?.msg || e.message}`);
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`✅ 更新完了: ${updated}件更新, ${skipped}件スキップ`);
}

main().catch(console.error);

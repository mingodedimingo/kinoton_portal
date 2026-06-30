import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// board_posts 최근 첨부파일 확인
const [rows] = await conn.execute(
  `SELECT id, title, attachments, images FROM board_posts 
   WHERE (attachments IS NOT NULL AND attachments != '[]') 
      OR (images IS NOT NULL AND images != '[]' AND images != 'null')
   ORDER BY createdAt DESC LIMIT 15`
);

console.log('=== board_posts 이미지/첨부파일 ===');
for (const row of rows) {
  console.log(`\nID:${row.id} | ${String(row.title).slice(0,30)}`);
  if (row.attachments && row.attachments !== '[]') {
    try {
      const atts = JSON.parse(row.attachments);
      for (const a of atts) {
        const ext = (a.name || a.url || '').split('.').pop()?.toLowerCase();
        console.log(`  ATT url:${a.url} | mime:${a.mimeType} | ext:${ext} | name:${a.name}`);
      }
    } catch(e) { console.log('  ATT parse error:', row.attachments?.slice(0,100)); }
  }
  if (row.images && row.images !== '[]' && row.images !== 'null') {
    try {
      const imgs = JSON.parse(row.images);
      for (const img of imgs) {
        console.log(`  IMG: ${img}`);
      }
    } catch(e) { console.log('  IMG parse error'); }
  }
}

// notices 테이블도 확인
const [nrows] = await conn.execute(
  `SELECT id, title, attachments FROM notices 
   WHERE attachments IS NOT NULL AND attachments != '[]'
   ORDER BY createdAt DESC LIMIT 5`
).catch(() => [[]]);

if (nrows.length > 0) {
  console.log('\n=== notices 이미지/첨부파일 ===');
  for (const row of nrows) {
    console.log(`\nID:${row.id} | ${String(row.title).slice(0,30)}`);
    try {
      const atts = JSON.parse(row.attachments);
      for (const a of atts) {
        const ext = (a.name || a.url || '').split('.').pop()?.toLowerCase();
        console.log(`  ATT url:${a.url} | mime:${a.mimeType} | ext:${ext} | name:${a.name}`);
      }
    } catch(e) { console.log('  ATT parse error'); }
  }
}

await conn.end();

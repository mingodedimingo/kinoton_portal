import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, title, content FROM board_posts 
   WHERE content LIKE '%cloudfront.net%'`
);

for (const row of rows) {
  console.log(`\n=== ID: ${row.id} | ${row.title} ===`);
  // cloudfront URL 추출
  const matches = row.content.match(/https:\/\/[^"'\s<>]+cloudfront\.net[^"'\s<>]*/g);
  if (matches) {
    console.log('CloudFront URLs found:');
    matches.forEach(url => {
      // URL에서 파일 경로 추출 (portal-files/... 부분)
      const pathMatch = url.match(/portal-files\/([^?]+)/);
      if (pathMatch) {
        console.log(`  Original: ${url.substring(0, 100)}...`);
        console.log(`  Key: portal-files/${pathMatch[1]}`);
        console.log(`  New URL: /manus-storage/portal-files/${pathMatch[1]}`);
      }
    });
  }
}

await conn.end();

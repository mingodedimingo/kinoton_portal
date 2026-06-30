import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, title, attachments FROM board_posts 
   WHERE attachments IS NOT NULL AND attachments != '[]' AND attachments != 'null'
   ORDER BY id DESC LIMIT 5`
);

for (const row of rows) {
  console.log(`\n=== ID: ${row.id} | ${row.title} ===`);
  try {
    const parsed = JSON.parse(row.attachments);
    parsed.forEach(a => console.log(`  - name: ${a.name}, mimeType: ${a.mimeType}, url: ${a.url?.substring(0, 60)}`));
  } catch {
    console.log('raw:', row.attachments?.substring(0, 200));
  }
}

await conn.end();

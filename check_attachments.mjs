import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, title, images, attachments FROM board_posts ORDER BY id DESC LIMIT 10`
);

for (const row of rows) {
  console.log(`\n=== ID: ${row.id} | ${row.title} ===`);
  console.log('images:', row.images);
  console.log('attachments:', row.attachments ? row.attachments.substring(0, 300) : 'null');
}

await conn.end();

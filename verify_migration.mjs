import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT id, title, 
   CASE WHEN content LIKE '%cloudfront.net%' THEN 'STILL_HAS_CLOUDFRONT' ELSE 'OK' END as content_status
   FROM board_posts 
   WHERE id IN (270001, 300001, 300002)`
);
console.log('마이그레이션 결과:', JSON.stringify(rows, null, 2));

await conn.end();

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.query(
  `SELECT COUNT(*) as cnt FROM board_posts 
   WHERE content LIKE '%cloudfront.net%' OR images LIKE '%cloudfront.net%' OR attachments LIKE '%cloudfront.net%'`
);
console.log('남은 presigned URL 게시글 수:', rows[0].cnt);

await conn.end();

import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// content에 cloudfront presigned URL이 있는 게시글 수 확인
const [rows] = await conn.query(
  `SELECT id, title, 
   CASE WHEN content LIKE '%cloudfront.net%' THEN 'HAS_CLOUDFRONT' ELSE 'OK' END as content_status,
   CASE WHEN images LIKE '%cloudfront.net%' THEN 'HAS_CLOUDFRONT' ELSE 'OK' END as images_status,
   CASE WHEN attachments LIKE '%cloudfront.net%' THEN 'HAS_CLOUDFRONT' ELSE 'OK' END as attach_status
   FROM board_posts 
   WHERE content LIKE '%cloudfront.net%' OR images LIKE '%cloudfront.net%' OR attachments LIKE '%cloudfront.net%'`
);
console.log('presigned URL이 있는 게시글:', JSON.stringify(rows, null, 2));

await conn.end();

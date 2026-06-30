import { createConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

// 공지사항 테이블 확인
const [tables] = await conn.query(`SHOW TABLES`);
console.log('Tables:', tables.map(t => Object.values(t)[0]));

await conn.end();

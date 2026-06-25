import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, name, email, isActive FROM employees WHERE name LIKE ? LIMIT 5",
  ['%민구%']
);
console.log('김민구 계정:', JSON.stringify(rows, null, 2));

// 전체 이메일 샘플 확인
const [sample] = await conn.execute(
  "SELECT id, name, email FROM employees ORDER BY id LIMIT 5"
);
console.log('직원 이메일 샘플:', JSON.stringify(sample, null, 2));
await conn.end();

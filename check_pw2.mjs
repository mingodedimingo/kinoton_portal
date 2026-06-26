import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 대소문자 무관하게 검색
const [rows] = await conn.execute("SELECT id, name, email, passwordHash FROM employees WHERE LOWER(email) = LOWER('Kay.kwon@kinoton.co.kr')");
console.log('검색 결과:', rows.length, '건');
for (const r of rows) {
  console.log('ID:', r.id, '| 이름:', r.name, '| 이메일:', r.email, '| 해시 있음:', !!r.passwordHash);
  if (r.passwordHash) {
    const ok = await bcrypt.compare('kino1920**', r.passwordHash);
    console.log('kino1920** 일치:', ok);
  } else {
    console.log('passwordHash 없음');
  }
}

await conn.end();

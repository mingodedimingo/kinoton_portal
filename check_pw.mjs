import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// kay.kwon 계정 확인
const [rows] = await conn.execute("SELECT id, name, email, passwordHash FROM employees WHERE email='kay.kwon@kinoton.co.kr'");
if (rows.length === 0) {
  console.log('kay.kwon 계정 없음 - DB에 존재하지 않음');
} else {
  const r = rows[0];
  console.log('이름:', r.name, '| passwordHash 있음:', !!r.passwordHash);
  if (r.passwordHash) {
    const ok = await bcrypt.compare('kino1920**', r.passwordHash);
    console.log('kino1920** 일치:', ok);
  } else {
    console.log('passwordHash NULL 또는 빈값 -> 로그인 불가');
  }
}

// 전체 직원 중 passwordHash가 없는 계정 수 확인
const [nullRows] = await conn.execute("SELECT COUNT(*) as cnt FROM employees WHERE passwordHash IS NULL OR passwordHash = ''");
console.log('\n비밀번호 없는 직원 수:', nullRows[0].cnt);

const [totalRows] = await conn.execute("SELECT COUNT(*) as cnt FROM employees");
console.log('전체 직원 수:', totalRows[0].cnt);

await conn.end();

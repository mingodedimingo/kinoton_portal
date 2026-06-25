import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, name, email, passwordHash FROM employees WHERE email = ?",
  ['mingu.kim@kinoton.co.kr']
);

if (rows.length === 0) {
  console.log('계정을 찾을 수 없습니다.');
  await conn.end();
  process.exit(1);
}

const emp = rows[0];
console.log('계정 찾음:', emp.name, emp.email);
console.log('passwordHash 존재:', !!emp.passwordHash);
console.log('hash 앞 10자:', emp.passwordHash ? emp.passwordHash.substring(0, 10) : 'null');

// kino1920** 비밀번호 검증
const testPassword = 'kino1920**';
if (emp.passwordHash) {
  const valid = await bcrypt.compare(testPassword, emp.passwordHash);
  console.log(`'${testPassword}' 비밀번호 일치 여부:`, valid);
  
  // 혹시 다른 형태인지 확인
  const valid2 = await bcrypt.compare('kino1920', emp.passwordHash);
  console.log(`'kino1920' 비밀번호 일치 여부:`, valid2);
}

await conn.end();

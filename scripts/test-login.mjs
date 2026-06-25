import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// oauth.ts의 getEmployeeByEmail과 동일한 쿼리 재현
const email = 'mingu.kim@kinoton.co.kr';
const password = 'kino1920**';

console.log('1. 이메일로 직원 조회:', email.trim().toLowerCase());
const [rows] = await conn.execute(
  "SELECT * FROM employees WHERE email = ? LIMIT 1",
  [email.trim().toLowerCase()]
);

if (rows.length === 0) {
  console.log('❌ 직원을 찾을 수 없음 - email 컬럼 값 확인 필요');
} else {
  const emp = rows[0];
  console.log('✅ 직원 찾음:', emp.name, '| isActive:', emp.isActive, '| passwordHash 존재:', !!emp.passwordHash);
  
  if (!emp.isActive) {
    console.log('❌ isActive가 false - 비활성 계정');
  } else if (!emp.passwordHash) {
    console.log('❌ passwordHash 없음');
  } else {
    const valid = await bcrypt.compare(password, emp.passwordHash);
    console.log('비밀번호 일치:', valid);
    if (valid) {
      console.log('✅ 로그인 성공해야 함 - 서버 코드 문제');
    } else {
      console.log('❌ 비밀번호 불일치');
    }
  }
}

await conn.end();

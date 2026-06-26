import * as dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// mingu.kim 계정 확인
const [rows] = await conn.execute(
  "SELECT id, name, email, department, position, profileImage FROM employees WHERE LOWER(email) LIKE '%mingu%' OR LOWER(email) LIKE '%mingu.kim%' LIMIT 5"
);
console.log("mingu.kim 검색 결과:", JSON.stringify(rows, null, 2));

// 전체 직원 수
const [count] = await conn.execute("SELECT COUNT(*) as total FROM employees");
console.log("전체 직원 수:", count[0].total);

// employees.me 쿼리 방식 확인 - session_token으로 조회
const [sessions] = await conn.execute(
  "SELECT s.employee_id, e.name, e.email FROM employee_sessions s JOIN employees e ON s.employee_id = e.id ORDER BY s.created_at DESC LIMIT 5"
);
console.log("최근 세션:", JSON.stringify(sessions, null, 2));

await conn.end();

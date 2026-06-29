import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.query('SELECT id, name, department, position, email FROM employees ORDER BY id LIMIT 20');
console.log(JSON.stringify(rows, null, 2));
await conn.end();

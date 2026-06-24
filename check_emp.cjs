const {createConnection} = require('mysql2/promise');
(async () => {
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute('SELECT id, name, email, isActive, LENGTH(passwordHash) as hashLen FROM employees WHERE email = ?', ['mingu.kim@kinoton.co.kr']);
  console.log('result:', JSON.stringify(rows, null, 2));
  await conn.end();
})().catch(e => console.error(e.message));

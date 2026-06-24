const {createConnection} = require('mysql2/promise');
const bcrypt = require('bcryptjs');
(async () => {
  const conn = await createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute('SELECT id, name, email, passwordHash FROM employees WHERE email = ?', ['mingu.kim@kinoton.co.kr']);
  const emp = rows[0];
  const h = emp.passwordHash;
  console.log('hasHash:', Boolean(h), 'len:', h ? h.length : 0);
  if (h) {
    const ok = await bcrypt.compare('kino1920**', h);
    console.log('password valid:', ok);
  } else {
    console.log('NO PASSWORD HASH');
  }
  await conn.end();
})().catch(e => console.error(e.message));

require('dotenv/config');
const url = process.env.DATABASE_URL;
console.log('DATABASE_URL exists:', !!url);
if (url) {
  console.log('DATABASE_URL prefix:', url.substring(0, 25) + '...');
} else {
  console.log('DATABASE_URL is NOT set');
}

// drizzle 연결 테스트
const {drizzle} = require('drizzle-orm/mysql2');
try {
  const db = drizzle(url);
  console.log('drizzle instance created:', typeof db);
} catch(e) {
  console.error('drizzle error:', e.message);
}

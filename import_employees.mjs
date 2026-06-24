import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

// CSV 파싱 (간단 구현)
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

// mysql://user:pass@host:port/db 파싱
function parseUrl(url) {
  const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/(.+)/);
  if (!m) throw new Error('Invalid DATABASE_URL');
  return {
    host: m[3],
    port: parseInt(m[4] || '3306'),
    user: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    database: m[5].split('?')[0],
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  const conn = await createConnection(parseUrl(DATABASE_URL));
  console.log('DB 연결 성공');

  const csv = readFileSync('/home/ubuntu/upload/조직도_업로드용.csv', 'utf-8');
  const rows = parseCSV(csv);
  console.log(`CSV 행수: ${rows.length}`);

  // 기존 직원 중 passwordHash 없는 것만 삭제
  const [delResult] = await conn.execute(
    "DELETE FROM employees WHERE passwordHash IS NULL OR passwordHash = ''"
  );
  console.log(`기존 데이터 삭제: ${delResult.affectedRows}건`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = (row['이름'] || '').trim();
    const dept = (row['부서명'] || '').trim();
    const position = (row['직급'] || '').trim();
    let ext = (row['직통번호'] || '').trim();
    let phone = (row['핸드폰'] || '').trim();
    const emailLocal = (row['Email'] || '').trim();

    if (!name || name === '공석') { skipped++; continue; }

    // 이메일 완성
    let email = null;
    if (emailLocal && !emailLocal.includes('@')) {
      email = `${emailLocal}@kinoton.co.kr`;
    } else if (emailLocal.includes('@')) {
      email = emailLocal;
    }

    // 정규화
    if (['-', ''].includes(ext)) ext = null;
    if (['-', ''].includes(phone)) phone = null;

    // 이미 같은 이메일 존재하면 UPDATE
    if (email) {
      const [existing] = await conn.execute(
        'SELECT id FROM employees WHERE email = ?', [email]
      );
      if (existing.length > 0) {
        await conn.execute(
          'UPDATE employees SET name=?, department=?, position=?, phone=?, ext=?, isActive=1, updatedAt=NOW() WHERE email=?',
          [name, dept, position, phone, ext, email]
        );
        console.log(`  UPDATE: ${name} (${email})`);
        updated++;
        continue;
      }
    }

    await conn.execute(
      'INSERT INTO employees (name, department, position, email, phone, ext, joinDate, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())',
      [name, dept, position, email, phone, ext, '2020-01-01']
    );
    inserted++;
  }

  await conn.end();
  console.log(`\n완료: INSERT ${inserted}명, UPDATE ${updated}명, 공석 스킵 ${skipped}건`);

  // 최종 확인
  const conn2 = await createConnection(parseUrl(DATABASE_URL));
  const [count] = await conn2.execute('SELECT COUNT(*) as total FROM employees');
  console.log(`DB 총 직원 수: ${count[0].total}명`);
  await conn2.end();
}

main().catch(e => { console.error(e); process.exit(1); });

import 'dotenv/config';
import mysql from 'mysql2/promise';

const YONHAP_IMG = '/manus-storage/portal-files/1782696151273-76wby0vqn5l_79d5d92b.webp';
const SEOUL_IMG = '/manus-storage/portal-files/1782695918803-3usiesbqxfi_aefc5627.webp';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // 연합뉴스 기사 삽입
  await conn.query(
    `INSERT INTO board_posts (category, title, content, link, authorName, isNew, isPinned, viewCount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, NOW(), NOW())`,
    [
      '언론보도',
      '키노톤, 콘텐츠 IP 기업 도약 선언…"연내 코스닥 상장 추진"',
      `<img src="${YONHAP_IMG}" style="max-width:100%;height:auto;" />`,
      'https://www.yna.co.kr/view/AKR20260612056400030?input=1195m',
      '구정모 기자',
    ]
  );
  console.log('연합뉴스 게시글 삽입 완료');

  // 서울경제 기사 content 업데이트 (id=210002)
  await conn.query(
    `UPDATE board_posts SET content = ? WHERE id = 210002`,
    [`<img src="${SEOUL_IMG}" style="max-width:100%;height:auto;" />`]
  );
  console.log('서울경제 게시글 이미지 URL 업데이트 완료');

  // 삽입된 연합뉴스 ID 확인
  const [rows] = await conn.query(
    `SELECT id, title, createdAt FROM board_posts WHERE title LIKE '%연합뉴스%' OR title LIKE '%코스닥%' ORDER BY id DESC LIMIT 1`
  );
  console.log('연합뉴스 게시글:', rows[0]);

  await conn.end();
}

main().catch(console.error);

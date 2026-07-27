import { createConnection } from 'mysql2';
import { config } from 'dotenv';
config();
const url = process.env.DATABASE_URL;
if (!url) { console.log('NO DATABASE_URL'); process.exit(1); }
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(\?.*)?$/);
const conn = createConnection({host:m[3],port:m[4],user:m[1],password:m[2],database:m[5],ssl:{rejectUnauthorized:true}});
conn.query('SELECT COUNT(*) as cnt FROM post_comments', (e,r)=>{
  if(e){console.log('ERROR:',e.message);}
  else{console.log('post_comments 총 댓글 수:', r[0].cnt);}
  conn.end();
});

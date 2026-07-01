import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import multer from "multer";
import { storagePut } from "../storage";
import { sdk } from "./sdk";
import { parse as parseCookies } from "cookie";
import { getSessionCookieOptions } from "./cookies";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // ── 파일 업로드 엔드포인트 (모든 파일 형식 허용) ──────────────────
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    // fileFilter 없음 → 모든 파일 형식 허용
  });

  // 어드민 토큰 상수
  const ADMIN_TOKEN = "kino_admin_v1";

  // 공통 인증 헬퍼: kino_admin 쿠키 또는 포탈 직원 JWT 세션 중 하나라도 있으면 허용
  async function isAuthenticated(req: express.Request): Promise<boolean> {
    const cookies = parseCookies(req.headers.cookie || "");
    if (cookies.kino_admin === ADMIN_TOKEN) return true;
    // 포탈 직원 JWT 로컬 검증 (OAuth 서버 호출 없이)
    try {
      const session = await sdk.verifySession(cookies.app_session_id);
      return !!session;
    } catch {
      return false;
    }
  }

  // 파일 확장자 → MIME 타입 매핑 헬퍼
  const getMimeType = (ext: string, fallback: string): string => {
    const map: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      bmp: 'image/bmp', ico: 'image/x-icon', tiff: 'image/tiff', tif: 'image/tiff',
      // jfif는 JPEG, avif는 모던 브라우저 지원. heic/heif는 Content-Type은 정확하지만
      // Chrome/Firefox에서는 표시 안 될 수 있음(스토리지/다운로드는 정상).
      jfif: 'image/jpeg', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif',
      pdf: 'application/pdf', mp4: 'video/mp4', mov: 'video/quicktime',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
      doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      zip: 'application/zip', txt: 'text/plain',
    };
    return map[ext.toLowerCase()] || (fallback !== 'application/octet-stream' ? fallback : 'application/octet-stream');
  };

  // 기존 이미지 업로드 엔드포인트 (인증 불필요 - multipart/form-data, Cloudflare WAF 우회)
  app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "파일이 없습니다." }); return; }
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = originalName.split(".").pop() || "jpg";
      const inputKey = `portal-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const mimeType = getMimeType(ext, req.file.mimetype);
      // storagePut 내부에서 appendHashSuffix가 적용되므로 반환된 key/url을 사용해야 함
      const { key: actualKey, url } = await storagePut(inputKey, req.file.buffer, mimeType);
      // 안정적인 상대경로(/api/img/{key})를 반환한다. storageProxy가 요청마다
      // 새 presigned URL을 받아 서버에서 파일을 파이프하므로 브라우저 403/만료 문제가 없다.
      // (presigned URL을 직접 반환하면 브라우저 직접 접근 시 403, 게시글 본문에 박힌 뒤
      //  URL 만료 시 깨짐 → 이미지 아이콘만 표시되는 버그가 재발한다.)
      // (서빙 경로가 "/api/" 하위여야 하는 이유는 storageProxy.ts 주석 참고.)
      res.json({ url, key: actualKey, name: originalName, size: req.file.size, mimeType });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "업로드 실패" });
    }
  });

  // 새 범용 파일 업로드 엔드포인트 (인증 불필요 - multipart/form-data)
  app.post("/api/upload-file", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: "파일이 없습니다." }); return; }
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = originalName.split(".").pop() || "bin";
      const inputKey2 = `portal-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const mimeType2 = getMimeType(ext, req.file.mimetype);
      // storagePut 내부에서 appendHashSuffix가 적용되므로 반환된 key/url을 사용해야 함
      // 이미지/비이미지 모두 안정적인 상대경로(/api/img/{key})를 반환한다.
      // (presigned URL 직접 반환 금지 — 브라우저 403 및 만료 시 깨짐 유발)
      const { key: actualKey2, url: actualUrl2 } = await storagePut(inputKey2, req.file.buffer, mimeType2);
      res.json({
        url: actualUrl2,
        key: actualKey2,
        name: originalName,
        size: req.file.size,
        mimeType: mimeType2,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      console.error("File upload error:", err);
      res.status(500).json({ error: msg });
    }
  });
  // ── 어드민 로그인 엔드포인트 (ID/PW 방식) ──────────────────────
  const ADMIN_ID = process.env.ADMIN_ID || "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1920";

  app.post("/api/admin/login", (req, res) => {
    const { id, password } = req.body || {};
    if (id === ADMIN_ID && password === ADMIN_PASSWORD) {
      // kino_admin 쿠키만 발급 — 포탈 app_session_id와 완전 독립
      // 어드민 세션은 kino_admin 쿠키 하나로만 관리하여 포탈 직원 세션과 절대 간섭하지 않음
      // HTTP/HTTPS 환경을 동적으로 감지하여 쿠키 옵션 설정
      // (portal.kinoton.co.kr는 HTTP → sameSite:'lax', secure:false 로 설정해야 쿠키가 저장됨)
      const adminCookieOpts = getSessionCookieOptions(req);
      res.cookie("kino_admin", ADMIN_TOKEN, {
        ...adminCookieOpts,
        maxAge: 8 * 60 * 60 * 1000, // 8시간
      });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }
  });

  app.post("/api/admin/logout", (_req, res) => {
    // 어드민 로그아웃 시 kino_admin 쿠키만 삭제 — 포탈 app_session_id는 건드리지 않음
    // clearCookie: path만 일치하면 삭제됨 (sameSite/secure 불필요)
    res.clearCookie("kino_admin", { path: "/" });
    res.json({ success: true });
  });

  app.get("/api/admin/check", (req, res) => {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies.kino_admin;
    if (token === ADMIN_TOKEN) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

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

  // ── 파일 업로드 엔드포인트 (이미지/동영상/문서 전체 지원) ──────────
  const ALLOWED_MIME_TYPES = new Set([
    // 이미지
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    // 동영상
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
    // 문서
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // 압축
    "application/zip", "application/x-zip-compressed",
  ]);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB (동영상 지원)
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
      else cb(new Error(`지원하지 않는 파일 형식입니다: ${file.mimetype}`));
    },
  });

  // 기존 이미지 업로드 엔드포인트 (하위 호환)
  app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch {
        res.status(401).json({ error: "로그인이 필요합니다." }); return;
      }
      if (!user) { res.status(401).json({ error: "로그인이 필요합니다." }); return; }
      if (!req.file) { res.status(400).json({ error: "파일이 없습니다." }); return; }
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const key = `portal-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({ url, key, name: req.file.originalname, size: req.file.size, mimeType: req.file.mimetype });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "업로드 실패" });
    }
  });

  // 새 범용 파일 업로드 엔드포인트
  app.post("/api/upload-file", upload.single("file"), async (req, res) => {
    try {
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch {
        res.status(401).json({ error: "로그인이 필요합니다." }); return;
      }
      if (!user) { res.status(401).json({ error: "로그인이 필요합니다." }); return; }
      if (!req.file) { res.status(400).json({ error: "파일이 없습니다." }); return; }
      const ext = req.file.originalname.split(".").pop() || "bin";
      const key = `portal-files/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({
        url,
        key,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "업로드 실패";
      console.error("File upload error:", err);
      res.status(500).json({ error: msg });
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

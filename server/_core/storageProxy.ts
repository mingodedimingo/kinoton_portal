import type { Express } from "express";
import { ENV } from "./env";

export function registerStorageProxy(app: Express) {
  // 서빙 경로는 반드시 "/api/" 하위여야 한다. 과거 "/manus-storage/*"를 썼으나,
  // 배포 환경에서 그 경로는 Manus/Cloudflare 플랫폼 엣지가 가로채 이 Express 앱에
  // 도달조차 못 한다(응답에 x-powered-by/x-cloud-trace 없이 엣지가 404 "Not found").
  // 로컬(pnpm dev)엔 엣지가 없어 동작하는 것처럼 보이지만 배포하면 항상 이미지가 깨졌다.
  // "/api/*"는 컨테이너에 도달함이 검증되어 여기서 직접 파일을 파이프할 수 있다.
  app.get("/api/img/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      // Fetch the actual file and pipe it directly (no redirect)
      // 307 redirect to CloudFront signed URL fails in browser due to 403
      const fileResp = await fetch(url);
      if (!fileResp.ok) {
        console.error(`[StorageProxy] file fetch error: ${fileResp.status}`);
        res.status(502).send("File fetch error");
        return;
      }

      const contentType = fileResp.headers.get("content-type") || "application/octet-stream";
      const contentLength = fileResp.headers.get("content-length");
      res.set("Content-Type", contentType);
      res.set("Cache-Control", "public, max-age=3600");
      if (contentLength) res.set("Content-Length", contentLength);

      const buffer = await fileResp.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

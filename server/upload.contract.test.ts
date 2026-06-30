import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * 이미지/파일 업로드 URL 계약 테스트 (재발 방지 가드)
 *
 * 배경: 게시판 이미지가 "깨진 아이콘"으로만 보이는 버그가 여러 번 재발했다.
 * 원인은 늘 동일하다 — 업로드 엔드포인트가 클라이언트에 "불안정한 URL"
 * (presigned/절대/만료 URL)을 줘서 <img src>에 박힌 것.
 *
 * 올바른 계약: 업로드 응답은 항상 안정적인 상대경로 "/api/img/{key}"만
 * 반환하고, 실제 파일 서빙은 storageProxy가 서버에서 파이프한다.
 * 서빙 경로는 반드시 "/api/" 하위여야 한다 — "/manus-storage/"는 배포 환경에서
 * 플랫폼 엣지가 가로채 앱에 도달하지 못한다(이미지가 항상 깨짐).
 * (자세한 규칙: docs/이미지_업로드_규칙.md)
 *
 * 이 테스트는 소스 수준에서 그 불변식을 잠근다. 깨지면 위 문서를 보고
 * URL을 "/api/" 상대경로로 되돌릴 것.
 */
const here = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(join(here, "_core/index.ts"), "utf8");
const proxySrc = readFileSync(join(here, "_core/storageProxy.ts"), "utf8");
const storageSrc = readFileSync(join(here, "storage.ts"), "utf8");

describe("업로드 URL 계약 (재발 방지)", () => {
  it("업로드 엔드포인트는 presigned URL(storageGetSignedUrl)을 클라이언트에 반환하면 안 된다", () => {
    // storageGetSignedUrl은 storageProxy 내부(서버)에서만 써야 한다.
    // index.ts(업로드 엔드포인트)에서 쓰면 presigned URL이 브라우저로 새어나가
    // 403/만료로 이미지가 깨진다. (회귀 커밋 f6d2f9b)
    expect(indexSrc).not.toMatch(/storageGetSignedUrl/);
  });

  it("업로드 엔드포인트는 storagePut의 반환값(상대 url)을 사용해야 한다", () => {
    // storagePut은 해시 접미사가 붙은 실제 key와 상대 url(/api/img/{key})을 반환한다.
    // 반드시 await storagePut(...) 호출이 존재해야 한다.
    expect(indexSrc).toMatch(/await storagePut\(/);
  });

  it('서빙 경로는 "/api/" 하위여야 한다 ("/manus-storage"로 회귀 금지)', () => {
    // 배포 환경에서 "/manus-storage/*"는 플랫폼 엣지가 가로채 Express 앱에 도달하지
    // 못한다(로컬에선 되지만 배포하면 항상 404 → 이미지 깨짐). 서빙은 컨테이너에
    // 도달하는 "/api/" 경로여야 한다.
    expect(proxySrc).toMatch(/app\.get\(["'`]\/api\//);
    expect(proxySrc).not.toMatch(/app\.get\(["'`]\/manus-storage/);
    // storagePut/storageGet이 클라이언트에 돌려주는 url도 "/api/"로 시작해야 한다.
    expect(storageSrc).toMatch(/url:\s*`\/api\//);
    expect(storageSrc).not.toMatch(/url:\s*`\/manus-storage/);
  });

  it("storageProxy는 파일을 직접 파이프해야 한다 (307 리다이렉트로 회귀 금지)", () => {
    // 브라우저가 signed URL로 리다이렉트되면 403이 난다.
    // 프록시는 서버에서 fetch 후 바이트를 res.end로 흘려보내야 한다.
    expect(proxySrc).toMatch(/res\.end\(/);
    expect(proxySrc).not.toMatch(/res\.redirect\(/);
  });
});

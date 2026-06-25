import { describe, expect, it } from "vitest";

/**
 * 어드민 인증은 /api/admin/login REST 엔드포인트로 처리됩니다.
 * (tRPC 라우터가 아닌 Express 미들웨어로 구현)
 * 여기서는 환경변수 설정 여부만 검증합니다.
 */
describe("admin.auth", () => {
  it("ADMIN_PASSWORD env variable is set", () => {
    expect(process.env.ADMIN_PASSWORD).toBeDefined();
    expect(process.env.ADMIN_PASSWORD!.length).toBeGreaterThan(0);
  });

  it("SMTP 환경변수가 올바르게 설정되어 있어야 한다", () => {
    expect(process.env.SMTP_HOST).toBe("smtp.naver.com");
    expect(process.env.SMTP_USER).toBe("kinoton_inc@naver.com");
    expect(process.env.SMTP_PASS).toBeDefined();
    expect(process.env.SMTP_FROM).toBeDefined();
  });

  it("JWT_SECRET env variable is set", () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET!.length).toBeGreaterThan(0);
  });
});

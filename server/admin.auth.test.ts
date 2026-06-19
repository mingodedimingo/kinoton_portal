import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("admin.auth", () => {
  it("ADMIN_PASSWORD env variable is set", () => {
    expect(process.env.ADMIN_PASSWORD).toBeDefined();
    expect(process.env.ADMIN_PASSWORD!.length).toBeGreaterThan(0);
  });

  it("admin.login succeeds with correct password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const password = process.env.ADMIN_PASSWORD!;
    const result = await caller.admin.login({ password });
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe("string");
    expect(result.token.length).toBeGreaterThan(0);
  });

  it("admin.login fails with wrong password", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.admin.login({ password: "wrong-password-xyz" })
    ).rejects.toThrow("비밀번호가 올바르지 않습니다.");
  });

  it("admin.verify returns valid=true for correct token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const password = process.env.ADMIN_PASSWORD!;
    const { token } = await caller.admin.login({ password });
    const result = await caller.admin.verify({ token });
    expect(result.valid).toBe(true);
  });

  it("admin.verify returns valid=false for invalid token", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.admin.verify({ token: "invalid-token" });
    expect(result.valid).toBe(false);
  });
});

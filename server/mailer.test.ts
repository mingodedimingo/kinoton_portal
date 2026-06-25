import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP 연결 테스트", () => {
  it("네이버 SMTP 서버에 연결할 수 있어야 한다", async () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    expect(host).toBeTruthy();
    expect(user).toBeTruthy();
    expect(pass).toBeTruthy();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    // 실제 연결 검증
    await expect(transporter.verify()).resolves.toBe(true);
  }, 15000);
});

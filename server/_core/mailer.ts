import nodemailer from "nodemailer";

/**
 * 이메일 발송 헬퍼
 * SMTP 환경변수가 없으면 Ethereal(테스트용) 계정을 자동 생성합니다.
 */

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    // SMTP 설정 없으면 Ethereal 테스트 계정 사용 (개발용)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("[Mailer] SMTP 설정 없음 - Ethereal 테스트 계정 사용:", testAccount.user);
  }

  return transporter;
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  name: string
): Promise<void> {
  const t = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@kinoton.co.kr";

  const info = await t.sendMail({
    from: `"키노톤 포탈" <${from}>`,
    to,
    subject: "[키노톤 포탈] 비밀번호 재설정 인증 코드",
    html: `
      <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; font-weight: 700; color: #1a1a1a; margin: 0;">키노톤 포탈</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">비밀번호 재설정</p>
        </div>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">안녕하세요, <strong>${name}</strong>님.</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">아래 인증 코드를 입력하여 비밀번호를 재설정하세요.</p>
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background: #f3f4f6; border-radius: 8px; padding: 20px 40px;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1a1a1a;">${code}</span>
          </div>
        </div>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">이 코드는 <strong>10분</strong> 동안 유효합니다.</p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
      </div>
    `,
  });

  // Ethereal 테스트 계정인 경우 미리보기 URL 출력
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log("[Mailer] 테스트 이메일 미리보기:", previewUrl);
  }
}

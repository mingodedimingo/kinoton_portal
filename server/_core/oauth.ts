import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import bcrypt from "bcryptjs";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // 로그인된 직원의 비밀번호 변경
  app.post("/api/auth/change-password", async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: "새 비밀번호는 6자 이상이어야 합니다." });
      return;
    }

    try {
      // 세션에서 현재 로그인된 사용자 확인
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (!user || !user.openId) {
        res.status(401).json({ error: "로그인이 필요합니다." });
        return;
      }

      // openId 형식: emp_{id}
      const empIdStr = user.openId.replace(/^emp_/, "");
      const empId = parseInt(empIdStr, 10);
      if (isNaN(empId)) {
        res.status(403).json({ error: "직원 계정만 비밀번호를 변경할 수 있습니다." });
        return;
      }

      const employee = await db.getEmployeeById(empId);
      if (!employee) {
        res.status(404).json({ error: "직원 정보를 찾을 수 없습니다." });
        return;
      }

      // 현재 비밀번호 확인 (설정된 경우)
      if (employee.passwordHash && currentPassword) {
        const valid = await bcrypt.compare(currentPassword, employee.passwordHash);
        if (!valid) {
          res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." });
          return;
        }
      } else if (employee.passwordHash && !currentPassword) {
        res.status(400).json({ error: "현재 비밀번호를 입력해주세요." });
        return;
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await db.updateEmployee(empId, { passwordHash: hash });

      res.json({ success: true });
    } catch (error) {
      console.error("[ChangePassword] Failed", error);
      res.status(500).json({ error: "비밀번호 변경 중 오류가 발생했습니다." });
    }
  });

  // 직원 이메일+비밀번호 로그인 (Express 라우트로 쿠키 설정)
  app.post("/api/auth/employee-login", async (req: Request, res: Response) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
      return;
    }

    try {
      const employee = await db.getEmployeeByEmail(email.trim().toLowerCase());

      if (!employee || !employee.isActive) {
        res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      if (!employee.passwordHash) {
        res.status(401).json({ error: "비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요." });
        return;
      }

      const valid = await bcrypt.compare(password, employee.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
        return;
      }

      // users 테이블에 upsert (세션 발급을 위해)
      const openId = `emp_${employee.id}`;
      await db.upsertUser({
        openId,
        name: employee.name || null,
        email: employee.email || null,
        loginMethod: "employee",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: employee.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, name: employee.name });
    } catch (error) {
      console.error("[EmployeeLogin] Failed", error);
      res.status(500).json({ error: "로그인 처리 중 오류가 발생했습니다." });
    }
  });
}

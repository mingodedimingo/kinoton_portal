import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { parse as parseCookies } from "cookie";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

const ADMIN_TOKEN = "kino_admin_v1";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // app_session_id 쿠키로 인증 실패 시, kino_admin 쿠키로 어드민 인증 시도
    try {
      const cookies = parseCookies(opts.req.headers.cookie || "");
      if (cookies.kino_admin === ADMIN_TOKEN) {
        const ownerOpenId = ENV.ownerOpenId;
        if (ownerOpenId) {
          let adminUser = await getUserByOpenId(ownerOpenId);
          if (!adminUser) {
            await upsertUser({ openId: ownerOpenId, name: "관리자", role: "admin" });
            adminUser = await getUserByOpenId(ownerOpenId);
          }
          if (adminUser && adminUser.role !== "admin") {
            // 강제로 admin role 설정
            await upsertUser({ openId: ownerOpenId, role: "admin" });
            adminUser = await getUserByOpenId(ownerOpenId);
          }
          user = adminUser ?? null;
        }
      }
    } catch (adminError) {
      // 어드민 쿠키 인증도 실패 - user는 null 유지
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

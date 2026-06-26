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
  isAdminSession: boolean; // kino_admin 쿠키 보유 여부
};

const ADMIN_TOKEN = "kino_admin_v1";
const FALLBACK_ADMIN_OPEN_ID = "kino_admin_fallback";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const cookies = parseCookies(opts.req.headers.cookie || "");
  const hasAdminCookie = cookies.kino_admin === ADMIN_TOKEN;

  // 일반 포탈 세션 인증 (app_session_id 쿠키 사용)
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    isAdminSession: hasAdminCookie,
  };
}

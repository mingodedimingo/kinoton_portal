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
const FALLBACK_ADMIN_OPEN_ID = "kino_admin_fallback";

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // kino_admin 쿠키가 있으면 최우선으로 어드민으로 인식 (DB/세션 쿠키 불필요)
  const cookies = parseCookies(opts.req.headers.cookie || "");
  if (cookies.kino_admin === ADMIN_TOKEN) {
    // OWNER_OPEN_ID가 있으면 사용, 없으면 fallback ID 사용 (배포 환경에서도 작동)
    const ownerOpenId = ENV.ownerOpenId || FALLBACK_ADMIN_OPEN_ID;
    try {
      let adminUser = await getUserByOpenId(ownerOpenId);
      if (!adminUser) {
        await upsertUser({ openId: ownerOpenId, name: "관리자", role: "admin" });
        adminUser = await getUserByOpenId(ownerOpenId);
      }
      if (adminUser && adminUser.role !== "admin") {
        await upsertUser({ openId: ownerOpenId, role: "admin" });
        adminUser = await getUserByOpenId(ownerOpenId);
      }
      user = adminUser ?? null;
    } catch {
      // DB 조회 실패 시 인라인 admin 유저로 fallback
    }
    // DB 조회 결과가 없어도 인라인 admin 유저 반환 (최후 보루)
    if (!user) {
      user = {
        id: 0,
        openId: ownerOpenId,
        name: "관리자",
        email: null,
        loginMethod: null,
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as User;
    }
    return { req: opts.req, res: opts.res, user };
  }

  // 일반 포탈 세션 인증
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

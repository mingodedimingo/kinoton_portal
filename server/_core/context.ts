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

// 어드민 전용 tRPC 프로시저 경로 목록 (adminProcedure를 사용하는 것들)
// 이 경로로 요청이 올 때만 kino_admin 쿠키를 인증에 사용
const ADMIN_ONLY_PATHS = [
  "employees.create",
  "employees.update",
  "employees.delete",
  "employees.setEmployeePassword",
  "employees.setLeaveBalance",
  "employees.allLeaveBalances",
  "employees.adminList",
  "employees.approve",
  "employees.reject",
  "employees.exportCsv",
  "notices.create",
  "notices.update",
  "notices.delete",
  "hr.create",
  "hr.update",
  "hr.delete",
  "condolences.create",
  "condolences.update",
  "condolences.delete",
  "board.adminCreate",
  "board.adminUpdate",
  "board.adminDelete",
  "attendance.adminList",
  "attendance.exportCsv",
  "leaveRequests.adminList",
  "leaveRequests.approve",
  "leaveRequests.reject",
];

function isAdminOnlyRequest(req: CreateExpressContextOptions["req"]): boolean {
  // URL에서 tRPC 프로시저 경로 추출
  // GET: /api/trpc/notices.list?batch=1...
  // POST: /api/trpc/notices.create?batch=1...
  const url = req.url || "";
  const pathMatch = url.match(/\/api\/trpc\/([^?]+)/);
  if (!pathMatch) return false;

  const procedures = pathMatch[1].split(","); // batch 요청 시 여러 개
  return procedures.some(proc => {
    const cleanProc = proc.trim();
    return ADMIN_ONLY_PATHS.some(adminPath =>
      cleanProc === adminPath || cleanProc.startsWith(adminPath)
    );
  });
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const cookies = parseCookies(opts.req.headers.cookie || "");

  // kino_admin 쿠키가 있고, 어드민 전용 프로시저 요청일 때만 어드민으로 처리
  // 포탈 일반 요청(employees.me, notices.list 등)은 app_session_id로 처리
  if (cookies.kino_admin === ADMIN_TOKEN && isAdminOnlyRequest(opts.req)) {
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

  // 일반 포탈 세션 인증 (app_session_id 쿠키 사용)
  // kino_admin 쿠키가 있어도 포탈 요청이면 app_session_id로만 인증
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

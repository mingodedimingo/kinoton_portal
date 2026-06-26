import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getUserByOpenId, upsertUser } from "../db";
import { ENV } from "./env";

const FALLBACK_ADMIN_OPEN_ID = "kino_admin_fallback";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// adminProcedure: kino_admin 쿠키(isAdminSession)가 있으면 어드민으로 처리
// 포탈 세션(app_session_id)과 완전히 독립적으로 동작
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // kino_admin 쿠키가 있으면 어드민 세션으로 처리 (포탈 세션과 독립)
    if (ctx.isAdminSession) {
      const ownerOpenId = ENV.ownerOpenId || FALLBACK_ADMIN_OPEN_ID;
      let adminUser = null;
      try {
        adminUser = await getUserByOpenId(ownerOpenId);
        if (!adminUser) {
          await upsertUser({ openId: ownerOpenId, name: "관리자", role: "admin" });
          adminUser = await getUserByOpenId(ownerOpenId);
        }
        if (adminUser && adminUser.role !== "admin") {
          await upsertUser({ openId: ownerOpenId, role: "admin" });
          adminUser = await getUserByOpenId(ownerOpenId);
        }
      } catch {
        // DB 조회 실패 시 인라인 admin 유저로 fallback
      }

      // DB 조회 결과가 없어도 인라인 admin 유저 반환
      const user = adminUser ?? ({
        id: 0,
        openId: ownerOpenId,
        name: "관리자",
        email: null,
        loginMethod: null,
        role: "admin" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      } as any);

      return next({
        ctx: {
          ...ctx,
          user,
        },
      });
    }

    // kino_admin 쿠키 없으면 포탈 세션으로 role 체크
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

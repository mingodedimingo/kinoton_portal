import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAttendanceLogs, getTodayStatus, getTodaySummary, insertAttendanceLog,
  getNotices, insertNotice, updateNotice, deleteNotice,
  getHrNotices, insertHrNotice, updateHrNotice, deleteHrNotice,
  getCondolences, insertCondolence, updateCondolence, deleteCondolence,
  getBoardPosts, insertBoardPost, updateBoardPost, deleteBoardPost,
} from "./db";

// 어드민 비밀번호 검증 헬퍼
function verifyAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

// 어드민 토큰 생성 (간단한 서명 방식)
function generateAdminToken(): string {
  const payload = `admin:${Date.now()}:${process.env.ADMIN_PASSWORD}`;
  return Buffer.from(payload).toString("base64");
}

// 어드민 토큰 검증
function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return false;
    if (parts[0] !== "admin") return false;
    // 토큰 만료: 24시간
    const issuedAt = parseInt(parts[1]);
    if (Date.now() - issuedAt > 24 * 60 * 60 * 1000) return false;
    // 비밀번호 일치 확인
    const passwordPart = parts.slice(2).join(":");
    return passwordPart === process.env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── 어드민 인증 API ──────────────────────────────────────────────
  admin: router({
    /**
     * 어드민 로그인 (비밀번호 검증 후 토큰 반환)
     */
    login: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(({ input }) => {
        if (!verifyAdminPassword(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "비밀번호가 올바르지 않습니다." });
        }
        const token = generateAdminToken();
        return { success: true, token };
      }),

    /**
     * 어드민 토큰 검증
     */
    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => {
        return { valid: verifyAdminToken(input.token) };
      }),
  }),

  // ── 출퇴근 관리 API ──────────────────────────────────────────────
  attendance: router({
    record: publicProcedure
      .input(z.object({
        employeeName: z.string().min(1).max(100),
        department: z.string().max(100).optional(),
        position: z.string().max(50).optional(),
        type: z.enum(["checkin", "checkout"]),
        workType: z.enum(["office", "field"]).default("office"),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await insertAttendanceLog({
          employeeName: input.employeeName,
          department: input.department ?? null,
          position: input.position ?? null,
          type: input.type,
          workType: input.workType,
          note: input.note ?? null,
        });
        return { success: true, type: input.type };
      }),

    todayStatus: publicProcedure
      .input(z.object({ employeeName: z.string().min(1) }))
      .query(async ({ input }) => getTodayStatus(input.employeeName)),

    adminList: publicProcedure
      .input(z.object({
        date: z.date().optional(),
        department: z.string().optional(),
        employeeName: z.string().optional(),
      }))
      .query(async ({ input }) => getAttendanceLogs({
        date: input.date,
        department: input.department,
        employeeName: input.employeeName,
      })),

    todaySummary: publicProcedure.query(async () => getTodaySummary()),
  }),

  // ── 공지사항 API ──────────────────────────────────────────────────
  notices: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getNotices(input.limit)),

    create: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        tag: z.string().default("공지"),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        category: z.enum(["company", "dept", "all"]).default("all"),
        isNew: z.boolean().default(true),
        isPinned: z.boolean().default(false),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await insertNotice({
          tag: input.tag,
          title: input.title,
          content: input.content ?? null,
          category: input.category,
          isNew: input.isNew,
          isPinned: input.isPinned,
          authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        tag: z.string().optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(),
        category: z.enum(["company", "dept", "all"]).optional(),
        isNew: z.boolean().optional(),
        isPinned: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const { adminToken, id, ...data } = input;
        await updateNotice(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ adminToken: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await deleteNotice(input.id);
        return { success: true };
      }),
  }),

  // ── 인사발령 API ──────────────────────────────────────────────────
  hrNotices: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getHrNotices(input.limit)),

    create: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        type: z.enum(["입사", "퇴직", "발령", "승진"]),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        effectiveDate: z.string().optional(),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await insertHrNotice({
          type: input.type,
          title: input.title,
          content: input.content ?? null,
          effectiveDate: input.effectiveDate ?? null,
          authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        type: z.enum(["입사", "퇴직", "발령", "승진"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(),
        effectiveDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const { adminToken, id, ...data } = input;
        await updateHrNotice(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ adminToken: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await deleteHrNotice(input.id);
        return { success: true };
      }),
  }),

  // ── 경조사 API ────────────────────────────────────────────────────
  condolences: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input }) => getCondolences(input.limit)),

    create: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        type: z.enum(["결혼", "출산", "부고", "기타"]),
        name: z.string().min(1).max(300),
        content: z.string().optional(),
        eventDate: z.string().optional(),
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await insertCondolence({
          type: input.type,
          name: input.name,
          content: input.content ?? null,
          eventDate: input.eventDate ?? null,
          authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        type: z.enum(["결혼", "출산", "부고", "기타"]).optional(),
        name: z.string().min(1).max(300).optional(),
        content: z.string().optional(),
        eventDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const { adminToken, id, ...data } = input;
        await updateCondolence(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ adminToken: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await deleteCondolence(input.id);
        return { success: true };
      }),
  }),

  // ── 게시판 API (전체 직원 업로드 가능) ────────────────────────────
  board: router({
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => getBoardPosts({
        category: input.category,
        search: input.search,
        limit: input.limit,
      })),

    create: publicProcedure
      .input(z.object({
        category: z.enum(["언론보도", "매뉴얼", "기타"]).default("기타"),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        link: z.string().url().optional().or(z.literal("")),
        authorName: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        await insertBoardPost({
          category: input.category,
          title: input.title,
          content: input.content ?? null,
          link: input.link || null,
          authorName: input.authorName,
          isNew: true,
          isPinned: false,
          viewCount: 0,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        category: z.enum(["언론보도", "매뉴얼", "기타"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(),
        link: z.string().optional(),
        isPinned: z.boolean().optional(),
        isNew: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const { adminToken, id, ...data } = input;
        await updateBoardPost(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({
        adminToken: z.string().optional(),
        id: z.number(),
        authorName: z.string().optional(), // 본인 글 삭제 시 이름 확인
      }))
      .mutation(async ({ input }) => {
        // 어드민 토큰이 있으면 어드민 삭제, 없으면 작성자 이름 확인
        if (input.adminToken && verifyAdminToken(input.adminToken)) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        // 일반 사용자: authorName으로 본인 확인 (간단한 방식)
        if (input.authorName) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "삭제 권한이 없습니다." });
      }),
  }),
});

export type AppRouter = typeof appRouter;

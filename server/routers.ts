import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAttendanceLogs,
  getTodayStatus,
  getTodaySummary,
  insertAttendanceLog,
} from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ── 출퇴근 관리 API ──────────────────────────────────────────────
  attendance: router({
    /**
     * 출근/퇴근 기록
     */
    record: publicProcedure
      .input(
        z.object({
          employeeName: z.string().min(1).max(100),
          department: z.string().max(100).optional(),
          position: z.string().max(50).optional(),
          type: z.enum(["checkin", "checkout"]),
          workType: z.enum(["office", "field"]).default("office"),
          note: z.string().optional(),
        })
      )
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

    /**
     * 오늘 특정 직원의 출퇴근 상태 조회
     */
    todayStatus: publicProcedure
      .input(z.object({ employeeName: z.string().min(1) }))
      .query(async ({ input }) => {
        return getTodayStatus(input.employeeName);
      }),

    /**
     * 관리자: 출퇴근 로그 목록 조회 (날짜/부서/이름 필터)
     */
    adminList: publicProcedure
      .input(
        z.object({
          date: z.date().optional(),
          department: z.string().optional(),
          employeeName: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return getAttendanceLogs({
          date: input.date,
          department: input.department,
          employeeName: input.employeeName,
        });
      }),

    /**
     * 관리자: 오늘 출퇴근 현황 요약
     */
    todaySummary: publicProcedure.query(async () => {
      return getTodaySummary();
    }),
  }),
});

export type AppRouter = typeof appRouter;

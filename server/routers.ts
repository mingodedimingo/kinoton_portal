import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  getAttendanceLogs, getTodayStatus, getTodaySummary, insertAttendanceLog,
  getNotices, getNoticeById, insertNotice, updateNotice, deleteNotice,
  getHrNotices, getHrNoticeById, insertHrNotice, updateHrNotice, deleteHrNotice,
  getCondolences, getCondolenceById, insertCondolence, updateCondolence, deleteCondolence,
  getBoardPosts, getBoardPostById, insertBoardPost, updateBoardPost, deleteBoardPost,
  getEmployees, getEmployeeById, insertEmployee, updateEmployee, deleteEmployee,
  getLeaveBalance, getAllLeaveBalances, upsertLeaveBalance, updateLeaveUsed,
  getLeaveRequests, insertLeaveRequest, updateLeaveRequestStatus, getLeaveRequestById,
} from "./db";

const COOKIE_NAME = "manus_session";

export const appRouter = router({
  system: systemRouter,

  // ── 인증 API ──────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── 직원 관리 API ────────────────────────────────────────────────
  employees: router({
    // 직원 목록 조회 (로그인 필수)
    list: protectedProcedure
      .input(z.object({ activeOnly: z.boolean().default(true) }))
      .query(async ({ input }) => getEmployees(input.activeOnly)),

    // 직원 단건 조회 (로그인 필수)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getEmployeeById(input.id)),

    // 직원 등록 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        department: z.string().min(1).max(100),
        position: z.string().min(1).max(50),
        ext: z.string().max(20).optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        joinDate: z.string().min(1),
        profileImage: z.string().optional(),
        annualLeave: z.number().default(15),
      }))
      .mutation(async ({ input }) => {
        const empId = await insertEmployee({
          name: input.name,
          department: input.department,
          position: input.position,
          ext: input.ext || null,
          email: input.email || null,
          phone: input.phone || null,
          joinDate: input.joinDate,
          profileImage: input.profileImage || null,
          isActive: true,
        });
        const currentYear = new Date().getFullYear();
        await upsertLeaveBalance(empId, currentYear, String(input.annualLeave));
        return { success: true, id: empId };
      }),

    // 직원 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        department: z.string().min(1).max(100).optional(),
        position: z.string().min(1).max(50).optional(),
        ext: z.string().max(20).optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        joinDate: z.string().optional(),
        profileImage: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateEmployee(id, data);
        return { success: true };
      }),

    // 직원 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteEmployee(input.id);
        return { success: true };
      }),

    // 연차 부여 (어드민 전용)
    setLeaveBalance: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number(),
        totalDays: z.number().min(0).max(365),
      }))
      .mutation(async ({ input }) => {
        await upsertLeaveBalance(input.employeeId, input.year, String(input.totalDays));
        return { success: true };
      }),

    // 연차 잔액 조회 (로그인 필수)
    leaveBalance: protectedProcedure
      .input(z.object({ employeeId: z.number(), year: z.number().optional() }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        const balance = await getLeaveBalance(input.employeeId, year);
        if (!balance) return { totalDays: 15, usedDays: 0, remainingDays: 15, year };
        const total = parseFloat(String(balance.totalDays));
        const used = parseFloat(String(balance.usedDays));
        return { totalDays: total, usedDays: used, remainingDays: total - used, year };
      }),

    // 전체 직원 연차 현황 (어드민 전용)
    allLeaveBalances: adminProcedure
      .input(z.object({ year: z.number().optional() }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        const [emps, balances] = await Promise.all([
          getEmployees(true),
          getAllLeaveBalances(year),
        ]);
        return emps.map(emp => {
          const bal = balances.find(b => b.employeeId === emp.id);
          const total = bal ? parseFloat(String(bal.totalDays)) : 15;
          const used = bal ? parseFloat(String(bal.usedDays)) : 0;
          return {
            employee: emp,
            totalDays: total,
            usedDays: used,
            remainingDays: total - used,
          };
        });
      }),
  }),

  // ── 연차 신청 API ────────────────────────────────────────────────
  leave: router({
    // 연차 신청 (로그인 필수)
    request: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        employeeName: z.string().min(1),
        department: z.string().min(1),
        leaveType: z.enum(["연차", "반차(오전)", "반차(오후)", "반반차", "병가", "경조휴가", "기타"]),
        startDate: z.string().min(1),
        endDate: z.string().min(1),
        days: z.number().min(0.25).max(365),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const year = parseInt(input.startDate.substring(0, 4));
        const balance = await getLeaveBalance(input.employeeId, year);
        const total = balance ? parseFloat(String(balance.totalDays)) : 15;
        const used = balance ? parseFloat(String(balance.usedDays)) : 0;
        const remaining = total - used;
        if (input.days > remaining) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `잔여 연차(${remaining}일)가 부족합니다.`,
          });
        }
        const id = await insertLeaveRequest({
          employeeId: input.employeeId,
          employeeName: input.employeeName,
          department: input.department,
          leaveType: input.leaveType,
          startDate: input.startDate,
          endDate: input.endDate,
          days: String(input.days),
          reason: input.reason ?? null,
          status: "대기",
        });
        return { success: true, id };
      }),

    // 내 연차 신청 이력 (로그인 필수)
    myRequests: protectedProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        return getLeaveRequests({ employeeId: input.employeeId, year });
      }),

    // 전체 연차 신청 목록 (어드민 전용)
    adminList: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        year: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        return getLeaveRequests({ status: input.status, year });
      }),

    // 연차 승인 (어드민 전용)
    approve: adminProcedure
      .input(z.object({
        id: z.number(),
        approverName: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const approverName = ctx.user.name ?? input.approverName;
        const req = await getLeaveRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "신청 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        }
        await updateLeaveRequestStatus(input.id, "승인", approverName);
        const year = parseInt(req.startDate.substring(0, 4));
        await updateLeaveUsed(req.employeeId, year, String(req.days));
        return { success: true };
      }),

    // 연차 반려 (어드민 전용)
    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        approverName: z.string().min(1),
        rejectReason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const approverName = ctx.user.name ?? input.approverName;
        const req = await getLeaveRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "신청 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        }
        await updateLeaveRequestStatus(input.id, "반려", approverName, input.rejectReason);
        return { success: true };
      }),
  }),

  // ── 출퇴근 관리 API ──────────────────────────────────────────────
  attendance: router({
    // 출퇴근 기록 (로그인 필수)
    record: protectedProcedure
      .input(z.object({
        employeeId: z.number().optional(),
        employeeName: z.string().min(1).max(100),
        department: z.string().max(100).optional(),
        position: z.string().max(50).optional(),
        type: z.enum(["checkin", "checkout"]),
        workType: z.enum(["office", "field"]).default("office"),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await insertAttendanceLog({
          employeeId: input.employeeId ?? null,
          employeeName: input.employeeName,
          department: input.department ?? null,
          position: input.position ?? null,
          type: input.type,
          workType: input.workType,
          note: input.note ?? null,
        });
        return { success: true, type: input.type };
      }),

    // 오늘 출퇴근 상태 (로그인 필수)
    todayStatus: protectedProcedure
      .input(z.object({ employeeName: z.string().min(1) }))
      .query(async ({ input }) => getTodayStatus(input.employeeName)),

    // 출퇴근 목록 (어드민 전용)
    adminList: adminProcedure
      .input(z.object({
        date: z.date().optional(),
        department: z.string().optional(),
        employeeName: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => getAttendanceLogs({
        date: input.date,
        department: input.department,
        employeeName: input.employeeName,
        startDate: input.startDate,
        endDate: input.endDate,
      })),

    // 오늘 요약 (로그인 필수)
    todaySummary: protectedProcedure.query(async () => getTodaySummary()),

    // 개인 출퇴근 이력 (로그인 필수)
    myHistory: protectedProcedure
      .input(z.object({
        employeeName: z.string().min(1),
        days: z.number().default(7),
      }))
      .query(async ({ input }) => {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);
        startDate.setHours(0, 0, 0, 0);
        const logs = await getAttendanceLogs({ employeeName: input.employeeName, startDate, endDate });
        const grouped: Record<string, { date: string; checkIn: string | null; checkOut: string | null; workType: string; workHours: string | null }> = {};
        for (const log of logs) {
          const dateKey = log.recordedAt.toISOString().substring(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, checkIn: null, checkOut: null, workType: log.workType === 'office' ? '내근' : '외근', workHours: null };
          const timeStr = log.recordedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
          if (log.type === 'checkin') grouped[dateKey].checkIn = timeStr;
          else grouped[dateKey].checkOut = timeStr;
        }
        for (const entry of Object.values(grouped)) {
          if (entry.checkIn && entry.checkOut) {
            const [ih, im] = entry.checkIn.split(':').map(Number);
            const [oh, om] = entry.checkOut.split(':').map(Number);
            const mins = (oh * 60 + om) - (ih * 60 + im);
            if (mins > 0) entry.workHours = (mins / 60).toFixed(1);
          }
        }
        return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
      }),

    // CSV 내보내기 (어드민 전용)
    exportCsv: adminProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        const logs = await getAttendanceLogs({ startDate: input.startDate, endDate: input.endDate });
        const headers = ["사원명", "부서", "직위", "날짜", "출근시간", "퇴근시간", "근무형태"];
        const grouped: Record<string, { checkin?: string; checkout?: string; department?: string; position?: string; workType?: string }> = {};
        for (const log of logs) {
          const dateKey = log.recordedAt.toISOString().substring(0, 10);
          const key = `${log.employeeName}__${dateKey}`;
          if (!grouped[key]) grouped[key] = {};
          const timeStr = log.recordedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
          if (log.type === "checkin") {
            grouped[key].checkin = timeStr;
            grouped[key].department = log.department ?? "";
            grouped[key].position = log.position ?? "";
            grouped[key].workType = log.workType === "office" ? "내근" : "외근";
          } else {
            grouped[key].checkout = timeStr;
          }
        }
        const rows = Object.entries(grouped).map(([key, val]) => {
          const [name, date] = key.split("__");
          return [name, val.department ?? "", val.position ?? "", date, val.checkin ?? "", val.checkout ?? "", val.workType ?? "내근"];
        });
        const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
        return { csv, rowCount: rows.length };
      }),
  }),

  // ── 공지사항 API ──────────────────────────────────────────────────
  notices: router({
    // 목록 조회 (로그인 필수)
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getNotices(input.limit ?? 20, input.offset ?? 0)),

    // 단건 조회 (로그인 필수)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const notice = await getNoticeById(input.id);
        if (!notice) throw new TRPCError({ code: 'NOT_FOUND', message: '공지사항을 찾을 수 없습니다.' });
        return notice;
      }),

    // 작성 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        tag: z.string().default("공지"),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        category: z.enum(["company", "dept", "all"]).default("all"),
        isNew: z.boolean().default(true),
        isPinned: z.boolean().default(false),
        authorName: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertNotice({
          tag: input.tag, title: input.title, content: input.content ?? null,
          category: input.category, isNew: input.isNew, isPinned: input.isPinned,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
        });
        return { success: true };
      }),

    // 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        tag: z.string().optional(), title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), category: z.enum(["company", "dept", "all"]).optional(),
        isNew: z.boolean().optional(), isPinned: z.boolean().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, ...rest } = input;
        await updateNotice(id, { ...rest, images: images !== undefined ? JSON.stringify(images) : undefined });
        return { success: true };
      }),

    // 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteNotice(input.id);
        return { success: true };
      }),
  }),

  // ── 인사발령 API ──────────────────────────────────────────────────
  hrNotices: router({
    // 목록 조회 (로그인 필수)
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getHrNotices(input.limit ?? 20, input.offset ?? 0)),

    // 단건 조회 (로그인 필수)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const item = await getHrNoticeById(input.id);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: '인사발령을 찾을 수 없습니다.' });
        return item;
      }),

    // 작성 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        type: z.enum(["입사", "퇴직", "발령", "승진"]),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        effectiveDate: z.string().optional(),
        authorName: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertHrNotice({
          type: input.type, title: input.title, content: input.content ?? null,
          effectiveDate: input.effectiveDate ?? null,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
        });
        return { success: true };
      }),

    // 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["입사", "퇴직", "발령", "승진"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), effectiveDate: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, ...rest } = input;
        await updateHrNotice(id, { ...rest, images: images !== undefined ? JSON.stringify(images) : undefined });
        return { success: true };
      }),

    // 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteHrNotice(input.id);
        return { success: true };
      }),
  }),

  // ── 경조사 API ────────────────────────────────────────────────────
  condolences: router({
    // 목록 조회 (로그인 필수)
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => getCondolences(input.limit ?? 20, input.offset ?? 0)),

    // 단건 조회 (로그인 필수)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const item = await getCondolenceById(input.id);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: '경조사 정보를 찾을 수 없습니다.' });
        return item;
      }),

    // 작성 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        type: z.enum(["결혼", "출산", "부고", "기타"]),
        name: z.string().min(1).max(300),
        content: z.string().optional(),
        eventDate: z.string().optional(),
        authorName: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertCondolence({
          type: input.type, name: input.name, content: input.content ?? null,
          eventDate: input.eventDate ?? null,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
        });
        return { success: true };
      }),

    // 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["결혼", "출산", "부고", "기타"]).optional(),
        name: z.string().min(1).max(300).optional(),
        content: z.string().optional(), eventDate: z.string().optional(),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, ...rest } = input;
        await updateCondolence(id, { ...rest, images: images !== undefined ? JSON.stringify(images) : undefined });
        return { success: true };
      }),

    // 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCondolence(input.id);
        return { success: true };
      }),
  }),

  // ── 게시판 API ────────────────────────────────────────────────────
  board: router({
    // 목록 조회 (로그인 필수)
    list: protectedProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }))
      .query(async ({ input }) => getBoardPosts({
        category: input.category, search: input.search, limit: input.limit, offset: input.offset,
      })),

    // 게시글 작성 (로그인 필수 — 전 직원 가능)
    create: protectedProcedure
      .input(z.object({
        category: z.enum(["\uc5b8\ub860\ubcf4\ub3c4", "\ub9e4\ub274\uc5bc", "\uae30\ud0c0"]).default("\uae30\ud0c0"),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        link: z.string().url().optional().or(z.literal("")),
        authorName: z.string().min(1).max(100),
        images: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertBoardPost({
          category: input.category, title: input.title, content: input.content ?? null,
          link: input.link || null, authorName: input.authorName,
          authorOpenId: ctx.user.openId, // \uc791\uc131\uc790 openId \uc800\uc7a5
          isNew: true, isPinned: false, viewCount: 0,
          images: input.images ? JSON.stringify(input.images) : null,
        });
        return { success: true };
      }),

    // 게시글 단건 조회 (로그인 필수)
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const rows = await getBoardPostById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' });
        return rows[0];
      }),

    // 게시글 수정 (작성자 본인 또는 어드민)
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        category: z.enum(["언론보도", "매뉴얼", "기타"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), link: z.string().optional(),
        images: z.array(z.string()).optional(),
        isPinned: z.boolean().optional(), isNew: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const rows = await getBoardPostById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' });
        const post = rows[0];
        if (ctx.user.role !== 'admin' && post.authorOpenId !== ctx.user.openId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '수정 권한이 없습니다.' });
        }
        const { id, images, ...rest } = input;
        await updateBoardPost(id, { ...rest, images: images !== undefined ? JSON.stringify(images) : undefined });
        return { success: true };
      }),

    // 게시글 삭제 (어드민 또는 작성자 본인 — DB에서 openId 조회하여 확인)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // DB에서 게시글 직접 조회 (getBoardPostById)
        const rows = await getBoardPostById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' });
        const post = rows[0];
        // 어드민은 무조건 삭제 가능
        if (ctx.user.role === 'admin') {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        // 일반 사용자는 본인 글만 삭제 (DB의 authorOpenId와 세션 openId 비교)
        if (post.authorOpenId && post.authorOpenId === ctx.user.openId) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        throw new TRPCError({ code: 'FORBIDDEN', message: '삭제 권한이 없습니다.' });
      }),
  }),
});

export type AppRouter = typeof appRouter;

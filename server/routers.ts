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
  getEmployees, getEmployeeById, insertEmployee, updateEmployee, deleteEmployee,
  getLeaveBalance, getAllLeaveBalances, upsertLeaveBalance, updateLeaveUsed,
  getLeaveRequests, insertLeaveRequest, updateLeaveRequestStatus, getLeaveRequestById,
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
    login: publicProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(({ input }) => {
        if (!verifyAdminPassword(input.password)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "비밀번호가 올바르지 않습니다." });
        }
        const token = generateAdminToken();
        return { success: true, token };
      }),

    verify: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(({ input }) => {
        return { valid: verifyAdminToken(input.token) };
      }),
  }),

  // ── 직원 관리 API ────────────────────────────────────────────────
  employees: router({
    list: publicProcedure
      .input(z.object({ activeOnly: z.boolean().default(true) }))
      .query(async ({ input }) => getEmployees(input.activeOnly)),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getEmployeeById(input.id)),

    create: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        name: z.string().min(1).max(100),
        department: z.string().min(1).max(100),
        position: z.string().min(1).max(50),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        joinDate: z.string().min(1), // YYYY-MM-DD
        profileImage: z.string().optional(), // 프로필 사진 URL
        annualLeave: z.number().default(15), // 초기 연차 일수
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const empId = await insertEmployee({
          name: input.name,
          department: input.department,
          position: input.position,
          email: input.email || null,
          phone: input.phone || null,
          joinDate: input.joinDate,
          profileImage: input.profileImage || null,
          isActive: true,
        });
        // 현재 연도 연차 자동 생성
        const currentYear = new Date().getFullYear();
        await upsertLeaveBalance(empId, currentYear, String(input.annualLeave));
        return { success: true, id: empId };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        department: z.string().min(1).max(100).optional(),
        position: z.string().min(1).max(50).optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        joinDate: z.string().optional(),
        profileImage: z.string().optional(), // 프로필 사진 URL
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const { adminToken, id, ...data } = input;
        await updateEmployee(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ adminToken: z.string(), id: z.number() }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await deleteEmployee(input.id);
        return { success: true };
      }),

    // 연차 부여 (어드민)
    setLeaveBalance: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        employeeId: z.number(),
        year: z.number(),
        totalDays: z.number().min(0).max(365),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        await upsertLeaveBalance(input.employeeId, input.year, String(input.totalDays));
        return { success: true };
      }),

    // 연차 잔액 조회
    leaveBalance: publicProcedure
      .input(z.object({ employeeId: z.number(), year: z.number().optional() }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        const balance = await getLeaveBalance(input.employeeId, year);
        if (!balance) return { totalDays: 15, usedDays: 0, remainingDays: 15, year };
        const total = parseFloat(String(balance.totalDays));
        const used = parseFloat(String(balance.usedDays));
        return { totalDays: total, usedDays: used, remainingDays: total - used, year };
      }),

    // 전체 직원 연차 현황 (어드민)
    allLeaveBalances: publicProcedure
      .input(z.object({ adminToken: z.string(), year: z.number().optional() }))
      .query(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
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
    // 연차 신청 (직원)
    request: publicProcedure
      .input(z.object({
        employeeId: z.number(),
        employeeName: z.string().min(1),
        department: z.string().min(1),
        leaveType: z.enum(["연차", "반차(오전)", "반차(오후)", "반반차", "병가", "경조휴가", "기타"]),
        startDate: z.string().min(1), // YYYY-MM-DD
        endDate: z.string().min(1),
        days: z.number().min(0.25).max(365),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 잔여 연차 확인
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

    // 내 연차 신청 이력
    myRequests: publicProcedure
      .input(z.object({
        employeeId: z.number(),
        year: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const year = input.year ?? new Date().getFullYear();
        return getLeaveRequests({ employeeId: input.employeeId, year });
      }),

    // 전체 연차 신청 목록 (어드민)
    adminList: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        status: z.string().optional(),
        year: z.number().optional(),
      }))
      .query(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const year = input.year ?? new Date().getFullYear();
        return getLeaveRequests({ status: input.status, year });
      }),

    // 연차 승인 (어드민)
    approve: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        approverName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const req = await getLeaveRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "신청 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        }
        await updateLeaveRequestStatus(input.id, "승인", input.approverName);
        // 연차 사용일수 업데이트
        const year = parseInt(req.startDate.substring(0, 4));
        await updateLeaveUsed(req.employeeId, year, String(req.days));
        return { success: true };
      }),

    // 연차 반려 (어드민)
    reject: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        id: z.number(),
        approverName: z.string().min(1),
        rejectReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const req = await getLeaveRequestById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "신청 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        }
        await updateLeaveRequestStatus(input.id, "반려", input.approverName, input.rejectReason);
        return { success: true };
      }),
  }),

  // ── 출퇴근 관리 API ──────────────────────────────────────────────
  attendance: router({
    record: publicProcedure
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

    todayStatus: publicProcedure
      .input(z.object({ employeeName: z.string().min(1) }))
      .query(async ({ input }) => getTodayStatus(input.employeeName)),

    adminList: publicProcedure
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

    todaySummary: publicProcedure.query(async () => getTodaySummary()),

    // 개인 출퇴근 이력 (날짜 문자열 기반)
    myHistory: publicProcedure
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
        // 날짜별 그룹핑
        const grouped: Record<string, { date: string; checkIn: string | null; checkOut: string | null; workType: string; workHours: string | null }> = {};
        for (const log of logs) {
          const dateKey = log.recordedAt.toISOString().substring(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, checkIn: null, checkOut: null, workType: log.workType === 'office' ? '내근' : '외근', workHours: null };
          const timeStr = log.recordedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
          if (log.type === 'checkin') grouped[dateKey].checkIn = timeStr;
          else grouped[dateKey].checkOut = timeStr;
        }
        // 근무시간 계산
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

    // CSV 내보내기 (이카운트 업로드용)
    exportCsv: publicProcedure
      .input(z.object({
        adminToken: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .query(async ({ input }) => {
        if (!verifyAdminToken(input.adminToken)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "어드민 권한이 필요합니다." });
        }
        const logs = await getAttendanceLogs({ startDate: input.startDate, endDate: input.endDate });
        // CSV 형식 생성 (이카운트 근태 업로드 형식)
        const headers = ["사원명", "부서", "직위", "날짜", "출근시간", "퇴근시간", "근무형태"];
        // 날짜별로 그룹핑
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
          tag: input.tag, title: input.title, content: input.content ?? null,
          category: input.category, isNew: input.isNew, isPinned: input.isPinned,
          authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(), id: z.number(),
        tag: z.string().optional(), title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), category: z.enum(["company", "dept", "all"]).optional(),
        isNew: z.boolean().optional(), isPinned: z.boolean().optional(),
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
          type: input.type, title: input.title, content: input.content ?? null,
          effectiveDate: input.effectiveDate ?? null, authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(), id: z.number(),
        type: z.enum(["입사", "퇴직", "발령", "승진"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), effectiveDate: z.string().optional(),
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
          type: input.type, name: input.name, content: input.content ?? null,
          eventDate: input.eventDate ?? null, authorName: input.authorName ?? null,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(), id: z.number(),
        type: z.enum(["결혼", "출산", "부고", "기타"]).optional(),
        name: z.string().min(1).max(300).optional(),
        content: z.string().optional(), eventDate: z.string().optional(),
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
        category: input.category, search: input.search, limit: input.limit,
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
          category: input.category, title: input.title, content: input.content ?? null,
          link: input.link || null, authorName: input.authorName,
          isNew: true, isPinned: false, viewCount: 0,
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        adminToken: z.string(), id: z.number(),
        category: z.enum(["언론보도", "매뉴얼", "기타"]).optional(),
        title: z.string().min(1).max(300).optional(),
        content: z.string().optional(), link: z.string().optional(),
        isPinned: z.boolean().optional(), isNew: z.boolean().optional(),
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
        authorName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.adminToken && verifyAdminToken(input.adminToken)) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        if (input.authorName) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "삭제 권한이 없습니다." });
      }),
  }),
});

export type AppRouter = typeof appRouter;

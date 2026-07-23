import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  getAttendanceLogs, getTodayStatus, getTodaySummary, insertAttendanceLog, upsertTodayAttendanceLog,
  getNotices, getNoticeById, insertNotice, updateNotice, deleteNotice,
  getHrNotices, getHrNoticeById, insertHrNotice, updateHrNotice, deleteHrNotice,
  getCondolences, getCondolenceById, insertCondolence, updateCondolence, deleteCondolence,
  getBoardPosts, getBoardPostById, insertBoardPost, updateBoardPost, deleteBoardPost,
  getEmployees, getEmployeeById, insertEmployee, updateEmployee, deleteEmployee,
  getLeaveBalance, getAllLeaveBalances, upsertLeaveBalance, updateLeaveUsed,
  getLeaveRequests, insertLeaveRequest, updateLeaveRequestStatus, getLeaveRequestById,
  getCalendarEvents, getTodayEvents, getCalendarEventById, insertCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  getEmployeeByEmail, upsertUser, getUserByOpenId,
  createPasswordResetToken, getValidPasswordResetToken, markPasswordResetTokenUsed,
  insertReservation, getReservations, getReservationsByDateRange, getReservationById,
  updateReservationStatus,
  getReservationResources, getReservationResourceById,
  insertReservationResource, updateReservationResource, deleteReservationResource,
  getBanners, getBannerById, insertBanner, updateBanner, deleteBanner,
} from "./db";
import bcrypt from "bcryptjs";
import { sendPasswordResetEmail } from "./_core/mailer";
import { storagePut } from "./storage";

// COOKIE_NAME은 @shared/const에서 import (app_session_id)

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

    // 직원 이메일+비밀번호 로그인
    employeeLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const employee = await getEmployeeByEmail(input.email);
        if (!employee || !employee.isActive) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        if (!employee.passwordHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '비밀번호가 설정되지 않은 계정입니다. 관리자에게 문의하세요.' });
        }
        const isValid = await bcrypt.compare(input.password, employee.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }
        // 직원 openId: emp_{id} 형식으로 users 테이블에 upsert (기존 role 보존)
        const openId = `emp_${employee.id}`;
        const existingUser = await getUserByOpenId(openId);
        await upsertUser({
          openId,
          name: employee.name,
          email: employee.email ?? undefined,
          loginMethod: 'employee',
          lastSignedIn: new Date(),
          // 기존에 admin으로 설정된 경우 role 유지
          role: existingUser?.role === 'admin' ? 'admin' : undefined,
        });
        const token = await sdk.createSessionToken(openId, { name: employee.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS }); // 8시간 (shared/const.ts)
        return { success: true, name: employee.name };
      }),

    // 비밀번호 재설정 코드 발송 (공개)
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const employee = await getEmployeeByEmail(input.email.trim().toLowerCase());
        // 보안상 직원 존재 여부 노출 안 함
        if (!employee || !employee.isActive) {
          return { success: true };
        }
        // 6자리 랜덤 숫자 코드 생성
        const code = String(Math.floor(100000 + Math.random() * 900000));
        await createPasswordResetToken(input.email.trim().toLowerCase(), code);
        await sendPasswordResetEmail(input.email.trim().toLowerCase(), code, employee.name);
        return { success: true };
      }),

    // 인증 코드 확인 후 비밀번호 재설정 (공개)
    resetPassword: publicProcedure
      .input(z.object({
        email: z.string().email(),
        code: z.string().length(6),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const token = await getValidPasswordResetToken(
          input.email.trim().toLowerCase(),
          input.code
        );
        if (!token) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '인증 코드가 올바르지 않거나 만료되었습니다.',
          });
        }
        const employee = await getEmployeeByEmail(input.email.trim().toLowerCase());
        if (!employee) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '직원 정보를 찾을 수 없습니다.' });
        }
        const hash = await bcrypt.hash(input.newPassword, 10);
        await updateEmployee(employee.id, { passwordHash: hash });
        await markPasswordResetTokenUsed(token.id);
        return { success: true };
      }),

    // 직원 비밀번호 설정 (어드민 전용)
    setEmployeePassword: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        const hash = await bcrypt.hash(input.password, 10);
        await updateEmployee(input.employeeId, { passwordHash: hash });
        return { success: true };
      }),
  }),

  // ── 직원 관리 API ────────────────────────────────────────────────
  employees: router({
    // 내 직원 정보 조회 (로그인 유저 → 직원 매핑)
    me: protectedProcedure
      .query(async ({ ctx }) => {
        const openId = ctx.user.openId;
        // emp_{id} 형식이면 직접 ID로 조회
        if (openId.startsWith('emp_')) {
          const empId = parseInt(openId.replace('emp_', ''));
          if (!isNaN(empId)) {
            const emp = await getEmployeeById(empId);
            return emp ?? null;
          }
        }
        // OAuth 로그인이면 이메일로 매핑
        if (ctx.user.email) {
          const emp = await getEmployeeByEmail(ctx.user.email);
          return emp ?? null;
        }
        // 이름으로 매핑 시도
        if (ctx.user.name) {
          const allEmps = await getEmployees(true);
          const found = allEmps.find(e => e.name === ctx.user.name);
          return found ?? null;
        }
        return null;
      }),

    // 내 프로필 이미지 업데이트
    updateMyProfile: protectedProcedure
      .input(z.object({
        profileImage: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const openId = ctx.user.openId;
        let empId: number | null = null;
        if (openId.startsWith('emp_')) {
          empId = parseInt(openId.replace('emp_', ''));
          if (isNaN(empId)) empId = null;
        }
        if (!empId && ctx.user.email) {
          const emp = await getEmployeeByEmail(ctx.user.email);
          empId = emp?.id ?? null;
        }
        if (!empId) throw new TRPCError({ code: 'NOT_FOUND', message: '직원 정보를 찾을 수 없습니다.' });
        await updateEmployee(empId, { profileImage: input.profileImage });
        return { success: true };
      }),

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
        employmentStatus: z.enum(["재직", "퇴사", "휴직"]).optional(),
        statusChangeDate: z.string().optional(),
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

    // 직원 어드민 권한 설정 (어드민 전용)
    setAdminRole: adminProcedure
      .input(z.object({
        employeeId: z.number(),
        isAdmin: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        const openId = `emp_${input.employeeId}`;
        const role = input.isAdmin ? 'admin' : 'user';
        await upsertUser({ openId, role });
        return { success: true };
      }),

    // 직원 어드민 권한 조회 (어드민 전용)
    getAdminRoles: adminProcedure
      .query(async () => {
        const db = await (await import('./db')).getDb();
        if (!db) return [];
        const { users } = await import('../drizzle/schema');
        const { like, eq } = await import('drizzle-orm');
        const rows = await db.select().from(users).where(like(users.openId, 'emp_%'));
        return rows.map(r => ({ openId: r.openId, role: r.role }));
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
      .mutation(async ({ input, ctx }) => {
        // 본인 확인: 세션의 openId가 emp_{employeeId}와 일치해야 함 (어드민 제외)
        const sessionOpenId = ctx.user.openId;
        const expectedOpenId = `emp_${input.employeeId}`;
        if (ctx.user.role !== 'admin' && !ctx.isAdminSession && sessionOpenId !== expectedOpenId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '본인의 연차만 신청할 수 있습니다.' });
        }
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
        // 당일 동일 타입 기록이 있으면 삭제 후 새로 삽입 (오버라이드 허용)
        await upsertTodayAttendanceLog({
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
        // YYYY-MM-DD 문자열로 받아 서버에서 KST 범위 계산 (타임존 변환 문제 방지)
        dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        department: z.string().optional(),
        employeeName: z.string().optional(),
        startDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }))
      .query(async ({ input }) => {
        // YYYY-MM-DD 문자열을 KST 기준 UTC Date로 변환
        const dateToUTC = (str: string, isEnd = false) =>
          new Date(`${str}T${isEnd ? '23:59:59' : '00:00:00'}+09:00`);
        return getAttendanceLogs({
          date: undefined,
          ...(input.dateStr ? {
            startDate: dateToUTC(input.dateStr),
            endDate: dateToUTC(input.dateStr, true),
          } : {}),
          ...(input.startDateStr ? { startDate: dateToUTC(input.startDateStr) } : {}),
          ...(input.endDateStr ? { endDate: dateToUTC(input.endDateStr, true) } : {}),
          department: input.department,
          employeeName: input.employeeName,
        });
      }),

    // 오늘 요약 (로그인 필수)
    todaySummary: protectedProcedure.query(async () => getTodaySummary()),

    // 개인 출퇴근 이력 (로그인 필수)
    myHistory: protectedProcedure
      .input(z.object({
        employeeName: z.string().min(1),
        days: z.number().default(7),
      }))
      .query(async ({ input }) => {
        // KST 기준 오늘 자정 ~ 23:59:59 계산
        const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
        const todayKSTStr = nowKST.toISOString().substring(0, 10);
        const endDate = new Date(`${todayKSTStr}T23:59:59+09:00`);
        // N일 전 KST 날짜 계산
        const pastKST = new Date(nowKST.getTime() - input.days * 24 * 60 * 60 * 1000);
        const pastKSTStr = pastKST.toISOString().substring(0, 10);
        const startDate = new Date(`${pastKSTStr}T00:00:00+09:00`);
        const logs = await getAttendanceLogs({ employeeName: input.employeeName, startDate, endDate });
        const grouped: Record<string, { date: string; checkIn: string | null; checkOut: string | null; workType: string; workHours: string | null }> = {};
        for (const log of logs) {
          // KST 기준 날짜 계산 (UTC+9)
          const kstDate = new Date(log.recordedAt.getTime() + 9 * 60 * 60 * 1000);
          const dateKey = kstDate.toISOString().substring(0, 10);
          if (!grouped[dateKey]) grouped[dateKey] = { date: dateKey, checkIn: null, checkOut: null, workType: log.workType === 'office' ? '내근' : '외근', workHours: null };
          const timeStr = `${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;
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
        startDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .query(async ({ input }) => {
        const startDate = new Date(`${input.startDateStr}T00:00:00+09:00`);
        const endDate = new Date(`${input.endDateStr}T23:59:59+09:00`);
        const logs = await getAttendanceLogs({ startDate, endDate });
        const headers = ["사원명", "부서", "직위", "날짜", "출근시간", "퇴근시간", "근무형태"];
        const grouped: Record<string, { checkin?: string; checkout?: string; department?: string; position?: string; workType?: string }> = {};
        for (const log of logs) {
          // KST 기준 날짜/시간 추출 (UTC+9)
          const kstDate = new Date(log.recordedAt.getTime() + 9 * 60 * 60 * 1000);
          const dateKey = kstDate.toISOString().substring(0, 10);
          const key = `${log.employeeName}__${dateKey}`;
          if (!grouped[key]) grouped[key] = {};
          const timeStr = `${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`;
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
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional(), category: z.enum(["company", "dept", "all"]).optional() }))
      .query(async ({ input }) => getNotices(input.limit ?? 20, input.offset ?? 0, input.category && input.category !== "all" ? input.category : undefined)),

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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertNotice({
          tag: input.tag, title: input.title, content: input.content ?? null,
          category: input.category, isNew: input.isNew, isPinned: input.isPinned,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
          attachments: input.attachments ? JSON.stringify(input.attachments) : null,
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, attachments, ...rest } = input;
        await updateNotice(id, {
          ...rest,
          images: images !== undefined ? JSON.stringify(images) : undefined,
          attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
        });
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertHrNotice({
          type: input.type, title: input.title, content: input.content ?? null,
          effectiveDate: input.effectiveDate ?? null,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
          attachments: input.attachments ? JSON.stringify(input.attachments) : null,
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, attachments, ...rest } = input;
        await updateHrNotice(id, {
          ...rest,
          images: images !== undefined ? JSON.stringify(images) : undefined,
          attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
        });
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertCondolence({
          type: input.type, name: input.name, content: input.content ?? null,
          eventDate: input.eventDate ?? null,
          authorName: input.authorName ?? ctx.user.name ?? null,
          images: input.images ? JSON.stringify(input.images) : null,
          attachments: input.attachments ? JSON.stringify(input.attachments) : null,
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, images, attachments, ...rest } = input;
        await updateCondolence(id, {
          ...rest,
          images: images !== undefined ? JSON.stringify(images) : undefined,
          attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
        });
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
        category: z.enum(["언론보도", "매뉴얼", "기타"]).default("기타"),
        title: z.string().min(1).max(300),
        content: z.string().optional(),
        link: z.string().url().optional().or(z.literal("")),
        authorName: z.string().min(1).max(100),
        images: z.array(z.string()).optional(),
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertBoardPost({
          category: input.category, title: input.title, content: input.content ?? null,
          link: input.link || null, authorName: input.authorName,
          authorOpenId: ctx.user.openId, // 작성자 openId 저장
          isNew: true, isPinned: false, viewCount: 0,
          images: input.images ? JSON.stringify(input.images) : null,
          attachments: input.attachments ? JSON.stringify(input.attachments) : null,
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
        attachments: z.array(z.object({ name: z.string(), url: z.string(), mimeType: z.string(), size: z.number() })).optional(),
        isPinned: z.boolean().optional(), isNew: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 어드민 세션이면 무조건 수정 가능
        if (ctx.isAdminSession) {
          const { id, images, attachments, ...rest } = input;
          await updateBoardPost(id, {
            ...rest,
            images: images !== undefined ? JSON.stringify(images) : undefined,
            attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
          });
          return { success: true };
        }
        const rows = await getBoardPostById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' });
        const post = rows[0];
        if (ctx.user.role !== 'admin' && post.authorOpenId !== ctx.user.openId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '수정 권한이 없습니다.' });
        }
        const { id, images, attachments, ...rest } = input;
        await updateBoardPost(id, {
          ...rest,
          images: images !== undefined ? JSON.stringify(images) : undefined,
          attachments: attachments !== undefined ? JSON.stringify(attachments) : undefined,
        });
        return { success: true };
      }),

    // 게시글 삭제 (어드민 또는 작성자 본인)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // 어드민 세션이면 무조건 삭제 가능
        if (ctx.isAdminSession) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        const rows = await getBoardPostById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '게시글을 찾을 수 없습니다.' });
        const post = rows[0];
        // 어드민 role이면 삭제 가능
        if (ctx.user.role === 'admin') {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        // 일반 사용자는 본인 글만 삭제
        if (post.authorOpenId && post.authorOpenId === ctx.user.openId) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        throw new TRPCError({ code: 'FORBIDDEN', message: '삭제 권한이 없습니다.' });
      }),
  }),
  // ── 캘린더 일정 API ───────────────────────────────────────────
  calendar: router({
    // 월별 일정 목록 (본인 일정만)
    listMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input, ctx }) => {
        const all = await getCalendarEvents(input.year, input.month);
        return all.filter(ev => ev.authorOpenId === ctx.user.openId);
      }),

    // 오늘 일정 목록 (본인 일정만)
    today: protectedProcedure
      .input(z.object({ date: z.string() })) // YYYY-MM-DD
      .query(async ({ input, ctx }) => {
        const all = await getTodayEvents(input.date);
        return all.filter(ev => ev.authorOpenId === ctx.user.openId);
      }),

    // 단건 조회
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const rows = await getCalendarEventById(input.id);
        return rows[0] ?? null;
      }),

    // 일정 등록
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(300),
        description: z.string().optional(),
        eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        color: z.string().default('#1a1a1a'),
      }))
      .mutation(async ({ input, ctx }) => {
        await insertCalendarEvent({
          ...input,
          authorName: ctx.user.name ?? '',
          authorOpenId: ctx.user.openId,
        });
        return { success: true };
      }),

    // 일정 수정
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(300).optional(),
        description: z.string().optional(),
        eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const rows = await getCalendarEventById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '일정을 찾을 수 없습니다.' });
        const ev = rows[0];
        if (ctx.user.role !== 'admin' && ev.authorOpenId !== ctx.user.openId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '수정 권한이 없습니다.' });
        }
        const { id, ...data } = input;
        await updateCalendarEvent(id, data);
        return { success: true };
      }),

    // 일정 삭제
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const rows = await getCalendarEventById(input.id);
        if (!rows.length) throw new TRPCError({ code: 'NOT_FOUND', message: '일정을 찾을 수 없습니다.' });
        const ev = rows[0];
        if (ctx.user.role !== 'admin' && ev.authorOpenId !== ctx.user.openId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '삭제 권한이 없습니다.' });
        }
        await deleteCalendarEvent(input.id);
        return { success: true };
      }),
  }),


  // ── 예약 API ──────────────────────────────────────────────────────────────────────────────────────
  reservations: router({
    // 예약 신청 (로그인 필수)
    request: protectedProcedure
      .input(z.object({
        resourceType: z.enum(["회의실", "차량", "장비", "공간"]),
        resourceName: z.string().min(1),
        reserveDate: z.string().min(1),
        startTime: z.string().min(1),
        endTime: z.string().min(1),
        purpose: z.string().min(1),
        employeeId: z.number().optional(),
        employeeName: z.string().min(1),
        department: z.string().optional(),
        attendees: z.number().min(1).default(1),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await getReservations({
          reserveDate: input.reserveDate,
          resourceType: input.resourceType,
        });
        const conflict = existing.filter(r =>
          r.resourceName === input.resourceName &&
          r.status !== "반려" && r.status !== "취소" &&
          r.startTime < input.endTime && r.endTime > input.startTime
        );
        if (conflict.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `해당 시간대(${input.startTime}~${input.endTime})에 이미 예약이 있습니다.`,
          });
        }
        const id = await insertReservation({
          resourceType: input.resourceType,
          resourceName: input.resourceName,
          reserveDate: input.reserveDate,
          startTime: input.startTime,
          endTime: input.endTime,
          purpose: input.purpose,
          employeeId: input.employeeId ?? null,
          employeeName: input.employeeName,
          department: input.department ?? null,
          attendees: input.attendees,
          note: input.note ?? null,
          status: "대기",
        });
        return { success: true, id };
      }),

    // 일자별 전체 예약 현황 (로그인 필수 - 모두 볼 수 있음)
    byDate: protectedProcedure
      .input(z.object({ reserveDate: z.string().min(1) }))
      .query(async ({ input }) => getReservations({ reserveDate: input.reserveDate })),

    // 날짜 범위 조회 (로그인 필수)
    byDateRange: protectedProcedure
      .input(z.object({ startDate: z.string().min(1), endDate: z.string().min(1) }))
      .query(async ({ input }) => getReservationsByDateRange(input.startDate, input.endDate)),

    // 내 예약 이력 (로그인 필수)
    myList: protectedProcedure
      .input(z.object({ employeeId: z.number() }))
      .query(async ({ input }) => getReservations({ employeeId: input.employeeId })),

    // 전체 예약 목록 (어드민 전용)
    adminList: adminProcedure
      .input(z.object({
        status: z.string().optional(),
        resourceType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return getReservations({
          status: input.status,
          resourceType: input.resourceType,
        });
      }),

    // 예약 승인 (어드민 전용)
    approve: adminProcedure
      .input(z.object({ id: z.number(), approverName: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const approverName = ctx.user.name ?? input.approverName;
        const req = await getReservationById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "예약 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        await updateReservationStatus(input.id, "승인", approverName);
        return { success: true };
      }),

    // 예약 반려 (어드민 전용)
    reject: adminProcedure
      .input(z.object({ id: z.number(), approverName: z.string().min(1), rejectReason: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const approverName = ctx.user.name ?? input.approverName;
        const req = await getReservationById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "예약 내역을 찾을 수 없습니다." });
        if (req.status !== "대기") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 처리된 신청입니다." });
        await updateReservationStatus(input.id, "반려", approverName, input.rejectReason);
        return { success: true };
      }),

    // 예약 취소 (본인 또는 어드민)
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const req = await getReservationById(input.id);
        if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "예약 내역을 찾을 수 없습니다." });
        const isOwner = req.employeeId !== null && ctx.user.openId === `emp_${req.employeeId}`;
        if (ctx.user.role !== 'admin' && !isOwner) {
          throw new TRPCError({ code: "FORBIDDEN", message: "취소 권한이 없습니다." });
        }
        if (req.status === "취소") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 예약입니다." });
        await updateReservationStatus(input.id, "취소");
        return { success: true };
      }),
  }),

  // ── 예약 자원 관리 API ───────────────────────────────────────────────────────────────────────────────────
  reservationResources: router({
    // 자원 목록 조회 (공개 - 예약 페이지에서 사용, 비로그인도 조회 가능)
    list: publicProcedure
      .input(z.object({ onlyActive: z.boolean().optional() }))
      .query(async ({ input }) => getReservationResources(input.onlyActive ?? true)),

    // 자원 전체 목록 (어드민 전용 - 비활성 포함)
    adminList: adminProcedure
      .query(async () => getReservationResources(false)),

    // 자원 추가 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        resourceType: z.enum(["회의실", "차량", "장비", "공간"]),
        name: z.string().min(1).max(100),
        capacity: z.number().min(1).default(1),
        location: z.string().max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await insertReservationResource({
          resourceType: input.resourceType,
          name: input.name,
          capacity: input.capacity,
          location: input.location ?? null,
          description: input.description ?? null,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        });
        return { success: true, id };
      }),

    // 자원 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        resourceType: z.enum(["회의실", "차량", "장비", "공간"]).optional(),
        name: z.string().min(1).max(100).optional(),
        capacity: z.number().min(1).optional(),
        location: z.string().max(100).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const resource = await getReservationResourceById(id);
        if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "자원을 찾을 수 없습니다." });
        await updateReservationResource(id, data);
        return { success: true };
      }),

    // 자원 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const resource = await getReservationResourceById(input.id);
        if (!resource) throw new TRPCError({ code: "NOT_FOUND", message: "자원을 찾을 수 없습니다." });
        await deleteReservationResource(input.id);
        return { success: true };
      }),
  }),

  // ── 배너 API ──────────────────────────────────────────────────────────
  banners: router({
    // 활성 배너 목록 조회 (포탈 사용자용 - 비로그인도 조회 가능)
    list: publicProcedure
      .query(async () => getBanners(true)),

    // 전체 배너 목록 (어드민 전용 - 비활성 포함, 등록순)
    adminList: adminProcedure
      .query(async () => getBanners(false)),

    // 배너 등록 (어드민 전용)
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        imageUrl: z.string().min(1).max(500),
        linkUrl: z.string().max(500).optional(),
        linkTarget: z.enum(["_blank", "_self"]).default("_blank"),
        note: z.string().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const id = await insertBanner({
          name: input.name,
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl ?? null,
          linkTarget: input.linkTarget,
          note: input.note ?? null,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        });
        return { success: true, id };
      }),

    // 배너 수정 (어드민 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        imageUrl: z.string().max(500).optional(),
        linkUrl: z.string().max(500).nullable().optional(),
        linkTarget: z.enum(["_blank", "_self"]).optional(),
        note: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const banner = await getBannerById(id);
        if (!banner) throw new TRPCError({ code: "NOT_FOUND", message: "배너를 찾을 수 없습니다." });
        await updateBanner(id, data);
        return { success: true };
      }),

    // 배너 삭제 (어드민 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const banner = await getBannerById(input.id);
        if (!banner) throw new TRPCError({ code: "NOT_FOUND", message: "배너를 찾을 수 없습니다." });
        await deleteBanner(input.id);
        return { success: true };
      }),
  }),

  // ── 파일 업로드 ──────────────────────────────────────────────────────
  upload: router({
    // Base64 이미지 업로드 (tRPC 기반 - 인증 없이 사용 가능)
    image: publicProcedure
      .input(z.object({
        base64: z.string(), // data:image/...;base64,... 또는 순수 base64
        mimeType: z.string().default('image/jpeg'),
        filename: z.string().default('image.jpg'),
      }))
      .mutation(async ({ input }) => {
        // base64 디코딩
        const base64Data = input.base64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        // 파일명에서 확장자 추출 후 ASCII 안전 파일명 생성
        const ext = input.filename.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const safeFilename = `img_${Date.now()}.${ext}`;
        const key = `board-images/${safeFilename}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),
});

// admin 라우터는 index.ts의 REST 엔드포인트로 처리되므로 tRPC에서는 stub만 제공
// (admin.auth.test.ts 호환용)
export type AppRouter = typeof appRouter;

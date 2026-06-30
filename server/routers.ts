import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import {
  getAttendanceLogs, getTodayStatus, getTodaySummary, insertAttendanceLog,
  getNotices, getNoticeById, insertNotice, updateNotice, deleteNotice,
  getHrNotices, getHrNoticeById, insertHrNotice, updateHrNotice, deleteHrNotice,
  getCondolences, getCondolenceById, insertCondolence, updateCondolence, deleteCondolence,
  getBoardPosts, getBoardPostById, insertBoardPost, updateBoardPost, deleteBoardPost,
  getEmployees, getEmployeeById, insertEmployee, updateEmployee, deleteEmployee,
  getLeaveBalance, getAllLeaveBalances, upsertLeaveBalance, updateLeaveUsed,
  getLeaveRequests, insertLeaveRequest, updateLeaveRequestStatus, getLeaveRequestById,
  getCalendarEvents, getTodayEvents, getCalendarEventById, insertCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  getEmployeeByEmail, upsertUser,
  createPasswordResetToken, getValidPasswordResetToken, markPasswordResetTokenUsed,
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
        // 직원 openId: emp_{id} 형식으로 users 테이블에 upsert
        const openId = `emp_${employee.id}`;
        await upsertUser({
          openId,
          name: employee.name,
          email: employee.email ?? undefined,
          loginMethod: 'employee',
          lastSignedIn: new Date(),
        });
        const token = await sdk.createSessionToken(openId, { name: employee.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
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
    update: publicProcedure
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
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
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
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // 어드민 세션이면 무조건 삭제 가능
        if (ctx.isAdminSession) {
          await deleteBoardPost(input.id);
          return { success: true };
        }
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' });
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
    // 월별 일정 목록
    listMonth: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(async ({ input }) => getCalendarEvents(input.year, input.month)),

    // 오늘 일정 목록
    today: protectedProcedure
      .input(z.object({ date: z.string() })) // YYYY-MM-DD
      .query(async ({ input }) => getTodayEvents(input.date)),

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

import { and, desc, eq, gt, gte, isNull, lte, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AttendanceLog, InsertAttendanceLog, InsertUser,
  attendanceLogs, users,
  Notice, InsertNotice, notices,
  HrNotice, InsertHrNotice, hrNotices,
  Condolence, InsertCondolence, condolences,
  BoardPost, InsertBoardPost, boardPosts,
  Employee, InsertEmployee, employees,
  LeaveBalance, InsertLeaveBalance, leaveBalances,
  LeaveRequest, InsertLeaveRequest, leaveRequests,
  CalendarEvent, InsertCalendarEvent, calendarEvents,
  PasswordResetToken, InsertPasswordResetToken, passwordResetTokens,
  Reservation, InsertReservation, reservations,
  ReservationResource, InsertReservationResource, reservationResources,
  Banner, InsertBanner, banners,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── 출퇴근 쿼리 헬퍼 ────────────────────────────────────────────

export async function insertAttendanceLog(data: InsertAttendanceLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(attendanceLogs).values(data);
}

// 당일 동일 타입(checkin/checkout) 기록이 있으면 삭제 후 새로 삽입 (오버라이드)
export async function upsertTodayAttendanceLog(data: InsertAttendanceLog): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // KST 기준 오늘 자정 ~ 23:59:59 계산
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKSTStr = nowKST.toISOString().substring(0, 10); // YYYY-MM-DD
  const startUTC = new Date(`${todayKSTStr}T00:00:00+09:00`);
  const endUTC = new Date(`${todayKSTStr}T23:59:59+09:00`);
  // 당일 동일 타입 기록 삭제
  const nameCondition = eq(attendanceLogs.employeeName, data.employeeName);
  const typeCondition = eq(attendanceLogs.type, data.type as 'checkin' | 'checkout');
  const startCondition = gte(attendanceLogs.recordedAt, startUTC);
  const endCondition = lte(attendanceLogs.recordedAt, endUTC);
  await db.delete(attendanceLogs).where(and(nameCondition, typeCondition, startCondition, endCondition));
  // 새 기록 삽입
  await db.insert(attendanceLogs).values(data);
}

export async function getAttendanceLogs(filters?: {
  date?: Date;
  department?: string;
  employeeName?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<AttendanceLog[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.date) {
    // KST 기준 해당 날짜의 00:00:00 ~ 23:59:59 (UTC+9)
    // filters.date는 클라이언트에서 new Date(y, m-1, d) 로컬 시간으로 전달됨
    // 날짜 문자열을 직접 추출하여 KST 범위로 변환
    const d = filters.date;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const start = new Date(`${dateStr}T00:00:00+09:00`);
    const end = new Date(`${dateStr}T23:59:59+09:00`);
    conditions.push(gte(attendanceLogs.recordedAt, start));
    conditions.push(lte(attendanceLogs.recordedAt, end));
  }
  if (filters?.startDate) conditions.push(gte(attendanceLogs.recordedAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(attendanceLogs.recordedAt, filters.endDate));
  if (filters?.department) conditions.push(eq(attendanceLogs.department, filters.department));
  if (filters?.employeeName) conditions.push(eq(attendanceLogs.employeeName, filters.employeeName));
  const query = conditions.length > 0
    ? db.select().from(attendanceLogs).where(and(...conditions)).orderBy(desc(attendanceLogs.recordedAt))
    : db.select().from(attendanceLogs).orderBy(desc(attendanceLogs.recordedAt));
  return query;
}

export async function getTodayStatus(employeeName: string): Promise<{
  checkin: AttendanceLog | null;
  checkout: AttendanceLog | null;
}> {
  const db = await getDb();
  if (!db) return { checkin: null, checkout: null };
  // KST 기준 오늘 자정 ~ 23:59:59
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKSTStr = nowKST.toISOString().substring(0, 10);
  const start = new Date(`${todayKSTStr}T00:00:00+09:00`);
  const end = new Date(`${todayKSTStr}T23:59:59+09:00`);
  const rows = await db.select().from(attendanceLogs).where(
    and(eq(attendanceLogs.employeeName, employeeName), gte(attendanceLogs.recordedAt, start), lte(attendanceLogs.recordedAt, end))
  ).orderBy(desc(attendanceLogs.recordedAt));
  const checkin = rows.find(r => r.type === 'checkin') ?? null;
  const checkout = rows.find(r => r.type === 'checkout') ?? null;
  return { checkin, checkout };
}

export async function getTodaySummary(): Promise<{
  totalCheckin: number;
  totalCheckout: number;
  currentlyIn: number;
}> {
  const db = await getDb();
  if (!db) return { totalCheckin: 0, totalCheckout: 0, currentlyIn: 0 };
  // KST 기준 오늘 자정 ~ 23:59:59
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayKSTStr = nowKST.toISOString().substring(0, 10);
  const start = new Date(`${todayKSTStr}T00:00:00+09:00`);
  const end = new Date(`${todayKSTStr}T23:59:59+09:00`);
  const rows = await db.select().from(attendanceLogs).where(
    and(gte(attendanceLogs.recordedAt, start), lte(attendanceLogs.recordedAt, end))
  );
  const checkinNames = new Set(rows.filter(r => r.type === 'checkin').map(r => r.employeeName));
  const checkoutNames = new Set(rows.filter(r => r.type === 'checkout').map(r => r.employeeName));
  const currentlyIn = Array.from(checkinNames).filter(name => !checkoutNames.has(name)).length;
  return { totalCheckin: checkinNames.size, totalCheckout: checkoutNames.size, currentlyIn };
}

// ── 직원 쿼리 헬퍼 ───────────────────────────────────────────────

export async function getEmployees(activeOnly = true): Promise<Employee[]> {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(employees).where(eq(employees.isActive, true)).orderBy(employees.department, employees.name);
  }
  return db.select().from(employees).orderBy(employees.department, employees.name);
}

export async function getEmployeeById(id: number): Promise<Employee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function insertEmployee(data: InsertEmployee): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(employees).values(data);
  return (result[0] as any).insertId;
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set(data).where(eq(employees.id, id));
}

export async function getEmployeeByEmail(email: string): Promise<Employee | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  // 이메일 대소문자 무관하게 비교 (Kay.kwon vs kay.kwon 등)
  const result = await db.select().from(employees).where(sql`LOWER(${employees.email}) = LOWER(${email})`).limit(1);
  return result[0];
}

export async function deleteEmployee(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(employees).set({ isActive: false }).where(eq(employees.id, id));
}

// ── 연차 잔액 쿼리 헬퍼 ─────────────────────────────────────────

export async function getLeaveBalance(employeeId: number, year: number): Promise<LeaveBalance | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leaveBalances)
    .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)))
    .limit(1);
  return result[0];
}

export async function getAllLeaveBalances(year: number): Promise<LeaveBalance[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leaveBalances).where(eq(leaveBalances.year, year));
}

export async function upsertLeaveBalance(employeeId: number, year: number, totalDays: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getLeaveBalance(employeeId, year);
  if (existing) {
    await db.update(leaveBalances).set({ totalDays }).where(eq(leaveBalances.id, existing.id));
  } else {
    await db.insert(leaveBalances).values({ employeeId, year, totalDays, usedDays: "0.0" });
  }
}

export async function updateLeaveUsed(employeeId: number, year: number, delta: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leaveBalances)
    .set({ usedDays: sql`usedDays + ${delta}` })
    .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, year)));
}

// ── 연차 신청 쿼리 헬퍼 ─────────────────────────────────────────

export async function getLeaveRequests(filters?: {
  employeeId?: number;
  status?: string;
  year?: number;
}): Promise<LeaveRequest[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.employeeId) conditions.push(eq(leaveRequests.employeeId, filters.employeeId));
  if (filters?.status) conditions.push(eq(leaveRequests.status, filters.status as any));
  if (filters?.year) {
    const yearStr = String(filters.year);
    conditions.push(gte(leaveRequests.startDate, `${yearStr}-01-01`));
    conditions.push(lte(leaveRequests.startDate, `${yearStr}-12-31`));
  }
  const query = conditions.length > 0
    ? db.select().from(leaveRequests).where(and(...conditions)).orderBy(desc(leaveRequests.createdAt))
    : db.select().from(leaveRequests).orderBy(desc(leaveRequests.createdAt));
  return query;
}

export async function insertLeaveRequest(data: InsertLeaveRequest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leaveRequests).values(data);
  return (result[0] as any).insertId;
}

export async function updateLeaveRequestStatus(
  id: number,
  status: "승인" | "반려",
  approverName: string,
  rejectReason?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leaveRequests).set({
    status,
    approverName,
    approvedAt: new Date(),
    rejectReason: rejectReason ?? null,
  }).where(eq(leaveRequests.id, id));
}

export async function getLeaveRequestById(id: number): Promise<LeaveRequest | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1);
  return result[0];
}

// ── 공지사항 쿼리 헬퍼 ────────────────────────────────────────────

export async function getNotices(limit = 20, offset = 0): Promise<{ items: Notice[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select().from(notices).orderBy(desc(notices.isPinned), desc(notices.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(notices),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getNoticeById(id: number): Promise<Notice | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
  return result[0];
}

export async function insertNotice(data: InsertNotice): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(notices).values(data);
}

export async function updateNotice(id: number, data: Partial<InsertNotice>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notices).set(data).where(eq(notices.id, id));
}

export async function deleteNotice(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notices).where(eq(notices.id, id));
}

// ── 인사발령 쿼리 헬퍼 ────────────────────────────────────────────

export async function getHrNotices(limit = 20, offset = 0): Promise<{ items: HrNotice[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select().from(hrNotices).orderBy(desc(hrNotices.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(hrNotices),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getHrNoticeById(id: number): Promise<HrNotice | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(hrNotices).where(eq(hrNotices.id, id)).limit(1);
  return result[0];
}

export async function insertHrNotice(data: InsertHrNotice): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(hrNotices).values(data);
}

export async function updateHrNotice(id: number, data: Partial<InsertHrNotice>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(hrNotices).set(data).where(eq(hrNotices.id, id));
}

export async function deleteHrNotice(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(hrNotices).where(eq(hrNotices.id, id));
}

// ── 경조사 쿼리 헬퍼 ────────────────────────────────────────────

export async function getCondolences(limit = 20, offset = 0): Promise<{ items: Condolence[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select().from(condolences).orderBy(desc(condolences.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(condolences),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getCondolenceById(id: number): Promise<Condolence | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(condolences).where(eq(condolences.id, id)).limit(1);
  return result[0];
}

export async function insertCondolence(data: InsertCondolence): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(condolences).values(data);
}

export async function updateCondolence(id: number, data: Partial<InsertCondolence>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(condolences).set(data).where(eq(condolences.id, id));
}

export async function deleteCondolence(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(condolences).where(eq(condolences.id, id));
}

// ── 게시판 쿼리 헬퍼 ────────────────────────────────────────────

export async function getBoardPosts(filters?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: BoardPost[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [];
  if (filters?.category && filters.category !== 'all') {
    conditions.push(eq(boardPosts.category, filters.category as any));
  }
  if (filters?.search) {
    conditions.push(like(boardPosts.title, `%${filters.search}%`));
  }
  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, countResult] = await Promise.all([
    whereClause
      ? db.select().from(boardPosts).where(whereClause).orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt)).limit(limit).offset(offset)
      : db.select().from(boardPosts).orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt)).limit(limit).offset(offset),
    whereClause
      ? db.select({ count: sql<number>`count(*)` }).from(boardPosts).where(whereClause)
      : db.select({ count: sql<number>`count(*)` }).from(boardPosts),
  ]);
  return { items, total: Number(countResult[0]?.count ?? 0) };
}

export async function getBoardPostById(id: number): Promise<BoardPost[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(boardPosts).where(eq(boardPosts.id, id)).limit(1);
}

export async function insertBoardPost(data: InsertBoardPost): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(boardPosts).values(data);
}

export async function updateBoardPost(id: number, data: Partial<InsertBoardPost>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(boardPosts).set(data).where(eq(boardPosts.id, id));
}

export async function deleteBoardPost(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(boardPosts).where(eq(boardPosts.id, id));
}

// ── 캘린더 일정 헬퍼 ────────────────────────────────────────
export async function getCalendarEvents(year: number, month: number): Promise<CalendarEvent[]> {
  const db = await getDb();
  if (!db) return [];
  // YYYY-MM 형식으로 필터
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db.select().from(calendarEvents)
    .where(like(calendarEvents.eventDate, `${prefix}%`))
    .orderBy(calendarEvents.eventDate, calendarEvents.startTime);
}

export async function getTodayEvents(dateStr: string): Promise<CalendarEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents)
    .where(eq(calendarEvents.eventDate, dateStr))
    .orderBy(calendarEvents.startTime);
}

export async function getCalendarEventById(id: number): Promise<CalendarEvent[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEvents).where(eq(calendarEvents.id, id)).limit(1);
}

export async function insertCalendarEvent(data: InsertCalendarEvent): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(calendarEvents).values(data);
}

export async function updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

// ── 비밀번호 재설정 토큰 헬퍼 ────────────────────────────────────
export async function createPasswordResetToken(email: string, code: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료
  await db.insert(passwordResetTokens).values({ email, code, expiresAt });
}

export async function getValidPasswordResetToken(email: string, code: string): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.code, code),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now)
      )
    )
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markPasswordResetTokenUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, id));
}

// ── 예약 헬퍼 ────────────────────────────────────────────────────
export async function insertReservation(data: InsertReservation): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reservations).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function getReservations(filters?: {
  reserveDate?: string;
  resourceType?: string;
  status?: string;
  employeeId?: number;
}): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.reserveDate) conditions.push(eq(reservations.reserveDate, filters.reserveDate));
  if (filters?.resourceType) conditions.push(eq(reservations.resourceType, filters.resourceType as "회의실" | "차량" | "장비" | "공간"));
  if (filters?.status) conditions.push(eq(reservations.status, filters.status as "대기" | "승인" | "반려" | "취소"));
  if (filters?.employeeId) conditions.push(eq(reservations.employeeId, filters.employeeId));
  const query = conditions.length > 0
    ? db.select().from(reservations).where(and(...conditions)).orderBy(reservations.reserveDate, reservations.startTime)
    : db.select().from(reservations).orderBy(desc(reservations.createdAt));
  return query;
}

export async function getReservationsByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reservations)
    .where(and(gte(reservations.reserveDate, startDate), lte(reservations.reserveDate, endDate)))
    .orderBy(reservations.reserveDate, reservations.startTime);
}

export async function getReservationById(id: number): Promise<Reservation | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reservations).where(eq(reservations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateReservationStatus(
  id: number,
  status: "승인" | "반려" | "취소",
  approverName?: string,
  rejectReason?: string,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reservations).set({
    status,
    approverName: approverName ?? null,
    approvedAt: status === "승인" ? new Date() : null,
    rejectReason: rejectReason ?? null,
  }).where(eq(reservations.id, id));
}

export async function deleteReservation(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reservations).where(eq(reservations.id, id));
}

// ── 예약 자원 헬퍼 ────────────────────────────────────────────────────
export async function getReservationResources(onlyActive?: boolean): Promise<ReservationResource[]> {
  const db = await getDb();
  if (!db) return [];
  if (onlyActive) {
    return db.select().from(reservationResources)
      .where(eq(reservationResources.isActive, true))
      .orderBy(reservationResources.sortOrder, reservationResources.resourceType, reservationResources.name);
  }
  return db.select().from(reservationResources)
    .orderBy(reservationResources.sortOrder, reservationResources.resourceType, reservationResources.name);
}

export async function getReservationResourceById(id: number): Promise<ReservationResource | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reservationResources).where(eq(reservationResources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertReservationResource(data: InsertReservationResource): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reservationResources).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateReservationResource(
  id: number,
  data: Partial<Omit<InsertReservationResource, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reservationResources).set(data).where(eq(reservationResources.id, id));
}

export async function deleteReservationResource(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reservationResources).where(eq(reservationResources.id, id));
}

// ── 배너 쿼리 헬퍼 ─────────────────────────────────────────────────
export async function getBanners(onlyActive?: boolean): Promise<Banner[]> {
  const db = await getDb();
  if (!db) return [];
  if (onlyActive) {
    return db.select().from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(banners.sortOrder, banners.createdAt);
  }
  return db.select().from(banners)
    .orderBy(banners.sortOrder, banners.createdAt);
}

export async function getBannerById(id: number): Promise<Banner | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function insertBanner(data: InsertBanner): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(banners).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateBanner(
  id: number,
  data: Partial<Omit<InsertBanner, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(banners).set(data).where(eq(banners.id, id));
}

export async function deleteBanner(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(banners).where(eq(banners.id, id));
}

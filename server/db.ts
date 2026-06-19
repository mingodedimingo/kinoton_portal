import { and, desc, eq, gte, lte, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AttendanceLog, InsertAttendanceLog, InsertUser,
  attendanceLogs, users,
  Notice, InsertNotice, notices,
  HrNotice, InsertHrNotice, hrNotices,
  Condolence, InsertCondolence, condolences,
  BoardPost, InsertBoardPost, boardPosts,
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

export async function getAttendanceLogs(filters?: {
  date?: Date;
  department?: string;
  employeeName?: string;
}): Promise<AttendanceLog[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.date) {
    const start = new Date(filters.date); start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date); end.setHours(23, 59, 59, 999);
    conditions.push(gte(attendanceLogs.recordedAt, start));
    conditions.push(lte(attendanceLogs.recordedAt, end));
  }
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
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
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
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const rows = await db.select().from(attendanceLogs).where(
    and(gte(attendanceLogs.recordedAt, start), lte(attendanceLogs.recordedAt, end))
  );
  const checkinNames = new Set(rows.filter(r => r.type === 'checkin').map(r => r.employeeName));
  const checkoutNames = new Set(rows.filter(r => r.type === 'checkout').map(r => r.employeeName));
  const currentlyIn = Array.from(checkinNames).filter(name => !checkoutNames.has(name)).length;
  return { totalCheckin: checkinNames.size, totalCheckout: checkoutNames.size, currentlyIn };
}

// ── 공지사항 쿼리 헬퍼 ────────────────────────────────────────────

export async function getNotices(limit = 20): Promise<Notice[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notices).orderBy(desc(notices.isPinned), desc(notices.createdAt)).limit(limit);
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

export async function getHrNotices(limit = 20): Promise<HrNotice[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(hrNotices).orderBy(desc(hrNotices.createdAt)).limit(limit);
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

export async function getCondolences(limit = 20): Promise<Condolence[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(condolences).orderBy(desc(condolences.createdAt)).limit(limit);
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
}): Promise<BoardPost[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.category && filters.category !== 'all') {
    conditions.push(eq(boardPosts.category, filters.category as any));
  }
  if (filters?.search) {
    conditions.push(like(boardPosts.title, `%${filters.search}%`));
  }
  const limit = filters?.limit ?? 50;
  const query = conditions.length > 0
    ? db.select().from(boardPosts).where(and(...conditions)).orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt)).limit(limit)
    : db.select().from(boardPosts).orderBy(desc(boardPosts.isPinned), desc(boardPosts.createdAt)).limit(limit);
  return query;
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

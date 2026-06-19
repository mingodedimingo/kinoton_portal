import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AttendanceLog, InsertAttendanceLog, InsertUser, attendanceLogs, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ── 출퇴근 쿼리 헬퍼 ────────────────────────────────────────────

/**
 * 출퇴근 로그 삽입
 */
export async function insertAttendanceLog(data: InsertAttendanceLog): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  await db.insert(attendanceLogs).values(data);
}

/**
 * 출퇴근 로그 목록 조회 (관리자용)
 */
export async function getAttendanceLogs(filters?: {
  date?: Date;
  department?: string;
  employeeName?: string;
}): Promise<AttendanceLog[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.date) {
    // 해당 날짜의 시작(00:00:00)과 끝(23:59:59) UTC 기준
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(attendanceLogs.recordedAt, start));
    conditions.push(lte(attendanceLogs.recordedAt, end));
  }

  if (filters?.department) {
    conditions.push(eq(attendanceLogs.department, filters.department));
  }

  if (filters?.employeeName) {
    conditions.push(eq(attendanceLogs.employeeName, filters.employeeName));
  }

  const query = conditions.length > 0
    ? db.select().from(attendanceLogs).where(and(...conditions)).orderBy(desc(attendanceLogs.recordedAt))
    : db.select().from(attendanceLogs).orderBy(desc(attendanceLogs.recordedAt));

  return query;
}

/**
 * 오늘 특정 직원의 출퇴근 상태 조회
 */
export async function getTodayStatus(employeeName: string): Promise<{
  checkin: AttendanceLog | null;
  checkout: AttendanceLog | null;
}> {
  const db = await getDb();
  if (!db) return { checkin: null, checkout: null };

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const rows = await db
    .select()
    .from(attendanceLogs)
    .where(
      and(
        eq(attendanceLogs.employeeName, employeeName),
        gte(attendanceLogs.recordedAt, start),
        lte(attendanceLogs.recordedAt, end)
      )
    )
    .orderBy(desc(attendanceLogs.recordedAt));

  const checkin = rows.find(r => r.type === 'checkin') ?? null;
  const checkout = rows.find(r => r.type === 'checkout') ?? null;

  return { checkin, checkout };
}

/**
 * 오늘 전체 출퇴근 현황 요약 (관리자용)
 */
export async function getTodaySummary(): Promise<{
  totalCheckin: number;
  totalCheckout: number;
  currentlyIn: number;
}> {
  const db = await getDb();
  if (!db) return { totalCheckin: 0, totalCheckout: 0, currentlyIn: 0 };

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const rows = await db
    .select()
    .from(attendanceLogs)
    .where(
      and(
        gte(attendanceLogs.recordedAt, start),
        lte(attendanceLogs.recordedAt, end)
      )
    );

  const checkinNames = new Set(rows.filter(r => r.type === 'checkin').map(r => r.employeeName));
  const checkoutNames = new Set(rows.filter(r => r.type === 'checkout').map(r => r.employeeName));
  const currentlyIn = Array.from(checkinNames).filter(name => !checkoutNames.has(name)).length;

  return {
    totalCheckin: checkinNames.size,
    totalCheckout: checkoutNames.size,
    currentlyIn,
  };
}

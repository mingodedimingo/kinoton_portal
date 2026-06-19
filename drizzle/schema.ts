import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 출퇴근 로그 테이블
export const attendanceLogs = mysqlTable("attendance_logs", {
  id: int("id").autoincrement().primaryKey(),
  // 직원 식별 (이름 기반 - 로그인 없이도 사용 가능)
  employeeName: varchar("employeeName", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 50 }),
  // 출퇴근 유형: checkin(출근) / checkout(퇴근)
  type: mysqlEnum("type", ["checkin", "checkout"]).notNull(),
  // 근무 형태: office(내근) / field(외근)
  workType: mysqlEnum("workType", ["office", "field"]).default("office").notNull(),
  // 기록 시각 (UTC)
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  // 메모 (선택)
  note: text("note"),
});

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type InsertAttendanceLog = typeof attendanceLogs.$inferInsert;
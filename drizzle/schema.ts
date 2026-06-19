import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
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
  employeeName: varchar("employeeName", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 50 }),
  type: mysqlEnum("type", ["checkin", "checkout"]).notNull(),
  workType: mysqlEnum("workType", ["office", "field"]).default("office").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  note: text("note"),
});

export type AttendanceLog = typeof attendanceLogs.$inferSelect;
export type InsertAttendanceLog = typeof attendanceLogs.$inferInsert;

// 공지사항 테이블
export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  tag: varchar("tag", { length: 20 }).default("공지").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  category: mysqlEnum("category", ["company", "dept", "all"]).default("all").notNull(),
  isNew: boolean("isNew").default(true).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  authorName: varchar("authorName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;

// 인사발령 테이블
export const hrNotices = mysqlTable("hr_notices", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["입사", "퇴직", "발령", "승진"]).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  effectiveDate: varchar("effectiveDate", { length: 20 }), // YYYY.MM.DD 형식
  authorName: varchar("authorName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrNotice = typeof hrNotices.$inferSelect;
export type InsertHrNotice = typeof hrNotices.$inferInsert;

// 경조사 테이블
export const condolences = mysqlTable("condolences", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["결혼", "출산", "부고", "기타"]).notNull(),
  name: varchar("name", { length: 300 }).notNull(), // 대상자 이름/설명
  content: text("content"),
  eventDate: varchar("eventDate", { length: 20 }), // YYYY.MM.DD 형식
  authorName: varchar("authorName", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Condolence = typeof condolences.$inferSelect;
export type InsertCondolence = typeof condolences.$inferInsert;

// 게시판 테이블 (전체 직원 업로드 가능)
export const boardPosts = mysqlTable("board_posts", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["언론보도", "매뉴얼", "기타"]).default("기타").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  link: varchar("link", { length: 500 }), // 외부 링크 (선택)
  authorName: varchar("authorName", { length: 100 }).notNull(),
  isNew: boolean("isNew").default(true).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoardPost = typeof boardPosts.$inferSelect;
export type InsertBoardPost = typeof boardPosts.$inferInsert;

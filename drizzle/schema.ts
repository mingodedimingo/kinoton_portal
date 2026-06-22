import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
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

// ── 직원 테이블 ──────────────────────────────────────────────────
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  position: varchar("position", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  joinDate: varchar("joinDate", { length: 10 }).notNull(), // YYYY-MM-DD
  profileImage: varchar("profileImage", { length: 500 }), // 프로필 사진 URL
  ext: varchar("ext", { length: 20 }), // 내선번호
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

// ── 연차 부여 테이블 (직원별 연도별 연차 현황) ──────────────────
export const leaveBalances = mysqlTable("leave_balances", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  year: int("year").notNull(), // 연도 (예: 2026)
  totalDays: decimal("totalDays", { precision: 5, scale: 1 }).notNull().default("15.0"), // 총 부여 연차
  usedDays: decimal("usedDays", { precision: 5, scale: 1 }).notNull().default("0.0"),   // 사용 연차
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = typeof leaveBalances.$inferInsert;

// ── 연차 신청 테이블 ─────────────────────────────────────────────
export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  employeeName: varchar("employeeName", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  leaveType: mysqlEnum("leaveType", ["연차", "반차(오전)", "반차(오후)", "반반차", "병가", "경조휴가", "기타"]).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate: varchar("endDate", { length: 10 }).notNull(),     // YYYY-MM-DD
  days: decimal("days", { precision: 5, scale: 1 }).notNull(), // 사용 일수 (0.5 = 반차)
  reason: text("reason"),
  status: mysqlEnum("status", ["대기", "승인", "반려"]).default("대기").notNull(),
  approverName: varchar("approverName", { length: 100 }), // 승인/반려 처리자
  approvedAt: timestamp("approvedAt"),
  rejectReason: text("rejectReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequests.$inferInsert;

// ── 출퇴근 로그 테이블 ───────────────────────────────────────────
export const attendanceLogs = mysqlTable("attendance_logs", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId"), // nullable - 직원 테이블과 연결 (선택)
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

// ── 공지사항 테이블 ──────────────────────────────────────────────
export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  tag: varchar("tag", { length: 20 }).default("공지").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  category: mysqlEnum("category", ["company", "dept", "all"]).default("all").notNull(),
  isNew: boolean("isNew").default(true).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  authorName: varchar("authorName", { length: 100 }),
  images: text("images"), // JSON array of image URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;

// ── 인사발령 테이블 ──────────────────────────────────────────────
export const hrNotices = mysqlTable("hr_notices", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["입사", "퇴직", "발령", "승진"]).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  effectiveDate: varchar("effectiveDate", { length: 20 }),
  authorName: varchar("authorName", { length: 100 }),
  images: text("images"), // JSON array of image URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HrNotice = typeof hrNotices.$inferSelect;
export type InsertHrNotice = typeof hrNotices.$inferInsert;

// ── 경조사 테이블 ────────────────────────────────────────────────
export const condolences = mysqlTable("condolences", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["결혼", "출산", "부고", "기타"]).notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  content: text("content"),
  eventDate: varchar("eventDate", { length: 20 }),
  authorName: varchar("authorName", { length: 100 }),
  images: text("images"), // JSON array of image URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Condolence = typeof condolences.$inferSelect;
export type InsertCondolence = typeof condolences.$inferInsert;

// ── 게시판 테이블 ────────────────────────────────────────────────
export const boardPosts = mysqlTable("board_posts", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", ["언론보도", "매뉴얼", "기타"]).default("기타").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  link: varchar("link", { length: 500 }),
  authorName: varchar("authorName", { length: 100 }).notNull(),
  authorOpenId: varchar("authorOpenId", { length: 64 }), // 작성자 openId (삭제 권한 확인용)
  isNew: boolean("isNew").default(true).notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  images: text("images"), // JSON array of image URLs
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BoardPost = typeof boardPosts.$inferSelect;
export type InsertBoardPost = typeof boardPosts.$inferInsert;

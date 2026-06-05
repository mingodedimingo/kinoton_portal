/**
 * Home.tsx — 키노톤 사내 포탈 메인 대시보드
 * Design: Monochrome Precision
 * Layout: 상단 퀵메뉴 원형 버튼 → 좌(공지+인사발령) + 우(게시판+경조사) + 우측패널(프로필+달력)
 * Reference: 상무님 구상안 + 현대퓨쳐넷 + 중앙그룹 ERP
 */
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  Mail, FileCheck, Calendar, Users, Building2, Briefcase,
  LayoutGrid, Bell, ChevronRight, Plus, RefreshCw,
  Megaphone, UserCheck, Heart, BookOpen, Clock, LogIn, LogOut,
  Wifi, MapPin, ChevronLeft,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";

// ── Dummy Data ──────────────────────────────────────────────────
const TODAY = new Date(2026, 5, 5); // 2026-06-05

const NOTICES = [
  { id: 1, tag: "공지", title: "2026년 하반기 사업계획 발표 안내", date: "2026.06.04", isNew: true },
  { id: 2, tag: "공지", title: "사무실 이전 관련 안내사항 (6/15 예정)", date: "2026.06.03", isNew: true },
  { id: 3, tag: "공지", title: "정보보안 교육 이수 필수 안내 (6/30 마감)", date: "2026.06.02" },
  { id: 4, tag: "공지", title: "2026년 하계 휴가 신청 일정 안내", date: "2026.05.30" },
  { id: 5, tag: "공지", title: "사내 복지포인트 사용처 확대 안내", date: "2026.05.28" },
];

const HR_NOTICES = [
  { id: 1, type: "발령", title: "김민준 부장 → 영업본부장 승진 발령", date: "2026.06.04" },
  { id: 2, type: "발령", title: "이서연 과장 → 마케팅팀 팀장 발령", date: "2026.06.01" },
  { id: 3, type: "입사", title: "박지호 사원 개발팀 신규 입사", date: "2026.05.31" },
  { id: 4, type: "발령", title: "최유진 대리 → 기술지원팀 전보 발령", date: "2026.05.29" },
  { id: 5, type: "퇴직", title: "정현우 차장 명예퇴직", date: "2026.05.27" },
];

const BOARD_POSTS = [
  { id: 1, category: "자유", title: "6월 사내 동호회 모집 안내 (등산/독서/볼링)", date: "2026.06.04", isNew: true },
  { id: 2, category: "업무", title: "Q2 프로젝트 납품 완료 보고", date: "2026.06.03" },
  { id: 3, category: "자유", title: "구내식당 6월 메뉴 공지", date: "2026.06.02" },
  { id: 4, category: "업무", title: "신규 장비 도입 관련 의견 수렴", date: "2026.06.01" },
  { id: 5, category: "자유", title: "5월 생일자 축하합니다 🎂", date: "2026.05.30" },
];

const CONDOLENCES = [
  { id: 1, type: "결혼", name: "박준서 대리", detail: "본인 결혼", date: "2026.06.07", emoji: "💍" },
  { id: 2, type: "출산", name: "이미래 과장", detail: "득남", date: "2026.06.03", emoji: "👶" },
  { id: 3, type: "부고", name: "김태양 팀장", detail: "부친상", date: "2026.06.01", emoji: "🕯️" },
  { id: 4, type: "결혼", name: "최소연 사원", detail: "본인 결혼", date: "2026.05.30", emoji: "💍" },
];

const QUICK_MENUS = [
  { label: "메일",     icon: Mail,        path: "/mail",     badge: 3 },
  { label: "전자결재", icon: FileCheck,    path: "/approve",  badge: 2 },
  { label: "일정",     icon: Calendar,    path: "/calendar", badge: 0 },
  { label: "전체메뉴", icon: LayoutGrid,  path: "/#menu",    badge: 0 },
];

// ── Calendar helpers ─────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const DAY_NAMES = ["일","월","화","수","목","금","토"];

// ── Sub-components ───────────────────────────────────────────────

function QuickMenuSection() {
  const handleClick = (item: typeof QUICK_MENUS[0]) => {
    if (item.path === "/#menu") {
      toast("전체메뉴 기능은 준비 중입니다.");
    }
  };

  return (
    <div className="flex items-center justify-center gap-6 md:gap-10 py-5 px-4 animate-fade-in-up stagger-1">
      {QUICK_MENUS.map((item) => {
        const Icon = item.icon;
        const content = (
          <div className="quick-menu-item" key={item.label}>
            <div className="relative">
              <div className="quick-menu-circle">
                <Icon size={24} style={{ color: "var(--kino-charcoal)" }} />
              </div>
              {item.badge > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: "var(--kino-red)", fontSize: "0.65rem" }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="quick-menu-label">{item.label}</span>
          </div>
        );

        if (item.path === "/#menu") {
          return (
            <button key={item.label} onClick={() => handleClick(item)} className="bg-transparent border-0">
              {content}
            </button>
          );
        }
        return <Link key={item.label} href={item.path}>{content}</Link>;
      })}
    </div>
  );
}

function NoticeSection() {
  const [tab, setTab] = useState<"all"|"company"|"dept">("all");
  return (
    <div className="portal-card animate-fade-in-up stagger-2">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <span className="section-title flex items-center gap-1.5">
            <Megaphone size={14} style={{ color: "var(--kino-mid)" }} />
            공지사항
          </span>
          <div className="flex gap-1">
            {(["all","company","dept"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: tab === t ? "var(--kino-charcoal)" : "transparent",
                  color: tab === t ? "white" : "var(--kino-muted)",
                }}
              >
                {t === "all" ? "전체" : t === "company" ? "회사" : "부서"}
              </button>
            ))}
          </div>
        </div>
        <Link href="/board" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {NOTICES.map((n) => (
          <div key={n.id} className="board-item">
            <span className="badge-tag company shrink-0">{n.tag}</span>
            <span className="board-item-title">{n.title}</span>
            {n.isNew && <span className="badge-new shrink-0">N</span>}
            <span className="board-item-date shrink-0">{n.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HRSection() {
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <UserCheck size={14} style={{ color: "var(--kino-mid)" }} />
          인사발령
        </span>
        <button className="section-more flex items-center gap-0.5" onClick={() => toast("인사발령 전체 보기 준비 중")}>
          더보기 <ChevronRight size={12} />
        </button>
      </div>
      <div>
        {HR_NOTICES.map((h) => (
          <div key={h.id} className="board-item">
            <span
              className="badge-tag shrink-0"
              style={{
                background: h.type === "입사" ? "#F0FDF4" : h.type === "퇴직" ? "#FEF2F2" : "var(--kino-pale)",
                color: h.type === "입사" ? "#16A34A" : h.type === "퇴직" ? "#DC2626" : "var(--kino-mid)",
              }}
            >
              {h.type}
            </span>
            <span className="board-item-title">{h.title}</span>
            <span className="board-item-date shrink-0">{h.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoardSection() {
  const [tab, setTab] = useState<"all"|"free"|"work">("all");
  const filtered = tab === "all" ? BOARD_POSTS : BOARD_POSTS.filter(p => p.category === (tab === "free" ? "자유" : "업무"));
  return (
    <div className="portal-card animate-fade-in-up stagger-2">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <span className="section-title flex items-center gap-1.5">
            <BookOpen size={14} style={{ color: "var(--kino-mid)" }} />
            게시판
          </span>
          <div className="flex gap-1">
            {(["all","free","work"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: tab === t ? "var(--kino-charcoal)" : "transparent",
                  color: tab === t ? "white" : "var(--kino-muted)",
                }}
              >
                {t === "all" ? "전체" : t === "free" ? "자유" : "업무"}
              </button>
            ))}
          </div>
        </div>
        <Link href="/board" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {filtered.map((p) => (
          <div key={p.id} className="board-item">
            <span className="badge-tag shrink-0">{p.category}</span>
            <span className="board-item-title">{p.title}</span>
            {p.isNew && <span className="badge-new shrink-0">N</span>}
            <span className="board-item-date shrink-0">{p.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CondolenceSection() {
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <Heart size={14} style={{ color: "var(--kino-mid)" }} />
          경조사
        </span>
        <button className="section-more flex items-center gap-0.5" onClick={() => toast("경조사 전체 보기 준비 중")}>
          더보기 <ChevronRight size={12} />
        </button>
      </div>
      <div>
        {CONDOLENCES.map((c) => (
          <div key={c.id} className="board-item">
            <span className="text-base shrink-0">{c.emoji}</span>
            <span
              className="badge-tag shrink-0"
              style={{
                background: c.type === "결혼" ? "#FFF7ED" : c.type === "출산" ? "#F0FDF4" : "#F9FAFB",
                color: c.type === "결혼" ? "#C2410C" : c.type === "출산" ? "#16A34A" : "var(--kino-mid)",
              }}
            >
              {c.type}
            </span>
            <span className="board-item-title">
              <strong style={{ color: "var(--kino-charcoal)" }}>{c.name}</strong>
              <span style={{ color: "var(--kino-muted)" }}> · {c.detail}</span>
            </span>
            <span className="board-item-date shrink-0">{c.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCalendar() {
  const [current, setCurrent] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const daysInMonth = getDaysInMonth(current.year, current.month);
  const firstDay = getFirstDayOfMonth(current.year, current.month);
  const isToday = (d: number) =>
    d === TODAY.getDate() && current.month === TODAY.getMonth() && current.year === TODAY.getFullYear();

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  return (
    <div className="portal-card animate-fade-in-up stagger-5">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <Calendar size={14} style={{ color: "var(--kino-mid)" }} />
          달력
        </span>
        <Link href="/calendar" className="section-more flex items-center gap-0.5">
          일정 <ChevronRight size={12} />
        </Link>
      </div>
      <div className="p-3">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronLeft size={14} style={{ color: "var(--kino-mid)" }} />
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>
            {current.year}.{String(current.month + 1).padStart(2, "0")}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <ChevronRight size={14} style={{ color: "var(--kino-mid)" }} />
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className="text-center text-xs font-semibold py-1"
              style={{ color: i === 0 ? "var(--kino-red)" : i === 6 ? "#4A90D9" : "var(--kino-muted)" }}
            >
              {d}
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const dow = (firstDay + day - 1) % 7;
            return (
              <div key={day} className="flex flex-col items-center">
                <div
                  className={`cal-day ${isToday(day) ? "today" : ""} ${dow === 0 ? "sunday" : ""} ${dow === 6 ? "saturday" : ""}`}
                  onClick={() => toast(`${current.year}.${current.month + 1}.${day} 일정 기능 준비 중`)}
                >
                  {day}
                </div>
              </div>
            );
          })}
        </div>
        {/* Add schedule */}
        <button
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors"
          style={{ border: "1px dashed var(--kino-pale)", color: "var(--kino-muted)" }}
          onClick={() => toast("일정 추가 기능 준비 중")}
        >
          <Plus size={12} /> 일정 추가
        </button>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const [checkedIn, setCheckedIn] = useState(false);
  const [workType, setWorkType] = useState<"내근"|"외근">("내근");

  const handleCheckIn = () => {
    setCheckedIn(true);
    toast(`출근 처리 완료 — ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`);
  };
  const handleCheckOut = () => {
    toast("퇴근 처리 완료");
    setCheckedIn(false);
  };

  const todayStr = `${TODAY.getFullYear()}년 ${TODAY.getMonth() + 1}월 ${TODAY.getDate()}일 (목)`;

  return (
    <div className="portal-card animate-fade-in-up stagger-4">
      {/* Profile info */}
      <div className="flex flex-col items-center p-4 pb-3" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2"
          style={{ background: "var(--kino-charcoal)" }}
        >
          김
        </div>
        <p className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>김팽팽</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>개발팀 · 대리</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Wifi size={10} style={{ color: "var(--kino-green)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--kino-green)" }}>온라인</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 divide-x" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        {[
          { label: "오늘 일정", value: "2" },
          { label: "진행 결재", value: "1" },
          { label: "미확인 메일", value: "3" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-2.5">
            <span className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>{s.value}</span>
            <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Attendance */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{todayStr}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{
              background: checkedIn ? "#F0FDF4" : "#FEF9C3",
              color: checkedIn ? "#16A34A" : "#92400E",
            }}
          >
            {checkedIn ? "출근" : "미출근"}
          </span>
        </div>

        {/* Work type */}
        <div className="flex gap-1.5 mb-2.5">
          {(["내근","외근"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setWorkType(t)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                border: `1.5px solid ${workType === t ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
                background: workType === t ? "var(--kino-charcoal)" : "transparent",
                color: workType === t ? "white" : "var(--kino-mid)",
              }}
            >
              {t === "내근" ? <Building2 size={11} /> : <MapPin size={11} />}
              {t}
            </button>
          ))}
        </div>

        {/* Check in/out buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={handleCheckIn}
            disabled={checkedIn}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-semibold transition-all"
            style={{
              background: checkedIn ? "var(--kino-pale)" : "var(--kino-charcoal)",
              color: checkedIn ? "var(--kino-light)" : "white",
            }}
          >
            <LogIn size={12} /> 출근
          </button>
          <button
            onClick={handleCheckOut}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs font-semibold transition-all"
            style={{ border: "1.5px solid var(--kino-pale)", color: "var(--kino-mid)" }}
          >
            <LogOut size={12} /> 퇴근
          </button>
        </div>

        {/* Annual leave */}
        <div className="mt-3 p-2.5 rounded" style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>연차 현황</span>
            <span className="text-xs" style={{ color: "var(--kino-muted)" }}>2026.06.05 기준</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--kino-mid)" }}>사용 / 총 연차</span>
            <span className="font-semibold" style={{ color: "var(--kino-charcoal)" }}>3.5 / 15일</span>
          </div>
          <div className="w-full rounded-full overflow-hidden" style={{ height: "5px", background: "var(--kino-pale)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: "23.3%", background: "var(--kino-charcoal)" }}
            />
          </div>
          <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>잔여 11.5일</p>
        </div>
      </div>
    </div>
  );
}

function BannerSection() {
  return (
    <div
      className="relative overflow-hidden rounded-lg animate-fade-in-up stagger-1"
      style={{ height: "120px" }}
    >
      <img
        src="https://d2xsxph8kpxj0f.cloudfront.net/310519663697530344/A8dtZhdpffsLWcu73Q5zZa/kinoton-portal-banner-PPifkqzNuPi6BCUYuQYNcx.webp"
        alt="키노톤 포탈 배너"
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0 flex flex-col justify-center px-6"
        style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }}
      >
        <p className="text-white text-xs font-medium opacity-80">Kinoton Intranet</p>
        <p className="text-white text-lg font-bold leading-tight">함께 만드는 공간,</p>
        <p className="text-white text-lg font-bold leading-tight">함께 여는 미래</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Home() {
  return (
    <PortalLayout>
      <div className="container py-4 md:py-6">

        {/* Quick Menu */}
        <div
          className="portal-card mb-4 animate-fade-in-up stagger-1"
          style={{ background: "var(--kino-white)" }}
        >
          <QuickMenuSection />
        </div>

        {/* Main grid */}
        <div className="flex gap-4 items-start">

          {/* ── LEFT + CENTER: 2-column content ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Banner */}
            <BannerSection />

            {/* 공지사항 + 게시판 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NoticeSection />
              <BoardSection />
            </div>

            {/* 인사발령 + 경조사 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HRSection />
              <CondolenceSection />
            </div>
          </div>

          {/* ── RIGHT PANEL: 프로필 + 달력 ── */}
          <div
            className="shrink-0 flex flex-col gap-4"
            style={{ width: "240px" }}
          >
            <ProfilePanel />
            <MiniCalendar />
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

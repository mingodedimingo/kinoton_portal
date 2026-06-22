/**
 * Home.tsx — 키노톤 사내 포탈 메인 대시보드
 * Design: Monochrome Precision
 * PC: 좌(프로필+통계+출퇴근+연차+달력) + 우(퀵메뉴+공지+게시판+인사발령+경조사)
 * Mobile: 퀵메뉴카드 → 프로필카드 → 통계카드 → 출퇴근카드
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Mail, FileCheck, Calendar, LayoutGrid,
  ChevronRight, Plus, Megaphone, UserCheck,
  Heart, BookOpen, ChevronLeft, LogIn, LogOut,
  Building2, MapPin, Wifi, Settings2, Loader2, FileText,
} from "lucide-react";
import PortalLayout, { openFullMenu } from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";


// ── Dummy Data ──────────────────────────────────────────────────
const TODAY = new Date();

const NOTICES = [
  { id: 1, tag: "공지", title: "[공유] 2026년 6월 비상연락망", date: "2026.06.15", isNew: true },
  { id: 2, tag: "공지", title: "[공지] 노사협의회 근로자위원 선거 결과 공고", date: "2026.06.11", isNew: true },
  { id: 3, tag: "공지", title: "[공지] 여름철 폭염 대비 온열질환 예방 안내", date: "2026.06.09" },
  { id: 4, tag: "공지", title: "[공지] 2026년 6월 정기 공지사항", date: "2026.05.28" },
  { id: 5, tag: "공지", title: "[공지] 노사협의회 근로자위원 선거 및 입후보 등록 안내", date: "2026.05.27" },
];

const HR_NOTICES = [
  { id: 1, type: "발령", title: "서강현 사원 → 주임 승진", date: "2026.06.01" },
  { id: 2, type: "발령", title: "조종인 사원 → 주임 승진", date: "2026.06.01" },
  { id: 3, type: "입사", title: "장민석 책임 미래전략사업본부 경영기획팀 입사", date: "2026.05.11" },
  { id: 4, type: "입사", title: "김진형 책임 미래전략사업본부 경영기획팀 입사", date: "2026.04.14" },
  { id: 5, type: "입사", title: "한민 선임 DE사업본부 관리팀 입사", date: "2026.04.14" },
];

// 게시판 탭: 전체·언론보도·매뉴얼·기타
const BOARD_POSTS = [
  { id: 1, category: "언론보도", title: "키노톤, 콘텐츠 IP 기업 도약 선언…\"연내 코스닥 상장 추진\"", date: "2026.06.12", isNew: true, link: "https://www.yna.co.kr/view/AKR20260612056400030?input=1195m" },
  { id: 2, category: "언론보도", title: "키노톤 \"글로벌 디지털 미디어 기업으로 도약\" 창립 20주년 맞아 미래비전 발표, IPO 절차 진행", date: "2026.06.12", link: "https://www.thebell.co.kr/front/newsview.asp?click=F&key=202606121100151040102052" },
  { id: 3, category: "매뉴얼", title: "신규 생일 선물 제공 플랫폼(생일24) 이용 가이드 안내", date: "2026.06.02" },
  { id: 4, category: "매뉴얼", title: "키노톤(주) 실물모형 및 진시물 직접생산확인 증명서", date: "2026.06.01" },
  { id: 5, category: "기타", title: "새로운 맛집 공유 드립니다", date: "2026.05.30" },
];

const CONDOLENCES = [
  { id: 1, type: "결혼", name: "미래전략사업부 경영기획팀 김민구 선임님 형제자매 결혼", date: "2026.04.25", emoji: "💍" },
  { id: 2, type: "부고", name: "Dx사업부 오디오사업팀 이재원 책임님 조모상", date: "2026.02.05", emoji: "🕯️" },
  { id: 3, type: "부고", name: "미래전략사업부 경영기획팀 박찬훈 팀장님 부친상", date: "2026.01.13", emoji: "🕯️" },
  { id: 4, type: "부고", name: "Dx사업부 최재실 담당님 부친상", date: "2026.01.02", emoji: "🕯️" },
];

// 퀵메뉴: 메일·전자결재·ERP·영업시스템·전체메뉴 (5개)
const QUICK_MENUS = [
  { label: "메일",       icon: Mail,        path: "https://wmail.ecount.com/",      badge: 0, external: true },
  { label: "전자결재",   icon: FileCheck,   path: "/approve",                       badge: 2 },
  { label: "ERP",        icon: Settings2,   path: "https://erp.kinoton.co.kr/",     badge: 0, external: true },
  { label: "영업시스템", icon: Building2,   path: "https://sales.kinoton.co.kr/",   badge: 0, external: true },
  { label: "전체메뉴",   icon: LayoutGrid,  path: "/#menu",                         badge: 0 },
];

// ── Calendar helpers ─────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const DAY_NAMES = ["일","월","화","수","목","금","토"];
const DAY_KO = ["일","월","화","수","목","금","토"];

// ── Quick Menu ───────────────────────────────────────────────────
function QuickMenuSection({ card = false }: { card?: boolean }) {
  const handleClick = (item: typeof QUICK_MENUS[0]) => {
    if (item.path === "/#menu") openFullMenu();
    else if (item.external) window.open(item.path, "_blank");
    else window.location.href = item.path;
  };
  const inner = (
    <div className="flex items-center justify-center gap-4 md:gap-10 pt-8 pb-5 px-4">
      {QUICK_MENUS.map((item) => {
        const Icon = item.icon;
        const content = (
          <div className="quick-menu-item" key={item.label}>
            <div className="relative">
              <div className="quick-menu-circle">
                <Icon size={26} style={{ color: "var(--kino-charcoal)" }} />
              </div>
              {item.badge > 0 && (
                <span
                  className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full text-white font-bold"
                  style={{ background: "var(--kino-red)", fontSize: "0.65rem", zIndex: 10 }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="quick-menu-label">{item.label}</span>
          </div>
        );
        return (
          <button key={item.label} onClick={() => handleClick(item)} className="bg-transparent border-0 p-0">
            {content}
          </button>
        );
      })}
    </div>
  );

  if (card) {
    return (
      <div className="portal-card mb-4 animate-fade-in-up stagger-1" style={{ paddingTop: "1rem", overflow: "visible" }}>
        {inner}
      </div>
    );
  }
  return (
    <div
      className="mb-5 animate-fade-in-up stagger-1"
      style={{ background: "var(--kino-white)", borderRadius: "0.5rem" }}
    >
      {inner}
    </div>
  );
}

// ── Notice Section (DB 연동) ─────────────────────────────────────
function NoticeSection() {
  const [tab, setTab] = useState<"all"|"company"|"dept">("all");
  const { data: noticesData, isLoading } = trpc.notices.list.useQuery({ limit: 5 });
  const notices = noticesData?.items;
  const filtered = tab === "all" ? notices : notices?.filter(n => n.category === tab);
  return (
    <div className="portal-card animate-fade-in-up stagger-2">
      <div className="section-header">
        <div className="flex items-center gap-2">
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
        <Link href="/notices" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !filtered || filtered.length === 0 ? (
          <div className="py-4 text-center text-xs" style={{ color: "var(--kino-light)" }}>등록된 공지사항이 없습니다</div>
        ) : filtered.slice(0, 5).map((n) => (
          <div key={n.id} className="board-item" onClick={() => toast(`"${n.title}"`)}
            style={{ cursor: "pointer" }}>
            <span className="badge-tag company shrink-0">{n.tag}</span>
            <span className="board-item-title">{n.title}</span>
            {n.isNew && <span className="badge-new shrink-0">N</span>}
            <span className="board-item-date shrink-0">{new Date(n.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HR Section (DB 연동) ─────────────────────────────────────────
function HRSection() {
  const { data: hrData, isLoading } = trpc.hrNotices.list.useQuery({ limit: 5 });
  const hrList = hrData?.items;
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <UserCheck size={14} style={{ color: "var(--kino-mid)" }} />
          인사발령
        </span>
        <Link href="/hr" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !hrList || hrList.length === 0 ? (
          <div className="py-4 text-center text-xs" style={{ color: "var(--kino-light)" }}>등록된 인사발령이 없습니다</div>
        ) : hrList.slice(0, 5).map((h) => (
          <div key={h.id} className="board-item" style={{ cursor: "default" }}>
            <span
              className="badge-tag shrink-0"
              style={{
                background: h.type === "입사" ? "#F0FDF4" : h.type === "퇴직" ? "#FEF2F2" : h.type === "승진" ? "#EFF6FF" : "var(--kino-pale)",
                color: h.type === "입사" ? "#16A34A" : h.type === "퇴직" ? "#DC2626" : h.type === "승진" ? "#2563EB" : "var(--kino-mid)",
              }}
            >
              {h.type}
            </span>
            <span className="board-item-title">{h.title}</span>
            <span className="board-item-date shrink-0">{h.effectiveDate ?? new Date(h.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Board Section (DB 연동) ──────────────────────────────────────
function BoardSection() {
  const [tab, setTab] = useState<"all"|"press"|"manual"|"etc">("all");
  const categoryMap: Record<string, string | undefined> = { all: undefined, press: "언론보도", manual: "매뉴얼", etc: "기타" };
  const { data: boardData, isLoading } = trpc.board.list.useQuery({ category: categoryMap[tab], limit: 5 });
  const posts = boardData?.items;
  return (
    <div className="portal-card animate-fade-in-up stagger-2">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <span className="section-title flex items-center gap-1.5">
            <BookOpen size={14} style={{ color: "var(--kino-mid)" }} />
            게시판
          </span>
          <div className="flex gap-1">
            {(["all","press","manual","etc"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
                style={{
                  background: tab === t ? "var(--kino-charcoal)" : "transparent",
                  color: tab === t ? "white" : "var(--kino-muted)",
                }}
              >
                {t === "all" ? "전체" : t === "press" ? "언론보도" : t === "manual" ? "매뉴얼" : "기타"}
              </button>
            ))}
          </div>
        </div>
        <Link href="/board" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !posts || posts.length === 0 ? (
          <div className="py-4 text-center text-xs" style={{ color: "var(--kino-light)" }}>게시글이 없습니다</div>
        ) : posts.slice(0, 5).map((p) => (
          <div key={p.id} className="board-item" style={{ cursor: "pointer" }}
            onClick={() => p.link ? window.open(p.link, "_blank") : toast(`"${p.title}"`)}
          >
            <span className="badge-tag shrink-0">{p.category}</span>
            <span className="board-item-title">{p.title}</span>
            {p.isNew && <span className="badge-new shrink-0">N</span>}
            <span className="board-item-date shrink-0">{new Date(p.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Condolence Section (DB 연동) ─────────────────────────────────
const CONDOLENCE_EMOJI: Record<string, string> = { 결혼: "💍", 출산: "👶", 부고: "🕯️", 기타: "📋" };
function CondolenceSection() {
  const { data: condData, isLoading } = trpc.condolences.list.useQuery({ limit: 5 });
  const list = condData?.items;
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
      <div className="section-header">
        <span className="section-title flex items-center gap-1.5">
          <Heart size={14} style={{ color: "var(--kino-mid)" }} />
          경조사
        </span>
        <Link href="/condolences" className="section-more flex items-center gap-0.5">
          더보기 <ChevronRight size={12} />
        </Link>
      </div>
      <div>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !list || list.length === 0 ? (
          <div className="py-4 text-center text-xs" style={{ color: "var(--kino-light)" }}>등록된 경조사가 없습니다</div>
        ) : list.slice(0, 5).map((c) => (
          <div key={c.id} className="board-item" style={{ cursor: "default" }}>
            <span className="text-base shrink-0">{CONDOLENCE_EMOJI[c.type] ?? "📋"}</span>
            <span
              className="badge-tag shrink-0"
              style={{
                background: c.type === "결혼" ? "#FFF7ED" : c.type === "출산" ? "#F0FDF4" : "#F9FAFB",
                color: c.type === "결혼" ? "#C2410C" : c.type === "출산" ? "#16A34A" : "var(--kino-mid)",
              }}
            >
              {c.type}
            </span>
            <span className="board-item-title" style={{ color: "var(--kino-charcoal)" }}>{c.name}</span>
            <span className="board-item-date shrink-0">{c.eventDate ?? new Date(c.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Calendar ────────────────────────────────────────────────
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
    <div style={{ borderTop: "1px solid var(--kino-pale)", paddingTop: "0.75rem" }}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--kino-charcoal)" }}>
          <Calendar size={13} style={{ color: "var(--kino-mid)" }} />
          달력
        </span>
        <Link href="/calendar" className="section-more flex items-center gap-0.5 text-xs">
          일정 <ChevronRight size={12} />
        </Link>
      </div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronLeft size={13} style={{ color: "var(--kino-mid)" }} />
        </button>
        <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>
          {current.year}.{String(current.month + 1).padStart(2, "0")}
        </span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronRight size={13} style={{ color: "var(--kino-mid)" }} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className="text-center py-0.5"
            style={{ fontSize: "0.7rem", fontWeight: 600, color: i === 0 ? "var(--kino-red)" : i === 6 ? "#4A90D9" : "var(--kino-muted)" }}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />;
          const dow = (firstDay + day - 1) % 7;
          return (
            <div key={day} className="flex flex-col items-center">
              <div
                className={`cal-day ${isToday(day) ? "today" : ""} ${dow === 0 ? "sunday" : ""} ${dow === 6 ? "saturday" : ""}`}
                style={{ width: "1.75rem", height: "1.75rem", fontSize: "0.75rem" }}
                onClick={() => toast(`${current.year}.${current.month + 1}.${day} 일정 기능 준비 중`)}
              >
                {day}
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-colors"
        style={{ border: "1px dashed var(--kino-pale)", color: "var(--kino-muted)" }}
        onClick={() => toast("일정 추가 기능 준비 중")}
      >
        <Plus size={11} /> 일정 추가
      </button>
    </div>
  );
}

// ── 출퇴근 훅 (tRPC 연동) ────────────────────────────────────────
function useAttendance(employee: { id: number; name: string; department: string; position: string } | null) {
  const utils = trpc.useUtils();

  const { data: todayStatus, isLoading } = trpc.attendance.todayStatus.useQuery(
    { employeeName: employee?.name ?? "" },
    { enabled: !!employee, refetchOnWindowFocus: true }
  );

  const recordMutation = trpc.attendance.record.useMutation({
    onSuccess: (data) => {
      utils.attendance.todayStatus.invalidate();
      if (data.type === "checkin") {
        toast.success("출근 처리가 완료되었습니다.");
      } else {
        toast.success("퇴근 처리가 완료되었습니다.");
      }
    },
    onError: (err) => {
      toast.error(`처리 실패: ${err.message}`);
    },
  });

  const checkedIn = !!todayStatus?.checkin;
  const checkedOut = !!todayStatus?.checkout;

  const handleCheckin = (workType: "office" | "field") => {
    if (!employee) { toast.error("직원을 먼저 선택해주세요."); return; }
    recordMutation.mutate({
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      position: employee.position,
      type: "checkin",
      workType,
    });
  };

  const handleCheckout = (workType: "office" | "field") => {
    if (!employee) { toast.error("직원을 먼저 선택해주세요."); return; }
    recordMutation.mutate({
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      position: employee.position,
      type: "checkout",
      workType,
    });
  };

  return {
    checkedIn,
    checkedOut,
    isLoading: isLoading && !!employee,
    isPending: recordMutation.isPending,
    checkinTime: todayStatus?.checkin?.recordedAt,
    checkoutTime: todayStatus?.checkout?.recordedAt,
    handleCheckin,
    handleCheckout,
  };
}

// 고정 직원 정보 (김민구)
const FIXED_EMPLOYEE = { id: 1, name: "김민구", department: "경영기획팀", position: "선임" };
const PROFILE_IMAGE = "/manus-storage/profile-kmg-new_30f1ac23.png";

// ── Left Panel (PC only) — 프로필+통계+출퇴근+연차+달력 ──────────
function LeftPanel() {
  const [, navigate] = useLocation();
  const [workType, setWorkType] = useState<"내근"|"외근">("내근");
  const selectedEmployee = FIXED_EMPLOYEE;
  const { checkedIn, checkedOut, isLoading, isPending, checkinTime, checkoutTime, handleCheckin, handleCheckout } = useAttendance(selectedEmployee);

  // 연차 잔액 조회
  const { data: leaveBalance } = trpc.employees.leaveBalance.useQuery(
    { employeeId: selectedEmployee.id },
    { enabled: true }
  );

  const now = new Date();
  const dayStr = DAY_KO[now.getDay()];
  const todayStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayStr})`;

  const formatTime = (date: Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const statusLabel = isLoading ? "조회 중" : checkedIn ? (checkedOut ? "퇴근" : "출근 중") : "미출근";
  const statusBg = isLoading ? "#F3F4F6" : checkedIn ? (checkedOut ? "#EFF6FF" : "#F0FDF4") : "#FEF9C3";
  const statusColor = isLoading ? "#6B7280" : checkedIn ? (checkedOut ? "#1D4ED8" : "#16A34A") : "#92400E";

  return (
    <div
      className="portal-card animate-fade-in-up stagger-2 p-4 flex flex-col gap-0"
      style={{ width: "260px", flexShrink: 0 }}
    >
      {/* 프로필 카드 */}
      <div className="pb-4 flex flex-col items-center text-center" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <img
          src={PROFILE_IMAGE}
          alt={selectedEmployee.name}
          className="w-16 h-16 rounded-full object-cover mb-2"
          style={{ border: "2px solid var(--kino-pale)" }}
        />
        <p className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>{selectedEmployee.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{selectedEmployee.department} · {selectedEmployee.position}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Wifi size={10} style={{ color: "var(--kino-green)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--kino-green)" }}>온라인</span>
        </div>
      </div>

      {/* 통계 2열 */}
      <div className="grid grid-cols-2 divide-x py-1" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        {[
          { label: "오늘 일정", value: "2" },
          { label: "진행 결재", value: "1" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-2.5">
            <span className="text-xl font-bold" style={{ color: "var(--kino-charcoal)" }}>{s.value}</span>
            <span className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* 출퇴근 */}
      <div className="py-3" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{todayStr}</span>
          <span
            className="text-xs px-2 py-0.5 rounded font-semibold"
            style={{ background: statusBg, color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* 출근/퇴근 시간 표시 */}
        {(checkinTime || checkoutTime) && (
          <div className="flex justify-between text-xs mb-2" style={{ color: "var(--kino-muted)" }}>
            {checkinTime && <span>출근 {formatTime(checkinTime)}</span>}
            {checkoutTime && <span>퇴근 {formatTime(checkoutTime)}</span>}
          </div>
        )}

        {/* 내근 / 외근 */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {(["내근","외근"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setWorkType(t)}
              className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold transition-all"
              style={{
                border: `1.5px solid ${workType === t ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
                background: workType === t ? "var(--kino-charcoal)" : "transparent",
                color: workType === t ? "white" : "var(--kino-mid)",
              }}
            >
              {t === "내근" ? <Building2 size={12} /> : <MapPin size={12} />}
              {t}
            </button>
          ))}
        </div>

        {/* 출근 / 퇴근 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleCheckin(workType === "내근" ? "office" : "field")}
            disabled={checkedIn || isPending || isLoading}
            className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold transition-all active:scale-95"
            style={{
              background: checkedIn ? "var(--kino-pale)" : "var(--kino-charcoal)",
              color: checkedIn ? "var(--kino-muted)" : "white",
              opacity: checkedIn ? 0.6 : 1,
            }}
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
            출근
          </button>
          <button
            onClick={() => handleCheckout(workType === "내근" ? "office" : "field")}
            disabled={!checkedIn || checkedOut || isPending || isLoading}
            className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-bold transition-all active:scale-95"
            style={{
              border: "1.5px solid var(--kino-pale)",
              color: (!checkedIn || checkedOut) ? "var(--kino-pale)" : "var(--kino-mid)",
              opacity: (!checkedIn || checkedOut) ? 0.5 : 1,
            }}
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
            퇴근
          </button>
        </div>
      </div>

      {/* 연차 현황 */}
      <div className="py-3" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>연차 현황</span>
          <button
            className="text-xs flex items-center gap-0.5 transition-colors"
            style={{ color: "var(--kino-muted)" }}
            onClick={() => navigate("/leave")}
          >
            신청 <ChevronRight size={10} />
          </button>
        </div>
        {leaveBalance ? (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: "var(--kino-mid)" }}>사용 / 총 연차</span>
              <span className="font-semibold" style={{ color: "var(--kino-charcoal)" }}>{leaveBalance.usedDays} / {leaveBalance.totalDays}일</span>
            </div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: "var(--kino-mid)" }}>잔여</span>
              <span className="font-semibold" style={{ color: leaveBalance.remainingDays <= 3 ? "var(--kino-red)" : "var(--kino-green)" }}>{leaveBalance.remainingDays}일</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", background: "var(--kino-pale)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (leaveBalance.usedDays / leaveBalance.totalDays) * 100)}%`,
                  background: leaveBalance.remainingDays <= 3 ? "var(--kino-red)" : "var(--kino-charcoal)",
                }}
              />
            </div>
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--kino-light)" }}>연차 정보 로딩 중...</p>
        )}
        <button
          onClick={() => navigate("/leave")}
          className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-medium transition-all active:scale-95"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
        >
          <FileText size={11} /> 연차 신청
        </button>
      </div>

      {/* 달력 */}
      <div className="pt-3">
        <MiniCalendar />
      </div>
    </div>
  );
}

// ── Mobile: 퀵메뉴 카드 ──────────────────────────────────────────
function MobileQuickMenu() {
  return <QuickMenuSection card={true} />;
}

// ── Mobile: 프로필 카드 ──────────────────────────────────────────
function MobileProfileCard() {
  const [, navigate] = useLocation();
  return (
    <div className="portal-card p-4 animate-fade-in-up stagger-2 flex items-center gap-3">
      <img
        src={PROFILE_IMAGE}
        alt={FIXED_EMPLOYEE.name}
        className="w-14 h-14 rounded-full object-cover shrink-0"
        style={{ border: "2px solid var(--kino-pale)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>{FIXED_EMPLOYEE.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{FIXED_EMPLOYEE.department} · {FIXED_EMPLOYEE.position}</p>
        <div className="flex items-center gap-1 mt-1">
          <Wifi size={10} style={{ color: "var(--kino-green)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--kino-green)" }}>온라인</span>
        </div>
      </div>
      <button onClick={() => navigate("/leave")} className="text-xs flex items-center gap-0.5 shrink-0" style={{ color: "var(--kino-muted)" }}>
        <FileText size={12} /> 연차 신청
      </button>
    </div>
  );
}

// ── Mobile: 통계 카드 ────────────────────────────────────────────
function MobileStatsCard() {
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
      <div className="grid grid-cols-2 divide-x">
        {[
          { label: "오늘 일정", value: "2" },
          { label: "진행 결재", value: "1" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center py-5">
            <span className="text-3xl font-bold" style={{ color: "var(--kino-charcoal)" }}>{s.value}</span>
            <span className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mobile: 출퇴근 카드 ──────────────────────────────────────────
function MobileAttendanceCard() {
  const [workType, setWorkType] = useState<"내근"|"외근">("내근");
  const { checkedIn, checkedOut, isLoading, isPending, checkinTime, checkoutTime, handleCheckin, handleCheckout } = useAttendance(FIXED_EMPLOYEE);

  const now = new Date();
  const dayStr = DAY_KO[now.getDay()];
  const todayStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${dayStr})`;

  const formatTime = (date: Date | undefined) => {
    if (!date) return null;
    const d = new Date(date);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const statusLabel = isLoading ? "조회 중" : checkedIn ? (checkedOut ? "퇴근" : "출근 중") : "미출근";
  const statusBg = isLoading ? "#F3F4F6" : checkedIn ? (checkedOut ? "#EFF6FF" : "#F0FDF4") : "#FEF9C3";
  const statusColor = isLoading ? "#6B7280" : checkedIn ? (checkedOut ? "#1D4ED8" : "#16A34A") : "#92400E";

  return (
    <div className="portal-card p-4 animate-fade-in-up stagger-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{todayStr}</span>
        <span
          className="text-sm px-3 py-1 rounded font-semibold"
          style={{ background: statusBg, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* 출근/퇴근 시간 표시 */}
      {(checkinTime || checkoutTime) && (
        <div className="flex justify-between text-xs mb-3" style={{ color: "var(--kino-muted)" }}>
          {checkinTime && <span>출근 {formatTime(checkinTime)}</span>}
          {checkoutTime && <span>퇴근 {formatTime(checkoutTime)}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        {(["내근","외근"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setWorkType(t)}
            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all"
            style={{
              border: `1.5px solid ${workType === t ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
              background: workType === t ? "var(--kino-charcoal)" : "transparent",
              color: workType === t ? "white" : "var(--kino-mid)",
            }}
          >
            {t === "내근" ? <Building2 size={15} /> : <MapPin size={15} />}
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCheckin(workType === "내근" ? "office" : "field")}
          disabled={checkedIn || isPending || isLoading}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all active:scale-95"
          style={{
            background: checkedIn ? "var(--kino-pale)" : "var(--kino-charcoal)",
            color: checkedIn ? "var(--kino-muted)" : "white",
            opacity: checkedIn ? 0.6 : 1,
          }}
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
          출근
        </button>
        <button
          onClick={() => handleCheckout(workType === "내근" ? "office" : "field")}
          disabled={!checkedIn || checkedOut || isPending || isLoading}
          className="flex items-center justify-center gap-2 py-3.5 rounded-lg text-sm font-bold transition-all active:scale-95"
          style={{
            border: "1.5px solid var(--kino-pale)",
            color: (!checkedIn || checkedOut) ? "var(--kino-pale)" : "var(--kino-mid)",
            opacity: (!checkedIn || checkedOut) ? 0.5 : 1,
          }}
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
          퇴근
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function Home() {
  return (
    <PortalLayout>
      <div className="container py-4 md:py-6">

        {/* ── PC LAYOUT (md 이상) ── */}
        <div className="hidden md:block">
          <div className="flex gap-4 items-start">
            {/* 좌측 패널: 직원선택+출퇴근+연차+달력 */}
            <LeftPanel />

            {/* 우측: 퀵메뉴 + 공지+게시판 / 인사발령+경조사 */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              <QuickMenuSection card={false} />
              <div className="grid grid-cols-2 gap-4">
                <NoticeSection />
                <BoardSection />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <HRSection />
                <CondolenceSection />
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE LAYOUT (md 미만) ── */}
        <div className="flex flex-col gap-3 md:hidden">
          <MobileQuickMenu />
          <MobileProfileCard />
          <MobileStatsCard />
          <MobileAttendanceCard />
          <NoticeSection />
          <BoardSection />
          <HRSection />
          <CondolenceSection />
        </div>

      </div>
    </PortalLayout>
  );
}

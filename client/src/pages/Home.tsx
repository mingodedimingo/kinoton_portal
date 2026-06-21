/**
 * Home.tsx — 키노톤 사내 포탈 메인 대시보드 (업무 허브 컨셉)
 * 핵심: 흩어진 업무 시스템을 한 곳에서 바로 접근
 * PC: 좌(프로필+출퇴근+연차+달력) + 우(외부링크 허브 + 내부기능 + 정보피드)
 * Mobile: 허브카드 → 출퇴근 → 정보피드
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Mail, FileCheck, Calendar, LayoutGrid,
  ChevronRight, Plus, Megaphone, UserCheck,
  Heart, BookOpen, ChevronLeft, LogIn, LogOut,
  Building2, MapPin, Wifi, Settings2, Loader2, FileText,
  TrendingUp, Globe, Users, Briefcase, CalendarDays, ExternalLink,
  ClipboardList, Car,
} from "lucide-react";
import PortalLayout, { openFullMenu } from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

// ── 고정 직원 정보 (김민구) ──────────────────────────────────────
const FIXED_EMPLOYEE = { id: 1, name: "김민구", department: "경영기획팀", position: "선임" };
const PROFILE_IMAGE = "/manus-storage/profile-kmg-new_30f1ac23.png";

// ── Calendar helpers ─────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const DAY_NAMES = ["일","월","화","수","목","금","토"];
const DAY_KO = ["일","월","화","수","목","금","토"];
const TODAY = new Date();

// ── 외부 시스템 링크 (업무 허브 핵심) ────────────────────────────
const EXTERNAL_SYSTEMS = [
  {
    label: "메일",
    desc: "사내 이메일 (이카운트)",
    icon: Mail,
    path: "https://wmail.ecount.com/",
    color: "#1D4ED8",
    bg: "#EFF6FF",
  },
  {
    label: "ERP",
    desc: "erp.kinoton.co.kr",
    icon: Settings2,
    path: "https://erp.kinoton.co.kr/",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    label: "영업시스템",
    desc: "sales.kinoton.co.kr",
    icon: TrendingUp,
    path: "https://sales.kinoton.co.kr/",
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    label: "홈페이지",
    desc: "kinoton.co.kr",
    icon: Globe,
    path: "https://kinoton.co.kr/",
    color: "#D97706",
    bg: "#FFFBEB",
  },
];

// ── 내부 기능 바로가기 ────────────────────────────────────────────
const INTERNAL_MENUS = [
  { label: "전자결재",   desc: "기안·결재·조회",     icon: FileCheck,     path: "/approve",   badge: 2 },
  { label: "게시판",     desc: "언론보도·매뉴얼·기타", icon: BookOpen,      path: "/board",     badge: 0 },
  { label: "일정",       desc: "개인·팀 일정",        icon: Calendar,      path: "/calendar",  badge: 0 },
  { label: "연차 신청",  desc: "연차·반차 신청",       icon: CalendarDays,  path: "/leave",     badge: 0 },
  { label: "조직도",     desc: "부서·임직원",          icon: Users,         path: "/orgchart",  badge: 0 },
  { label: "업무",       desc: "To-Do·업무현황",       icon: Briefcase,     path: "/work",      badge: 0 },
  { label: "회의실 예약",desc: "회의실·장비",           icon: Building2,     path: "/reserve",   badge: 0 },
  { label: "차량 예약",  desc: "법인차량 예약",         icon: Car,           path: "/reserve",   badge: 0 },
  { label: "인사발령",   desc: "발령·입퇴사",           icon: ClipboardList, path: "/hr",        badge: 0 },
  { label: "전체메뉴",   desc: "모든 메뉴 보기",        icon: LayoutGrid,    path: "/#menu",     badge: 0 },
];

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
    if (!employee) { toast.error("직원 정보가 없습니다."); return; }
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
    if (!employee) { toast.error("직원 정보가 없습니다."); return; }
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

// ── Left Panel (PC only) — 프로필+출퇴근+연차+달력 ────────────────
function LeftPanel() {
  const [, navigate] = useLocation();
  const [workType, setWorkType] = useState<"내근"|"외근">("내근");
  const { checkedIn, checkedOut, isLoading, isPending, checkinTime, checkoutTime, handleCheckin, handleCheckout } = useAttendance(FIXED_EMPLOYEE);

  const { data: leaveBalance } = trpc.employees.leaveBalance.useQuery(
    { employeeId: FIXED_EMPLOYEE.id },
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
      className="portal-card animate-fade-in-up stagger-1 p-4 flex flex-col gap-0"
      style={{ width: "240px", flexShrink: 0 }}
    >
      {/* 프로필 */}
      <div className="pb-3 flex flex-col items-center text-center" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <img
          src={PROFILE_IMAGE}
          alt={FIXED_EMPLOYEE.name}
          className="w-14 h-14 rounded-full object-cover mb-2"
          style={{ border: "2px solid var(--kino-pale)" }}
        />
        <p className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>{FIXED_EMPLOYEE.name}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{FIXED_EMPLOYEE.department} · {FIXED_EMPLOYEE.position}</p>
        <div className="flex items-center gap-1 mt-1.5">
          <Wifi size={10} style={{ color: "var(--kino-green)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--kino-green)" }}>온라인</span>
        </div>
      </div>

      {/* 출퇴근 */}
      <div className="py-3" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{todayStr}</span>
          <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: statusBg, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        {(checkinTime || checkoutTime) && (
          <div className="flex justify-between text-xs mb-2" style={{ color: "var(--kino-muted)" }}>
            {checkinTime && <span>출근 {formatTime(checkinTime)}</span>}
            {checkoutTime && <span>퇴근 {formatTime(checkoutTime)}</span>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          {(["내근","외근"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setWorkType(t)}
              className="flex items-center justify-center gap-1 py-1.5 rounded text-xs font-semibold transition-all"
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
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleCheckin(workType === "내근" ? "office" : "field")}
            disabled={checkedIn || isPending || isLoading}
            className="flex items-center justify-center gap-1 py-2 rounded text-xs font-bold transition-all active:scale-95"
            style={{
              background: checkedIn ? "var(--kino-pale)" : "var(--kino-charcoal)",
              color: checkedIn ? "var(--kino-muted)" : "white",
              opacity: checkedIn ? 0.6 : 1,
            }}
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <LogIn size={11} />}
            출근
          </button>
          <button
            onClick={() => handleCheckout(workType === "내근" ? "office" : "field")}
            disabled={!checkedIn || checkedOut || isPending || isLoading}
            className="flex items-center justify-center gap-1 py-2 rounded text-xs font-bold transition-all active:scale-95"
            style={{
              border: "1.5px solid var(--kino-pale)",
              color: (!checkedIn || checkedOut) ? "var(--kino-pale)" : "var(--kino-mid)",
              opacity: (!checkedIn || checkedOut) ? 0.5 : 1,
            }}
          >
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <LogOut size={11} />}
            퇴근
          </button>
        </div>
      </div>

      {/* 연차 현황 */}
      <div className="py-3" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>연차 현황</span>
          <button className="text-xs flex items-center gap-0.5" style={{ color: "var(--kino-muted)" }} onClick={() => navigate("/leave")}>
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

// ── 외부 시스템 허브 섹션 ─────────────────────────────────────────
function ExternalSystemHub() {
  return (
    <div
      className="portal-card animate-fade-in-up stagger-1 p-4"
      style={{ borderLeft: "3px solid var(--kino-charcoal)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
          <ExternalLink size={14} />
          외부 시스템 바로가기
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>
          새 탭으로 열림
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {EXTERNAL_SYSTEMS.map((sys) => {
          const Icon = sys.icon;
          return (
            <a
              key={sys.label}
              href={sys.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 p-4 rounded-lg transition-all active:scale-95 group"
              style={{
                background: sys.bg,
                border: `1px solid ${sys.color}22`,
                textDecoration: "none",
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ background: sys.color + "18" }}
              >
                <Icon size={22} style={{ color: sys.color }} />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold" style={{ color: sys.color }}>{sys.label}</p>
                <p className="text-xs mt-0.5 leading-tight" style={{ color: "var(--kino-muted)", fontSize: "0.65rem" }}>{sys.desc}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── 내부 기능 바로가기 그리드 ─────────────────────────────────────
function InternalMenuGrid() {
  const handleClick = (item: typeof INTERNAL_MENUS[0]) => {
    if (item.path === "/#menu") { openFullMenu(); return; }
    window.location.href = item.path;
  };
  return (
    <div className="portal-card animate-fade-in-up stagger-2 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
          <LayoutGrid size={14} />
          사내 시스템
        </h2>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {INTERNAL_MENUS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg transition-all active:scale-95 group"
              style={{ background: "var(--kino-bg)" }}
            >
              <div className="relative">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors group-hover:bg-gray-200"
                  style={{ background: "var(--kino-pale)" }}
                >
                  <Icon size={18} style={{ color: "var(--kino-charcoal)" }} />
                </div>
                {item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-white font-bold"
                    style={{ background: "var(--kino-red)", fontSize: "0.6rem" }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium leading-tight text-center" style={{ color: "var(--kino-charcoal)", fontSize: "0.7rem" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Notice Section (DB 연동) ─────────────────────────────────────
function NoticeSection() {
  const [tab, setTab] = useState<"all"|"company"|"dept">("all");
  const { data: notices, isLoading } = trpc.notices.list.useQuery({ limit: 5 });
  const filtered = tab === "all" ? notices : notices?.filter(n => n.category === tab);
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
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
          <div key={n.id} className="board-item" onClick={() => toast(`"${n.title}"`)} style={{ cursor: "pointer" }}>
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
  const { data: hrList, isLoading } = trpc.hrNotices.list.useQuery({ limit: 4 });
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
        ) : hrList.slice(0, 4).map((h) => (
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
  const { data: posts, isLoading } = trpc.board.list.useQuery({ category: categoryMap[tab], limit: 4 });
  return (
    <div className="portal-card animate-fade-in-up stagger-3">
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
        ) : posts.slice(0, 4).map((p) => (
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
  const { data: list, isLoading } = trpc.condolences.list.useQuery({ limit: 4 });
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
        ) : list.slice(0, 4).map((c) => (
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

// ── Mobile: 외부 시스템 허브 카드 ─────────────────────────────────
function MobileExternalHub() {
  return (
    <div className="portal-card p-4 animate-fade-in-up stagger-1" style={{ borderLeft: "3px solid var(--kino-charcoal)" }}>
      <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
        <ExternalLink size={14} />
        외부 시스템 바로가기
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {EXTERNAL_SYSTEMS.map((sys) => {
          const Icon = sys.icon;
          return (
            <a
              key={sys.label}
              href={sys.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg transition-all active:scale-95"
              style={{ background: sys.bg, border: `1px solid ${sys.color}22`, textDecoration: "none" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: sys.color + "18" }}>
                <Icon size={18} style={{ color: sys.color }} />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: sys.color }}>{sys.label}</p>
                <p style={{ color: "var(--kino-muted)", fontSize: "0.65rem" }}>{sys.desc}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ── Mobile: 내부 기능 그리드 ──────────────────────────────────────
function MobileInternalGrid() {
  const handleClick = (item: typeof INTERNAL_MENUS[0]) => {
    if (item.path === "/#menu") { openFullMenu(); return; }
    window.location.href = item.path;
  };
  return (
    <div className="portal-card p-4 animate-fade-in-up stagger-2">
      <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
        <LayoutGrid size={14} />
        사내 시스템
      </h2>
      <div className="grid grid-cols-5 gap-2">
        {INTERNAL_MENUS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all active:scale-95"
              style={{ background: "var(--kino-bg)" }}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--kino-pale)" }}>
                  <Icon size={18} style={{ color: "var(--kino-charcoal)" }} />
                </div>
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full text-white font-bold" style={{ background: "var(--kino-red)", fontSize: "0.6rem" }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-center leading-tight" style={{ color: "var(--kino-charcoal)", fontSize: "0.65rem" }}>{item.label}</span>
            </button>
          );
        })}
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
    <div className="portal-card p-4 animate-fade-in-up stagger-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{todayStr}</span>
        <span className="text-sm px-3 py-1 rounded font-semibold" style={{ background: statusBg, color: statusColor }}>{statusLabel}</span>
      </div>
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
            {/* 좌측 패널: 프로필+출퇴근+연차+달력 */}
            <LeftPanel />

            {/* 우측: 외부시스템 허브 + 내부기능 + 정보피드 */}
            <div className="flex-1 min-w-0 flex flex-col gap-4">
              {/* 외부 시스템 바로가기 (핵심) */}
              <ExternalSystemHub />

              {/* 내부 기능 바로가기 */}
              <InternalMenuGrid />

              {/* 정보 피드: 공지 + 게시판 */}
              <div className="grid grid-cols-2 gap-4">
                <NoticeSection />
                <BoardSection />
              </div>

              {/* 정보 피드: 인사발령 + 경조사 */}
              <div className="grid grid-cols-2 gap-4">
                <HRSection />
                <CondolenceSection />
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE LAYOUT (md 미만) ── */}
        <div className="flex flex-col gap-3 md:hidden">
          <MobileExternalHub />
          <MobileInternalGrid />
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

/**
 * AdminLayout — 어드민 공통 레이아웃
 * - 사이드바 네비게이션
 * - 인증 가드 (role=admin 체크, 미인증 시 포탈 로그인으로 리다이렉트)
 * - 모노크롬 다크 사이드바 디자인
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard, ClipboardList, Megaphone,
  UserCheck, Heart, BookOpen, LogOut,
  Menu, X, ChevronRight, Loader2, Users, CalendarDays,
  ShieldOff, Building2, Package, Image,
} from "lucide-react";

const ADMIN_NAV = [
  { label: "대시보드",    icon: LayoutDashboard, path: "/admin" },
  { label: "출퇴근 관리", icon: ClipboardList,   path: "/admin/attendance" },
  { label: "직원 관리",   icon: Users,           path: "/admin/employees" },
  { label: "공지사항",    icon: Megaphone,       path: "/admin/notices" },
  { label: "인사발령",    icon: UserCheck,       path: "/admin/hr" },
  { label: "경조사",      icon: Heart,           path: "/admin/condolences" },
  { label: "게시판",      icon: BookOpen,        path: "/admin/board" },
  { label: "예약 관리",   icon: Building2,       path: "/admin/reserve" },
  { label: "자원 관리",   icon: Package,         path: "/admin/resources" },
  { label: "배너 관리",   icon: Image,           path: "/admin/banners" },
];

interface Props {
  children: React.ReactNode;
  title?: string;
}

export default function AdminLayout({ children, title }: Props) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isChecking, logout } = useAdminAuth();

  // 인증 확인 중
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kino-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 미인증 → 어드민 로그인 페이지로 이동
  if (!isAuthenticated && !isChecking) {
    window.location.href = "/admin/login";
    return null;
  }

  // 인증됐지만 어드민 권한 없음 (혹시 모를 케이스 - 이 분기는 위에서 이미 처리됨)
  if (false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kino-bg)" }}>
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: "var(--kino-pale)" }}
          >
            <ShieldOff size={24} style={{ color: "var(--kino-muted)" }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>
            접근 권한이 없습니다
          </h2>
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>
            관리자 권한이 필요한 페이지입니다.<br />
            담당자에게 권한 부여를 요청하세요.
          </p>
          <Link href="/">
            <button
              className="px-5 py-2.5 rounded-md text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              포탈 홈으로 돌아가기
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const currentNavItem = ADMIN_NAV.find(n => n.path === location);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--kino-bg)" }}>
      {/* ── 사이드바 (PC) ── */}
      <aside
        className="hidden lg:flex flex-col"
        style={{
          width: "220px",
          flexShrink: 0,
          background: "#1A1A1A",
          minHeight: "100vh",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* 로고 영역 */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663697530344/QjSWvYHAscBiZoqJ.png"
              alt="Kinoton"
              style={{ height: "22px", width: "auto" }}
            />
          </Link>
          <p className="text-xs mt-1.5 font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>
            Admin
          </p>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 py-4 px-3">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 cursor-pointer transition-all"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                    color: isActive ? "white" : "rgba(255,255,255,0.55)",
                  }}
                >
                  <Icon size={15} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && <ChevronRight size={12} className="ml-auto" style={{ color: "rgba(255,255,255,0.4)" }} />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* 하단: 포탈로 돌아가기 + 로그아웃 */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 cursor-pointer transition-all"
              style={{ color: "rgba(255,255,255,0.4)" }}>
              <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
              <span className="text-xs font-medium">포탈로 돌아가기</span>
            </div>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <LogOut size={14} />
            <span className="text-xs font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* ── 모바일 사이드바 오버레이 ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative flex flex-col"
            style={{ width: "240px", background: "#1A1A1A", minHeight: "100vh", zIndex: 1 }}
          >
            <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663697530344/QjSWvYHAscBiZoqJ.png" alt="Kinoton" style={{ height: "22px", width: "auto" }} />
                <p className="text-xs mt-1 font-semibold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Admin</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} style={{ color: "rgba(255,255,255,0.5)" }}>
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 py-4 px-3">
              {ADMIN_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-0.5 cursor-pointer"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                        color: isActive ? "white" : "rgba(255,255,255,0.55)",
                      }}
                    >
                      <Icon size={15} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md" style={{ color: "rgba(255,255,255,0.4)" }}>
                <LogOut size={14} />
                <span className="text-xs font-medium">로그아웃</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 */}
        <header
          className="sticky top-0 z-40 flex items-center px-4 md:px-6 gap-3"
          style={{
            height: "52px",
            background: "var(--kino-white)",
            borderBottom: "1px solid var(--kino-pale)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {/* 모바일 햄버거 */}
          <button
            className="lg:hidden p-1.5 rounded"
            onClick={() => setSidebarOpen(true)}
            style={{ color: "var(--kino-mid)" }}
          >
            <Menu size={20} />
          </button>

          {/* 현재 페이지 타이틀 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>관리자</span>
            <span style={{ color: "var(--kino-pale)" }}>/</span>
            <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>
              {title ?? currentNavItem?.label ?? "어드민"}
            </span>
          </div>

          {/* 우측: 포탈 바로가기 + 로그아웃 */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs font-medium hidden md:block" style={{ color: "var(--kino-muted)" }}>관리자</span>
            <Link href="/">
              <span className="text-xs font-medium cursor-pointer" style={{ color: "var(--kino-muted)" }}>
                ← 포탈로
              </span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded transition-all"
              style={{ color: "var(--kino-mid)", border: "1px solid var(--kino-pale)" }}
            >
              <LogOut size={12} />
              로그아웃
            </button>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>

        {/* 푸터 */}
        <footer className="text-center py-3 text-xs" style={{ color: "var(--kino-light)", borderTop: "1px solid var(--kino-pale)" }}>
          © 2026 Kinoton Inc. Admin Panel
        </footer>
      </div>
    </div>
  );
}

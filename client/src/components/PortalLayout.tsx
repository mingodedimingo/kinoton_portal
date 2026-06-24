/**
 * PortalLayout — 키노톤 사내 포탈 공통 레이아웃
 * Design: Monochrome Precision
 * PC 헤더: 로고 + 검색바 + GNB + 알림 + 프로필(사진+이름/부서)
 * Mobile 헤더: 로고 + [검색아이콘 + 알림(빨간점) + 구분선 + 프로필사진 + 햄버거]
 * GNB: 메일·전자결재·게시판·ERP·영업시스템·전체메뉴
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Bell, Search, Mail, FileCheck, LayoutGrid,
  BookOpen, Building2, Settings2, Network,
  Menu, X, ChevronRight, LogOut, Settings, User,
} from "lucide-react";
import FullMenuOverlay from "./FullMenuOverlay";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const NAV_ITEMS = [
  { label: "메일",       icon: Mail,       path: "https://wmail.ecount.com/",      external: true },
  { label: "전자결재",   icon: FileCheck,  path: "/approve",                       external: false },
  { label: "게시판",     icon: BookOpen,   path: "/board",                         external: false },
  { label: "조직도",     icon: Network,    path: "/orgchart",                     external: false },
  { label: "ERP",        icon: Settings2,  path: "https://erp.kinoton.co.kr/",    external: true },
  { label: "영업시스템", icon: Building2,  path: "https://sales.kinoton.co.kr/",  external: true },
  { label: "전체메뉴",   icon: LayoutGrid, path: "/#menu",                         external: false },
];

interface Props {
  children: React.ReactNode;
  onFullMenuOpen?: () => void;
}

// 전체메뉴 상태를 전역에서 제어할 수 있도록 이벤트로 처리
let _setFullMenuOpen: ((v: boolean) => void) | null = null;
export function openFullMenu() {
  _setFullMenuOpen?.(true);
}

export default function PortalLayout({ children }: Props) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fullMenuOpen, setFullMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/login";
    },
    onError: () => {
      // 오류가 있어도 로그인 페이지로 이동
      window.location.href = "/login";
    },
  });

  // 외부에서 열 수 있도록 등록
  _setFullMenuOpen = setFullMenuOpen;

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleComingSoon = (label: string) => {
    toast(`${label} 기능은 준비 중입니다.`);
  };

  const handleNavClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.path === "/#menu") {
      setFullMenuOpen(true);
    } else if (item.external) {
      window.open(item.path, "_blank");
    } else {
      window.location.href = item.path;
    }
  };

  const handleLogout = () => {
    setProfileDropdownOpen(false);
    logoutMutation.mutate();
  };

  const handleSwitchAccount = () => {
    setProfileDropdownOpen(false);
    // 로그아웃 후 로그인 페이지로 이동
    logoutMutation.mutate();
  };

  // 현재 로그인한 사용자 정보 (employee 로그인 또는 OAuth 로그인)
  const displayName = (user as any)?.name ?? "김민구";
  const displayDept = (user as any)?.department
    ? `${(user as any).department}${(user as any).position ? " · " + (user as any).position : ""}`
    : "경영기획팀 · 선임";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--kino-bg)" }}>
      {/* 전체메뉴 오버레이 */}
      <FullMenuOverlay open={fullMenuOpen} onClose={() => setFullMenuOpen(false)} />

      {/* ── TOP HEADER ── */}
      <header
        className="sticky top-0 z-50 flex items-center px-4 md:px-6"
        style={{
          height: "56px",
          background: "var(--kino-white)",
          borderBottom: "1px solid var(--kino-pale)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          gap: "0.75rem",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0 mr-2">
          <img
            src="/manus-storage/kinoton_logo_bk_d7634f1a.png"
            alt="Kinoton"
            style={{ height: "28px", width: "auto" }}
          />
        </Link>

        {/* Search bar — desktop only */}
        <div className="hidden md:flex items-center flex-1 max-w-xs">
          <div
            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm"
            style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
          >
            <Search size={14} style={{ color: "var(--kino-muted)" }} />
            <input
              type="text"
              placeholder="통합검색 (메일, 결재, 게시판, 직원...)"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--kino-charcoal)" }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleComingSoon("통합검색"); }}
            />
          </div>
        </div>

        {/* GNB — desktop only (lg 이상) */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = !item.external && location === item.path;
            return (
              <button
                key={item.label}
                className={`gnb-item ${isActive ? "active" : ""}`}
                onClick={() => handleNavClick(item)}
              >
                <Icon size={14} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* ── Right side ── */}
        <div className="ml-auto flex items-center">

          {/* Mobile: 검색 아이콘 */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={20} style={{ color: "var(--kino-mid)" }} />
          </button>

          {/* 알림 — 모바일: 빨간 점만 / PC: 숫자 배지 */}
          <button
            className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => handleComingSoon("알림")}
          >
            <Bell size={20} style={{ color: "var(--kino-mid)" }} />
          </button>

          {/* 구분선 — 모바일에서만 표시 */}
          <div
            className="md:hidden mx-1"
            style={{ width: "1px", height: "20px", background: "var(--kino-pale)" }}
          />

          {/* 프로필 드롭다운 */}
          <div ref={profileRef} className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-md hover:bg-gray-50 transition-colors"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              <img
                src="/manus-storage/profile-kmg-new_30f1ac23.png"
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover"
                style={{ border: "1.5px solid var(--kino-pale)" }}
              />
              {/* PC: 이름/부서 텍스트 */}
              <div className="hidden md:block mr-1">
                <p className="text-xs font-semibold leading-tight" style={{ color: "var(--kino-charcoal)" }}>{displayName}</p>
                <p className="text-xs leading-tight" style={{ color: "var(--kino-muted)" }}>{displayDept}</p>
              </div>
            </div>

            {/* 드롭다운 메뉴 */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-lg shadow-lg overflow-hidden z-50"
                style={{
                  background: "var(--kino-white)",
                  border: "1px solid var(--kino-pale)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                }}
              >
                {/* 사용자 정보 헤더 */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{displayName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{displayDept}</p>
                </div>

                {/* 메뉴 항목 */}
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
                    style={{ color: "var(--kino-charcoal)" }}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      window.location.href = "/mypage";
                    }}
                  >
                    <User size={14} style={{ color: "var(--kino-mid)" }} />
                    내 프로필
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
                    style={{ color: "var(--kino-charcoal)" }}
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleComingSoon("설정");
                    }}
                  >
                    <Settings size={14} style={{ color: "var(--kino-mid)" }} />
                    설정
                  </button>
                </div>

                <div style={{ borderTop: "1px solid var(--kino-pale)" }} className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50"
                    style={{ color: "var(--kino-charcoal)" }}
                    onClick={handleSwitchAccount}
                  >
                    <LogOut size={14} style={{ color: "var(--kino-mid)" }} />
                    다른 계정으로 로그인
                  </button>
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors hover:bg-red-50"
                    style={{ color: "#DC2626" }}
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut size={14} />
                    {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 햄버거 메뉴 — lg 미만에서만 표시 */}
          <button
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors ml-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile search bar (검색 아이콘 클릭 시) */}
      {searchOpen && (
        <div
          className="md:hidden px-4 py-2 animate-fade-in"
          style={{ background: "var(--kino-white)", borderBottom: "1px solid var(--kino-pale)" }}
        >
          <div
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md"
            style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
          >
            <Search size={14} style={{ color: "var(--kino-muted)" }} />
            <input
              type="text"
              placeholder="통합검색..."
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden animate-fade-in"
          style={{ background: "var(--kino-white)", borderBottom: "1px solid var(--kino-pale)" }}
        >
          <nav className="flex flex-col p-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = !item.external && location === item.path;
              return (
                <button
                  key={item.label}
                  className={`gnb-item ${isActive ? "active" : ""} w-full text-left`}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleNavClick(item);
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.external && (
                    <span className="ml-1 text-xs" style={{ color: "var(--kino-muted)" }}>↗</span>
                  )}
                  <ChevronRight size={14} className="ml-auto" style={{ color: "var(--kino-light)" }} />
                </button>
              );
            })}
            <div style={{ borderTop: "1px solid var(--kino-pale)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
              <button className="gnb-item w-full" onClick={() => { setMobileMenuOpen(false); handleComingSoon("설정"); }}>
                <Settings size={16} /> 설정
              </button>
              <button
                className="gnb-item w-full"
                style={{ color: "#DC2626" }}
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                disabled={logoutMutation.isPending}
              >
                <LogOut size={16} /> {logoutMutation.isPending ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer
        className="text-center py-3 text-xs"
        style={{ color: "var(--kino-light)", borderTop: "1px solid var(--kino-pale)", background: "var(--kino-white)" }}
      >
        © 2026 Kinoton Inc. All rights reserved. &nbsp;|&nbsp; Imagineering Company &nbsp;|&nbsp;
        <a href="/privacy" className="hover:underline" style={{ color: "var(--kino-muted)" }}>개인정보처리방침</a>
      </footer>
    </div>
  );
}

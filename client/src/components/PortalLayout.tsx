/**
 * PortalLayout — 키노톤 사내 포탈 공통 레이아웃
 * Design: Monochrome Precision — dark sidebar + white main content
 * 상단 헤더(로고+검색+GNB+알림+프로필) + 좌측 사이드바(모바일에서 숨김)
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  Bell,
  Search,
  Mail,
  FileCheck,
  LayoutGrid,
  Calendar,
  Users,
  BookOpen,
  Briefcase,
  Building2,
  Menu,
  X,
  ChevronRight,
  LogOut,
  Settings,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "메일",     icon: Mail,        path: "/mail" },
  { label: "전자결재", icon: FileCheck,    path: "/approve" },
  { label: "게시판",   icon: BookOpen,     path: "/board" },
  { label: "일정",     icon: Calendar,     path: "/calendar" },
  { label: "조직도",   icon: Users,        path: "/orgchart" },
  { label: "예약",     icon: Building2,    path: "/reserve" },
  { label: "업무",     icon: Briefcase,    path: "/work" },
  { label: "전체메뉴", icon: LayoutGrid,   path: "/#menu" },
];

interface Props {
  children: React.ReactNode;
}

export default function PortalLayout({ children }: Props) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleComingSoon = (label: string) => {
    toast(`${label} 기능은 준비 중입니다.`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--kino-bg)" }}>
      {/* ── TOP HEADER ── */}
      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-4 md:px-6"
        style={{
          height: "56px",
          background: "var(--kino-white)",
          borderBottom: "1px solid var(--kino-pale)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
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

        {/* Search bar — desktop */}
        <div className="hidden md:flex items-center flex-1 max-w-sm">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") handleComingSoon("통합검색");
              }}
            />
          </div>
        </div>

        {/* GNB — desktop */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`gnb-item ${isActive ? "active" : ""}`}
                onClick={item.path === "/#menu" ? (e) => { e.preventDefault(); handleComingSoon("전체메뉴"); } : undefined}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Mobile search icon */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search size={20} style={{ color: "var(--kino-mid)" }} />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-md hover:bg-gray-100 transition-colors"
            onClick={() => handleComingSoon("알림")}
          >
            <Bell size={20} style={{ color: "var(--kino-mid)" }} />
            <span
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full text-white font-bold"
              style={{ background: "var(--kino-red)", fontSize: "0.6rem" }}
            >3</span>
          </button>

          {/* Profile avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white mx-1 cursor-pointer"
            style={{ background: "var(--kino-charcoal)" }}
            onClick={() => handleComingSoon("마이페이지")}
          >
            김
          </div>

          {/* Desktop: name */}
          <div className="hidden md:block mr-1">
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--kino-charcoal)" }}>김팽팽</p>
            <p className="text-xs leading-tight" style={{ color: "var(--kino-muted)" }}>개발팀 · 대리</p>
          </div>

          {/* Divider + Mobile menu toggle */}
          <div className="flex items-center" style={{ borderLeft: "1px solid var(--kino-pale)", paddingLeft: "0.5rem", marginLeft: "0.25rem" }}>
            <button
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile search bar */}
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
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`gnb-item ${isActive ? "active" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={16} />
                  {item.label}
                  <ChevronRight size={14} className="ml-auto" style={{ color: "var(--kino-light)" }} />
                </Link>
              );
            })}
            <div style={{ borderTop: "1px solid var(--kino-pale)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
              <button className="gnb-item w-full" onClick={() => handleComingSoon("설정")}>
                <Settings size={16} /> 설정
              </button>
              <button className="gnb-item w-full" onClick={() => handleComingSoon("로그아웃")}>
                <LogOut size={16} /> 로그아웃
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
        © 2026 Kinoton Inc. All rights reserved. &nbsp;|&nbsp; Imagineering Company
      </footer>
    </div>
  );
}

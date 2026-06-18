/**
 * FullMenuOverlay — 전체메뉴 오버레이 팝업
 * 현대퓨쳐넷 스타일: 카테고리별 메뉴 그리드
 */
import { Link } from "wouter";
import { X, Mail, FileCheck, BookOpen, Calendar, Users, Building2, Briefcase,
  MessageSquare, FileText, BarChart2, Settings, HelpCircle, Bell,
  ClipboardList, Car, Coffee, Globe, Settings2, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MENU_GROUPS = [
  {
    category: "커뮤니케이션",
    items: [
      { label: "메일",       icon: Mail,          path: "/mail",      desc: "사내 이메일" },
      { label: "게시판",     icon: BookOpen,       path: "/board",     desc: "언론보도 / 매뉴얼 / 기타" },
      { label: "쪽지",       icon: MessageSquare,  path: "/#msg",      desc: "사내 메시지" },
    ],
  },
  {
    category: "업무·결재",
    items: [
      { label: "전자결재",   icon: FileCheck,      path: "/approve",   desc: "기안·결재·조회" },
      { label: "업무",       icon: Briefcase,      path: "/work",      desc: "To-Do·업무현황" },
      { label: "보고서",     icon: FileText,       path: "/#report",   desc: "업무 보고" },
    ],
  },
  {
    category: "일정·예약",
    items: [
      { label: "일정",       icon: Calendar,       path: "/calendar",  desc: "개인·팀 일정" },
      { label: "회의실 예약", icon: Building2,     path: "/reserve",   desc: "회의실·장비" },
      { label: "차량 예약",  icon: Car,            path: "/reserve",   desc: "법인차량 예약" },
    ],
  },
  {
    category: "조직·인사",
    items: [
      { label: "조직도",     icon: Users,          path: "/orgchart",  desc: "부서·임직원" },
      { label: "인사발령",   icon: ClipboardList,  path: "/#hr",       desc: "발령·입퇴사" },
      { label: "근태관리",   icon: Coffee,         path: "/#attend",   desc: "출퇴근·연차" },
    ],
  },
  {
    category: "링크",
    items: [
      { label: "ERP",        icon: Settings2,      path: "https://erp.kinoton.co.kr/",   desc: "erp.kinoton.co.kr" },
      { label: "영업시스템", icon: TrendingUp,     path: "https://sales.kinoton.co.kr/", desc: "sales.kinoton.co.kr" },
      { label: "홈페이지",   icon: Globe,          path: "https://kinoton.co.kr/",       desc: "kinoton.co.kr" },
    ],
  },
  {
    category: "시스템",
    items: [
      { label: "알림",       icon: Bell,           path: "/#notify",   desc: "알림 설정" },
      { label: "설정",       icon: Settings,       path: "/#settings", desc: "개인 설정" },
      { label: "도움말",     icon: HelpCircle,     path: "/#help",     desc: "사용 가이드" },
    ],
  },
];

export default function FullMenuOverlay({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      {/* 딤 배경 */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "rgba(0,0,0,0.45)" }}
        onClick={onClose}
      />

      {/* 패널 */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[101] overflow-y-auto animate-slide-in-right"
        style={{
          width: "min(480px, 100vw)",
          background: "var(--kino-white)",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        }}
      >
        {/* 헤더 */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4"
          style={{
            background: "var(--kino-charcoal)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <p className="text-base font-bold text-white">전체메뉴</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
              Kinoton 사내 포탈 전체 서비스
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-white/10"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* 메뉴 그리드 */}
        <div className="p-5 flex flex-col gap-6">
          {MENU_GROUPS.map((group) => (
            <div key={group.category}>
              {/* 카테고리 헤더 */}
              <div
                className="flex items-center gap-2 mb-3 pb-1.5"
                style={{ borderBottom: "1.5px solid var(--kino-pale)" }}
              >
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: "var(--kino-charcoal)" }}
                >
                  {group.category}
                </span>
              </div>

              {/* 메뉴 아이템 3열 그리드 */}
              <div className="grid grid-cols-3 gap-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isExternal = item.path.startsWith("http");
                  const isComingSoon = item.path.startsWith("/#");

                  const content = (
                    <div
                      className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all cursor-pointer group"
                      style={{ border: "1px solid var(--kino-pale)" }}
                      onClick={isComingSoon ? onClose : undefined}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors group-hover:bg-gray-900"
                        style={{ background: "var(--kino-bg)" }}
                      >
                        <Icon
                          size={20}
                          style={{ color: "var(--kino-charcoal)" }}
                          className="group-hover:text-white transition-colors"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                          {item.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)", fontSize: "0.65rem" }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );

                  if (isExternal) {
                    return (
                      <a key={item.label} href={item.path} target="_blank" rel="noopener noreferrer" onClick={onClose}>
                        {content}
                      </a>
                    );
                  }
                  if (isComingSoon) {
                    return <div key={item.label}>{content}</div>;
                  }
                  return (
                    <Link key={item.label} href={item.path} onClick={onClose}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div
          className="px-6 py-4 text-center text-xs"
          style={{ color: "var(--kino-light)", borderTop: "1px solid var(--kino-pale)" }}
        >
          © 2026 Kinoton Inc. — Imagineering Company
        </div>
      </div>
    </>
  );
}

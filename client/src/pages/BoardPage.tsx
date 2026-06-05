import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, Plus, ChevronRight, Megaphone, BookOpen, UserCheck, Heart } from "lucide-react";

const ALL_POSTS = [
  { id: 1, board: "공지사항", category: "공지", title: "2026년 하반기 사업계획 발표 안내", author: "관리자", date: "2026.06.04", views: 128, isNew: true },
  { id: 2, board: "공지사항", category: "공지", title: "사무실 이전 관련 안내사항 (6/15 예정)", author: "관리자", date: "2026.06.03", views: 95, isNew: true },
  { id: 3, board: "자유게시판", category: "자유", title: "6월 사내 동호회 모집 안내 (등산/독서/볼링)", author: "김팽팽", date: "2026.06.04", views: 42, isNew: true },
  { id: 4, board: "업무게시판", category: "업무", title: "Q2 프로젝트 납품 완료 보고", author: "이서연", date: "2026.06.03", views: 67 },
  { id: 5, board: "공지사항", category: "공지", title: "정보보안 교육 이수 필수 안내 (6/30 마감)", author: "관리자", date: "2026.06.02", views: 201 },
  { id: 6, board: "자유게시판", category: "자유", title: "구내식당 6월 메뉴 공지", author: "총무팀", date: "2026.06.02", views: 88 },
  { id: 7, board: "업무게시판", category: "업무", title: "신규 장비 도입 관련 의견 수렴", author: "박지호", date: "2026.06.01", views: 35 },
  { id: 8, board: "자유게시판", category: "자유", title: "5월 생일자 축하합니다 🎂", author: "HR팀", date: "2026.05.30", views: 156 },
];

const BOARDS = [
  { key: "all", label: "전체", icon: BookOpen },
  { key: "공지사항", label: "공지사항", icon: Megaphone },
  { key: "자유게시판", label: "자유게시판", icon: BookOpen },
  { key: "업무게시판", label: "업무게시판", icon: UserCheck },
  { key: "인사발령", label: "인사발령", icon: UserCheck },
  { key: "경조사", label: "경조사", icon: Heart },
];

export default function BoardPage() {
  const [activeBoard, setActiveBoard] = useState("all");
  const [search, setSearch] = useState("");
  const filtered = ALL_POSTS.filter(p => {
    const matchBoard = activeBoard === "all" || p.board === activeBoard;
    const matchSearch = !search || p.title.includes(search) || p.author.includes(search);
    return matchBoard && matchSearch;
  });
  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex gap-5">
          <div className="shrink-0 w-44">
            <div className="portal-card overflow-hidden">
              <div className="section-header"><span className="section-title">게시판</span></div>
              <nav className="py-1">
                {BOARDS.map((b) => { const Icon = b.icon; return (
                  <button key={b.key} onClick={() => setActiveBoard(b.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
                    style={{ background: activeBoard === b.key ? "var(--kino-charcoal)" : "transparent", color: activeBoard === b.key ? "white" : "var(--kino-mid)", fontWeight: activeBoard === b.key ? 600 : 400 }}>
                    <Icon size={13} />{b.label}
                  </button>
                );})}
              </nav>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="portal-card">
              <div className="section-header">
                <span className="section-title">{BOARDS.find(b => b.key === activeBoard)?.label || "전체"}<span className="ml-2 text-xs font-normal" style={{ color: "var(--kino-muted)" }}>총 {filtered.length}건</span></span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs" style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}>
                    <Search size={12} style={{ color: "var(--kino-muted)" }} />
                    <input type="text" placeholder="검색..." className="bg-transparent outline-none w-32 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <button onClick={() => toast("글쓰기 기능 준비 중")} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white" style={{ background: "var(--kino-charcoal)" }}>
                    <Plus size={12} /> 글쓰기
                  </button>
                </div>
              </div>
              <div className="grid text-xs font-semibold px-3 py-2" style={{ gridTemplateColumns: "60px 1fr 80px 80px 50px", background: "var(--kino-bg)", color: "var(--kino-muted)", borderBottom: "1px solid var(--kino-pale)" }}>
                <span>분류</span><span>제목</span><span className="text-center">작성자</span><span className="text-center">날짜</span><span className="text-center">조회</span>
              </div>
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: "var(--kino-light)" }}>게시글이 없습니다.</div>
              ) : filtered.map((p) => (
                <div key={p.id} className="grid items-center px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-gray-50" style={{ gridTemplateColumns: "60px 1fr 80px 80px 50px", borderBottom: "1px solid var(--kino-pale)" }} onClick={() => toast(`"${p.title}" 상세 보기 준비 중`)}>
                  <span className="badge-tag" style={{ width: "fit-content" }}>{p.category}</span>
                  <span className="flex items-center gap-1.5 min-w-0"><span className="truncate" style={{ color: "var(--kino-charcoal)" }}>{p.title}</span>{p.isNew && <span className="badge-new shrink-0">N</span>}</span>
                  <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>{p.author}</span>
                  <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>{p.date}</span>
                  <span className="text-center text-xs" style={{ color: "var(--kino-light)" }}>{p.views}</span>
                </div>
              ))}
              <div className="flex items-center justify-center gap-1 py-3">
                {[1,2,3,4,5].map(n => (<button key={n} className="w-7 h-7 rounded text-xs font-medium transition-colors" style={{ background: n === 1 ? "var(--kino-charcoal)" : "transparent", color: n === 1 ? "white" : "var(--kino-mid)" }} onClick={() => toast(`${n}페이지 준비 중`)}>{n}</button>))}
                <button className="flex items-center gap-0.5 px-2 py-1 rounded text-xs" style={{ color: "var(--kino-muted)" }} onClick={() => toast("다음 페이지 준비 중")}>다음 <ChevronRight size={12} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

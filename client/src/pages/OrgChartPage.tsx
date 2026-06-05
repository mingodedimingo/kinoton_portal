import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronRight, Phone, Mail, User } from "lucide-react";

const ORG_DATA = {
  name: "키노톤(주)", title: "대표이사", person: "홍길동",
  children: [
    { name: "경영지원본부", title: "본부장", person: "김민준", children: [
      { name: "경영기획팀", title: "팀장", person: "이서연", members: 4 },
      { name: "인사총무팀", title: "팀장", person: "박지호", members: 5 },
      { name: "재무회계팀", title: "팀장", person: "최유진", members: 3 },
    ]},
    { name: "영업본부", title: "본부장", person: "정현우", children: [
      { name: "국내영업팀", title: "팀장", person: "강민서", members: 6 },
      { name: "해외영업팀", title: "팀장", person: "윤지훈", members: 4 },
      { name: "마케팅팀",   title: "팀장", person: "이미래", members: 3 },
    ]},
    { name: "기술본부", title: "본부장", person: "박준서", children: [
      { name: "개발팀",     title: "팀장", person: "김팽팽", members: 7 },
      { name: "기술지원팀", title: "팀장", person: "최소연", members: 5 },
      { name: "품질관리팀", title: "팀장", person: "조태양", members: 3 },
    ]},
  ],
};

const MEMBERS = [
  { name: "김팽팽", dept: "개발팀", title: "대리", phone: "010-1234-5678", email: "kpp@kinoton.co.kr", status: "online" },
  { name: "이서연", dept: "경영기획팀", title: "과장", phone: "010-2345-6789", email: "lsy@kinoton.co.kr", status: "online" },
  { name: "박지호", dept: "인사총무팀", title: "팀장", phone: "010-3456-7890", email: "pjh@kinoton.co.kr", status: "away" },
  { name: "최유진", dept: "재무회계팀", title: "대리", phone: "010-4567-8901", email: "cyj@kinoton.co.kr", status: "offline" },
  { name: "강민서", dept: "국내영업팀", title: "팀장", phone: "010-5678-9012", email: "kms@kinoton.co.kr", status: "online" },
  { name: "윤지훈", dept: "해외영업팀", title: "과장", phone: "010-6789-0123", email: "yjh@kinoton.co.kr", status: "online" },
  { name: "이미래", dept: "마케팅팀",   title: "과장", phone: "010-7890-1234", email: "lmr@kinoton.co.kr", status: "away" },
  { name: "박준서", dept: "기술본부",   title: "본부장", phone: "010-8901-2345", email: "pjs@kinoton.co.kr", status: "online" },
];

function OrgNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className={depth > 0 ? "ml-6 border-l" : ""} style={{ borderColor: "var(--kino-pale)" }}>
      <div className="flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-gray-50 group" onClick={() => hasChildren && setOpen(!open)}>
        {hasChildren ? (
          <span style={{ color: "var(--kino-muted)" }}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        ) : <span className="w-3.5" />}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: depth === 0 ? "var(--kino-black)" : depth === 1 ? "var(--kino-charcoal)" : "var(--kino-mid)" }}>
          {node.person?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{node.name}</span>
            {node.members && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--kino-pale)", color: "var(--kino-muted)" }}>{node.members}명</span>}
          </div>
          <div className="text-xs" style={{ color: "var(--kino-muted)" }}>{node.title} · {node.person}</div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity" style={{ color: "var(--kino-muted)" }}
          onClick={(e) => { e.stopPropagation(); toast(`${node.person} 정보 준비 중`); }}>
          <User size={13} />
        </button>
      </div>
      {open && hasChildren && node.children.map((child: any) => <OrgNode key={child.name} node={child} depth={depth + 1} />)}
    </div>
  );
}

export default function OrgChartPage() {
  const [view, setView] = useState<"tree"|"list">("tree");
  const [search, setSearch] = useState("");
  const filtered = MEMBERS.filter(m => !search || m.name.includes(search) || m.dept.includes(search) || m.title.includes(search));
  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>조직도</h1>
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
            {(["tree","list"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{ background: view === v ? "var(--kino-charcoal)" : "transparent", color: view === v ? "white" : "var(--kino-mid)" }}>
                {v === "tree" ? "트리" : "목록"}
              </button>
            ))}
          </div>
        </div>
        {view === "tree" ? (
          <div className="portal-card p-4"><OrgNode node={ORG_DATA} /></div>
        ) : (
          <div className="portal-card">
            <div className="section-header">
              <span className="section-title">직원 목록 <span className="ml-1 text-xs font-normal" style={{ color: "var(--kino-muted)" }}>{filtered.length}명</span></span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs" style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}>
                <Search size={12} style={{ color: "var(--kino-muted)" }} />
                <input type="text" placeholder="이름, 부서, 직위 검색" className="bg-transparent outline-none w-36 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="grid text-xs font-semibold px-4 py-2" style={{ gridTemplateColumns: "1fr 100px 80px 140px 1fr", background: "var(--kino-bg)", color: "var(--kino-muted)", borderBottom: "1px solid var(--kino-pale)" }}>
              <span>이름</span><span>부서</span><span>직위</span><span>연락처</span><span>이메일</span>
            </div>
            {filtered.map(m => (
              <div key={m.name} className="grid items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: "1fr 100px 80px 140px 1fr", borderBottom: "1px solid var(--kino-pale)" }}
                onClick={() => toast(`${m.name} 프로필 준비 중`)}>
                <span className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--kino-charcoal)" }}>{m.name.charAt(0)}</div>
                  <span className="font-medium" style={{ color: "var(--kino-charcoal)" }}>{m.name}</span>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.status === "online" ? "var(--kino-green)" : m.status === "away" ? "var(--kino-amber)" : "var(--kino-light)" }} />
                </span>
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>{m.dept}</span>
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>{m.title}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}><Phone size={11} />{m.phone}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}><Mail size={11} />{m.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Plus, FileCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

const DOCS = [
  { id: 1, title: "2026년 6월 영업비 지출 품의서", type: "지출품의", writer: "김팽팽", date: "2026.06.04", status: "대기", step: "팀장 결재" },
  { id: 2, title: "Q2 납품 완료 보고서",           type: "업무보고", writer: "이서연", date: "2026.06.03", status: "승인", step: "완료" },
  { id: 3, title: "신규 장비 구매 요청서",           type: "구매요청", writer: "박지호", date: "2026.06.02", status: "반려", step: "반려됨" },
  { id: 4, title: "하반기 마케팅 예산 계획서",       type: "기획서",  writer: "이미래", date: "2026.06.01", status: "진행중", step: "본부장 결재" },
  { id: 5, title: "2026년 6월 출장 신청서",         type: "출장신청", writer: "강민서", date: "2026.05.31", status: "승인", step: "완료" },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  "대기":   { icon: <Clock size={13} />,         bg: "#FEF9C3", color: "#92400E" },
  "진행중": { icon: <Clock size={13} />,         bg: "#EFF6FF", color: "#1D4ED8" },
  "승인":   { icon: <CheckCircle2 size={13} />,  bg: "#F0FDF4", color: "#16A34A" },
  "반려":   { icon: <XCircle size={13} />,       bg: "#FEF2F2", color: "#DC2626" },
};

export default function ApprovePage() {
  const [filter, setFilter] = useState("전체");
  const filters = ["전체", "대기", "진행중", "승인", "반려"];
  const filtered = filter === "전체" ? DOCS : DOCS.filter(d => d.status === filter);
  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>전자결재</h1>
          <button onClick={() => toast("결재 기안 기능 준비 중")} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold text-white" style={{ background: "var(--kino-charcoal)" }}>
            <Plus size={14} /> 기안 작성
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "결재 대기", value: DOCS.filter(d => d.status === "대기").length, color: "#92400E" },
            { label: "진행 중",   value: DOCS.filter(d => d.status === "진행중").length, color: "#1D4ED8" },
            { label: "승인 완료", value: DOCS.filter(d => d.status === "승인").length, color: "#16A34A" },
            { label: "반려",      value: DOCS.filter(d => d.status === "반려").length, color: "#DC2626" },
          ].map(s => (
            <div key={s.label} className="portal-card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="portal-card">
          <div className="section-header">
            <span className="section-title flex items-center gap-1.5"><FileCheck size={14} style={{ color: "var(--kino-mid)" }} />결재 문서</span>
            <div className="flex gap-1">{filters.map(f => (<button key={f} onClick={() => setFilter(f)} className="px-2.5 py-1 rounded text-xs font-medium transition-colors" style={{ background: filter === f ? "var(--kino-charcoal)" : "transparent", color: filter === f ? "white" : "var(--kino-muted)" }}>{f}</button>))}</div>
          </div>
          <div className="grid text-xs font-semibold px-4 py-2" style={{ gridTemplateColumns: "80px 1fr 80px 80px 100px 80px", background: "var(--kino-bg)", color: "var(--kino-muted)", borderBottom: "1px solid var(--kino-pale)" }}>
            <span>문서유형</span><span>제목</span><span className="text-center">기안자</span><span className="text-center">기안일</span><span className="text-center">현재단계</span><span className="text-center">상태</span>
          </div>
          {filtered.map(d => { const sc = STATUS_CONFIG[d.status]; return (
            <div key={d.id} className="grid items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" style={{ gridTemplateColumns: "80px 1fr 80px 80px 100px 80px", borderBottom: "1px solid var(--kino-pale)" }} onClick={() => toast(`"${d.title}" 상세 보기 준비 중`)}>
              <span className="badge-tag" style={{ width: "fit-content" }}>{d.type}</span>
              <span className="text-sm font-medium truncate" style={{ color: "var(--kino-charcoal)" }}>{d.title}</span>
              <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>{d.writer}</span>
              <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>{d.date}</span>
              <span className="text-center text-xs" style={{ color: "var(--kino-mid)" }}>{d.step}</span>
              <span className="flex items-center justify-center gap-1 text-xs font-medium px-2 py-0.5 rounded mx-auto" style={{ background: sc.bg, color: sc.color }}>{sc.icon}{d.status}</span>
            </div>
          );})}
          {filtered.length === 0 && <div className="py-12 text-center text-sm" style={{ color: "var(--kino-light)" }}>해당하는 문서가 없습니다.</div>}
        </div>
      </div>
    </PortalLayout>
  );
}

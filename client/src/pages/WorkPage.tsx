import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

const TASKS = [
  { id: 1, title: "Q3 사업계획서 초안 작성", assignee: "김팽팽", due: "2026.06.10", priority: "high", status: "진행중", progress: 60 },
  { id: 2, title: "신규 장비 도입 검토 보고서", assignee: "박지호", due: "2026.06.08", priority: "medium", status: "대기", progress: 0 },
  { id: 3, title: "고객사 A 납품 완료 확인", assignee: "강민서", due: "2026.06.05", priority: "high", status: "완료", progress: 100 },
  { id: 4, title: "6월 급여 명세서 배포", assignee: "최유진", due: "2026.06.25", priority: "low", status: "대기", progress: 0 },
  { id: 5, title: "하반기 마케팅 전략 수립", assignee: "이미래", due: "2026.06.20", priority: "medium", status: "진행중", progress: 35 },
];

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  high:   { bg: "#FEF2F2", color: "#DC2626", label: "긴급" },
  medium: { bg: "#FEF9C3", color: "#92400E", label: "보통" },
  low:    { bg: "#F0FDF4", color: "#16A34A", label: "낮음" },
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  "완료":  <CheckCircle2 size={14} style={{ color: "#16A34A" }} />,
  "진행중": <Clock size={14} style={{ color: "#D97706" }} />,
  "대기":  <Circle size={14} style={{ color: "#9CA3AF" }} />,
};

export default function WorkPage() {
  const [filter, setFilter] = useState("전체");
  const statuses = ["전체", "대기", "진행중", "완료"];
  const filtered = filter === "전체" ? TASKS : TASKS.filter(t => t.status === filter);

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>업무</h1>
          <button onClick={() => toast("업무 등록 기능 준비 중")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold text-white"
            style={{ background: "var(--kino-charcoal)" }}>
            <Plus size={14} /> 업무 등록
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "전체", value: TASKS.length, color: "var(--kino-charcoal)" },
            { label: "진행중", value: TASKS.filter(t => t.status === "진행중").length, color: "#D97706" },
            { label: "대기", value: TASKS.filter(t => t.status === "대기").length, color: "#9CA3AF" },
            { label: "완료", value: TASKS.filter(t => t.status === "완료").length, color: "#16A34A" },
          ].map(s => (
            <div key={s.label} className="portal-card p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Task list */}
        <div className="portal-card">
          <div className="section-header">
            <span className="section-title">업무 목록</span>
            <div className="flex gap-1">
              {statuses.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: filter === s ? "var(--kino-charcoal)" : "transparent", color: filter === s ? "white" : "var(--kino-muted)" }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--kino-pale)" }}>
            {filtered.map(t => {
              const pri = PRIORITY_STYLE[t.priority];
              return (
                <div key={t.id} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toast(`"${t.title}" 상세 보기 준비 중`)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{STATUS_ICON[t.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--kino-charcoal)" }}>{t.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--kino-muted)" }}>
                        <span>담당: {t.assignee}</span>
                        <span>마감: {t.due}</span>
                      </div>
                      {t.progress > 0 && t.progress < 100 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 rounded-full overflow-hidden" style={{ height: "4px", background: "var(--kino-pale)" }}>
                            <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: "var(--kino-charcoal)" }} />
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "var(--kino-muted)" }}>{t.progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

/**
 * CondolencesPage.tsx — 경조사 전체 목록 페이지
 */
import { useState } from "react";
import { Heart, ChevronRight, X } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

type CondolenceItem = {
  id: number;
  type: "결혼" | "출산" | "부고" | "기타";
  name: string;
  content: string | null;
  eventDate: string | null;
  authorName: string | null;
  createdAt: Date;
};

const TYPE_EMOJI: Record<string, string> = {
  결혼: "💍",
  출산: "👶",
  부고: "🕯️",
  기타: "📋",
};

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  결혼: { bg: "#FFF7ED", color: "#C2410C" },
  출산: { bg: "#F0FDF4", color: "#16A34A" },
  부고: { bg: "#F9FAFB", color: "var(--kino-mid)" },
  기타: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
};

function CondolenceDetailModal({ item, onClose }: { item: CondolenceItem; onClose: () => void }) {
  const dateStr = item.eventDate ?? new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  const style = TYPE_STYLE[item.type] ?? TYPE_STYLE["기타"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-lg shadow-xl mx-4" style={{ background: "var(--kino-white)", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--kino-pale)" }}>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{TYPE_EMOJI[item.type] ?? "📋"}</span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: style.bg, color: style.color }}>
                {item.type}
              </span>
            </div>
            <h2 className="text-sm font-bold leading-snug" style={{ color: "var(--kino-charcoal)" }}>{item.name}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>일자: {dateStr}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors shrink-0" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {item.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kino-charcoal)" }}>{item.content}</p>
          ) : (
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>상세 내용이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CondolencesPage() {
  const [tab, setTab] = useState<"all" | "결혼" | "출산" | "부고" | "기타">("all");
  const [selected, setSelected] = useState<CondolenceItem | null>(null);

  const { data: condolences, isLoading } = trpc.condolences.list.useQuery({ limit: 100 });

  const filtered = (condolences ?? []).filter(n =>
    tab === "all" ? true : n.type === tab
  );

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-5">
          <Heart size={18} style={{ color: "var(--kino-mid)" }} />
          <h1 className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>경조사</h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {(["all", "결혼", "출산", "부고", "기타"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-colors"
              style={{
                background: tab === t ? "var(--kino-charcoal)" : "transparent",
                color: tab === t ? "white" : "var(--kino-muted)",
                border: tab === t ? "none" : "1px solid var(--kino-pale)",
              }}
            >
              {t === "all" ? "전체" : t}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="portal-card">
          {isLoading ? (
            <div className="py-10 text-center text-xs" style={{ color: "var(--kino-muted)" }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Heart size={32} className="mx-auto mb-2" style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 경조사가 없습니다</p>
            </div>
          ) : (
            filtered.map((n) => {
              const dateStr = n.eventDate ?? new Date(n.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
              const style = TYPE_STYLE[n.type] ?? TYPE_STYLE["기타"];
              return (
                <div
                  key={n.id}
                  className="board-item cursor-pointer"
                  onClick={() => setSelected(n)}
                >
                  <span className="text-base shrink-0">{TYPE_EMOJI[n.type] ?? "📋"}</span>
                  <span
                    className="badge-tag shrink-0"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {n.type}
                  </span>
                  <span className="board-item-title">{n.name}</span>
                  <span className="board-item-date shrink-0">{dateStr}</span>
                  <ChevronRight size={12} style={{ color: "var(--kino-muted)" }} className="shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && <CondolenceDetailModal item={selected} onClose={() => setSelected(null)} />}
    </PortalLayout>
  );
}

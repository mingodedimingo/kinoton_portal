/**
 * HrPage.tsx — 인사발령 전체 목록 페이지
 */
import { useState } from "react";
import { UserCheck, ChevronRight, X, Image as ImageIcon } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

type HrItem = {
  id: number;
  type: "입사" | "퇴직" | "발령" | "승진";
  title: string;
  content: string | null;
  images?: unknown;
  effectiveDate: string | null;
  authorName: string | null;
  createdAt: Date;
};

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  입사: { bg: "#F0FDF4", color: "#16A34A" },
  퇴직: { bg: "#FEF2F2", color: "#DC2626" },
  발령: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
  승진: { bg: "#FFF7ED", color: "#C2410C" },
};

function HrDetailModal({ item, onClose }: { item: HrItem; onClose: () => void }) {
  const dateStr = item.effectiveDate ?? new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  const style = TYPE_STYLE[item.type] ?? TYPE_STYLE["발령"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-lg shadow-xl mx-4" style={{ background: "var(--kino-white)", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--kino-pale)" }}>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: style.bg, color: style.color }}>
                {item.type}
              </span>
            </div>
            <h2 className="text-sm font-bold leading-snug" style={{ color: "var(--kino-charcoal)" }}>{item.title}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>발령일: {dateStr}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors shrink-0" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {item.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: "var(--kino-charcoal)" }}>{item.content}</p>
          ) : (
            <p className="text-sm mb-4" style={{ color: "var(--kino-muted)" }}>상세 내용이 없습니다.</p>
          )}
          {parseImages(item.images).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parseImages(item.images).map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`이미지 ${idx + 1}`} className="rounded-lg object-cover hover:opacity-90 transition-opacity" style={{ width: 160, height: 120 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HrPage() {
  const [tab, setTab] = useState<"all" | "입사" | "퇴직" | "발령" | "승진">("all");
  const [selected, setSelected] = useState<HrItem | null>(null);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { data: hrData, isLoading } = trpc.hrNotices.list.useQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const hrNotices = hrData?.items ?? [];
  const total = hrData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = hrNotices.filter(n =>
    tab === "all" ? true : n.type === tab
  );

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-5">
          <UserCheck size={18} style={{ color: "var(--kino-mid)" }} />
          <h1 className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>인사발령</h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {(["all", "입사", "퇴직", "발령", "승진"] as const).map((t) => (
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
              <UserCheck size={32} className="mx-auto mb-2" style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 인사발령이 없습니다</p>
            </div>
          ) : (
            filtered.map((n) => {
              const dateStr = n.effectiveDate ?? new Date(n.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
              const style = TYPE_STYLE[n.type] ?? TYPE_STYLE["발령"];
              return (
                <div
                  key={n.id}
                  className="board-item cursor-pointer"
                  onClick={() => setSelected(n)}
                >
                  <span
                    className="badge-tag shrink-0"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {n.type}
                  </span>
                  <span className="board-item-title flex items-center gap-1">
                    {n.title}
                    {parseImages(n.images).length > 0 && <ImageIcon size={11} style={{ color: "var(--kino-muted)" }} className="shrink-0" />}
                  </span>
                  <span className="board-item-date shrink-0">{dateStr}</span>
                  <ChevronRight size={12} style={{ color: "var(--kino-muted)" }} className="shrink-0" />
                </div>
              );
            })
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ background: page === 0 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page === 0 ? 'var(--kino-muted)' : 'white' }}>
              이전
            </button>
            <span className="text-xs" style={{ color: 'var(--kino-mid)' }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded text-xs font-medium"
              style={{ background: page >= totalPages - 1 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page >= totalPages - 1 ? 'var(--kino-muted)' : 'white' }}>
              다음
            </button>
          </div>
        )}
      </div>

      {selected && <HrDetailModal item={selected} onClose={() => setSelected(null)} />}
    </PortalLayout>
  );
}

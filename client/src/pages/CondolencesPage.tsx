/**
 * CondolencesPage.tsx — 경조사 전체 목록 페이지
 */
import { useState } from "react";
import { Link } from "wouter";
import { Heart, ChevronRight, Image as ImageIcon } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

type CondolenceItem = {
  id: number;
  type: "결혼" | "출산" | "부고" | "기타";
  name: string;
  content: string | null;
  images?: unknown;
  eventDate: string | null;
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




export default function CondolencesPage() {
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { data: condData, isLoading } = trpc.condolences.list.useQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const condolences = condData?.items ?? [];
  const total = condData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-5">
          <Heart size={18} style={{ color: "var(--kino-mid)" }} />
          <h1 className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>경조사</h1>
        </div>

        {/* 목록 */}
        <div className="portal-card">
          {isLoading ? (
            <div className="py-10 text-center text-xs" style={{ color: "var(--kino-muted)" }}>불러오는 중...</div>
          ) : condolences.length === 0 ? (
            <div className="py-10 text-center">
              <Heart size={32} className="mx-auto mb-2" style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 경조사가 없습니다</p>
            </div>
          ) : (
            condolences.map((n) => {
              const dateStr = n.eventDate ?? new Date(n.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
              const style = TYPE_STYLE[n.type] ?? TYPE_STYLE["기타"];
              return (
                <Link
                  key={n.id}
                  href={`/condolences/${n.id}`}
                  className="board-item cursor-pointer"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <span className="text-base shrink-0">{TYPE_EMOJI[n.type] ?? "📋"}</span>
                  <span
                    className="badge-tag shrink-0"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {n.type}
                  </span>
                  <span className="board-item-title flex items-center gap-1">
                    {n.name}
                    {parseImages(n.images).length > 0 && <ImageIcon size={11} style={{ color: "var(--kino-muted)" }} className="shrink-0" />}
                  </span>
                  <span className="board-item-date shrink-0">{dateStr}</span>
                  <ChevronRight size={12} style={{ color: "var(--kino-muted)" }} className="shrink-0" />
                </Link>
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

    </PortalLayout>
  );
}

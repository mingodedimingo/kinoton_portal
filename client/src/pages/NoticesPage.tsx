/**
 * NoticesPage.tsx — 공지사항 전체 목록 페이지
 */
import { useState } from "react";
import { Link } from "wouter";
import { Megaphone, ChevronRight, Image as ImageIcon } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

type NoticeItem = {
  id: number;
  tag: string;
  title: string;
  content: string | null;
  images?: unknown;
  createdAt: Date;
  isNew: boolean;
  isPinned: boolean;
  category: "all" | "company" | "dept";
  authorName: string | null;
};

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}




export default function NoticesPage() {
  const [tab, setTab] = useState<"all" | "company" | "dept">("all");

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { data: noticesData, isLoading } = trpc.notices.list.useQuery({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
  const notices = noticesData?.items ?? [];
  const total = noticesData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = notices.filter(n =>
    tab === "all" ? true : n.category === tab
  );

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-5">
          <Megaphone size={18} style={{ color: "var(--kino-mid)" }} />
          <h1 className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>공지사항</h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-4">
          {(["all", "company", "dept"] as const).map((t) => (
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
              {t === "all" ? "전체" : t === "company" ? "회사" : "대표이사"}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="portal-card">
          {isLoading ? (
            <div className="py-10 text-center text-xs" style={{ color: "var(--kino-muted)" }}>불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Megaphone size={32} className="mx-auto mb-2" style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 공지사항이 없습니다</p>
            </div>
          ) : (
            filtered.map((n) => {
              const dateStr = new Date(n.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
              return (
                <Link
                  key={n.id}
                  href={`/notices/${n.id}`}
                  className="board-item cursor-pointer"
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <span className="badge-tag company shrink-0">{n.tag}</span>
                  <span className="board-item-title flex items-center gap-1">
                    {n.title}
                    {parseImages(n.images).length > 0 && <ImageIcon size={11} style={{ color: "var(--kino-muted)" }} className="shrink-0" />}
                  </span>
                  {n.isNew && <span className="badge-new shrink-0">N</span>}
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
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{ background: page === 0 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page === 0 ? 'var(--kino-muted)' : 'white' }}
            >
              이전
            </button>
            <span className="text-xs" style={{ color: 'var(--kino-mid)' }}>{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded text-xs font-medium transition-colors"
              style={{ background: page >= totalPages - 1 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page >= totalPages - 1 ? 'var(--kino-muted)' : 'white' }}
            >
              다음
            </button>
          </div>
        )}
      </div>

    </PortalLayout>
  );
}

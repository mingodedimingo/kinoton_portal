/**
 * NoticesPage.tsx — 공지사항 전체 목록 페이지
 */
import { useState } from "react";
import { Megaphone, ChevronRight, X, Image as ImageIcon } from "lucide-react";
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

function NoticeDetailModal({ notice, onClose }: { notice: NoticeItem; onClose: () => void }) {
  const dateStr = new Date(notice.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-lg shadow-xl mx-4" style={{ background: "var(--kino-white)", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "var(--kino-pale)" }}>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>
                {notice.tag}
              </span>
              {notice.isNew && (
                <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--kino-red)", color: "white" }}>N</span>
              )}
            </div>
            <h2 className="text-sm font-bold leading-snug" style={{ color: "var(--kino-charcoal)" }}>{notice.title}</h2>
            <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>{dateStr}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors shrink-0" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          {notice.content ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: "var(--kino-charcoal)" }}>{notice.content}</p>
          ) : (
            <p className="text-sm mb-4" style={{ color: "var(--kino-muted)" }}>내용이 없습니다.</p>
          )}
          {parseImages(notice.images).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {parseImages(notice.images).map((url, idx) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`체청 이미지 ${idx + 1}`} className="rounded-lg object-cover hover:opacity-90 transition-opacity" style={{ width: 160, height: 120 }} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const [tab, setTab] = useState<"all" | "company" | "dept">("all");
  const [selected, setSelected] = useState<NoticeItem | null>(null);

  const { data: notices, isLoading } = trpc.notices.list.useQuery({ limit: 100 });

  const filtered = (notices ?? []).filter(n =>
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
              {t === "all" ? "전체" : t === "company" ? "회사" : "부서"}
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
                <div
                  key={n.id}
                  className="board-item cursor-pointer"
                  onClick={() => setSelected(n)}
                >
                  <span className="badge-tag company shrink-0">{n.tag}</span>
                  <span className="board-item-title flex items-center gap-1">
                    {n.title}
                    {parseImages(n.images).length > 0 && <ImageIcon size={11} style={{ color: "var(--kino-muted)" }} className="shrink-0" />}
                  </span>
                  {n.isNew && <span className="badge-new shrink-0">N</span>}
                  <span className="board-item-date shrink-0">{dateStr}</span>
                  <ChevronRight size={12} style={{ color: "var(--kino-muted)" }} className="shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </div>

      {selected && <NoticeDetailModal notice={selected} onClose={() => setSelected(null)} />}
    </PortalLayout>
  );
}

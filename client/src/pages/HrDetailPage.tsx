/**
 * HrDetailPage.tsx — 인사발령 상세 페이지
 * - portal-card 제거, 전체 폭 사용
 * - 하단 인사발령 리스트 (디씨 스타일)
 */
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Trash2, X, Save, List } from "lucide-react";
import FileUploader, { AttachmentItem } from "@/components/FileUploader";
import DOMPurify from "dompurify";

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  입사: { bg: "#F0FDF4", color: "#16A34A" },
  퇴직: { bg: "#FEF2F2", color: "#DC2626" },
  발령: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
  승진: { bg: "#EFF6FF", color: "#2563EB" },
};

type EditForm = {
  type: "입사" | "퇴직" | "발령" | "승진";
  title: string;
  content: string;
  effectiveDate: string;
  attachments: AttachmentItem[];
};

export default function HrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const itemId = Number(id);
  const { data: item, isLoading, error } = trpc.hrNotices.get.useQuery(
    { id: itemId },
    { enabled: !isNaN(itemId) }
  );
  const { data: listData } = trpc.hrNotices.list.useQuery({ limit: 10 });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const updateMutation = trpc.hrNotices.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.hrNotices.get.invalidate({ id: itemId });
      utils.hrNotices.list.invalidate();
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.hrNotices.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.hrNotices.list.invalidate();
      navigate("/hr");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEditStart = () => {
    if (!item) return;
    let existingAttachments: AttachmentItem[] = [];
    if ((item as any).attachments) {
      try {
        const parsed = typeof (item as any).attachments === 'string'
          ? JSON.parse((item as any).attachments)
          : (item as any).attachments;
        if (Array.isArray(parsed)) existingAttachments = parsed;
      } catch { /* ignore */ }
    }
    if (existingAttachments.length === 0) {
      existingAttachments = parseImages(item.images).map(url => ({
        name: url.split('/').pop() || 'image',
        url,
        mimeType: 'image/jpeg',
        size: 0,
      }));
    }
    setEditForm({
      type: item.type as "입사" | "퇴직" | "발령" | "승진",
      title: item.title,
      content: item.content ?? "",
      effectiveDate: item.effectiveDate ?? "",
      attachments: existingAttachments,
    });
    setIsEditing(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    const imageAttachments = editForm.attachments.filter(a => a.mimeType.startsWith('image/'));
    updateMutation.mutate({
      id: itemId,
      ...editForm,
      images: imageAttachments.map(a => a.url),
      attachments: editForm.attachments,
    });
  };

  const handleDelete = () => {
    if (!confirm("이 인사발령을 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id: itemId });
  };

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="container py-10 flex justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
        </div>
      </PortalLayout>
    );
  }

  if (error || !item) {
    return (
      <PortalLayout>
        <div className="container py-10 text-center">
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>인사발령 정보를 찾을 수 없습니다.</p>
          <button onClick={() => navigate("/hr")} className="mt-4 text-sm underline" style={{ color: "var(--kino-mid)" }}>
            인사발령 목록으로 돌아가기
          </button>
        </div>
      </PortalLayout>
    );
  }

  const imgs = parseImages(item.images);
  const dateStr = item.effectiveDate
    ? item.effectiveDate
    : new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE["발령"];

  const hrList = (listData as any)?.items ?? (Array.isArray(listData) ? listData : []);

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate("/hr")}
          className="flex items-center gap-1 text-sm mb-5 transition-colors"
          style={{ color: "var(--kino-mid)" }}
        >
          <ChevronLeft size={16} />
          인사발령 목록
        </button>

        {/* 수정 폼 */}
        {isEditing && editForm ? (
          <div className="portal-card p-5">
            <form onSubmit={handleEditSubmit}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>인사발령 수정</h2>
                <button type="button" onClick={() => setIsEditing(false)} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>구분</label>
                    <select
                      className="w-full px-3 py-1.5 rounded text-sm outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      value={editForm.type}
                      onChange={e => setEditForm({ ...editForm, type: e.target.value as EditForm["type"] })}
                    >
                      <option value="입사">입사</option>
                      <option value="퇴직">퇴직</option>
                      <option value="발령">발령</option>
                      <option value="승진">승진</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>발령일</label>
                    <input
                      type="date"
                      className="w-full px-3 py-1.5 rounded text-sm outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      value={editForm.effectiveDate}
                      onChange={e => setEditForm({ ...editForm, effectiveDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>제목 *</label>
                  <input
                    className="w-full px-3 py-1.5 rounded text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>내용</label>
                  <textarea
                    className="w-full px-3 py-1.5 rounded text-sm outline-none resize-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                    rows={6}
                    value={editForm.content}
                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>파일 첨부 (최대 10개)</label>
                  <FileUploader
                    attachments={editForm.attachments}
                    onChange={(files) => setEditForm({ ...editForm, attachments: files })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-1.5 rounded text-sm" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>
                  취소
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                  style={{ background: "var(--kino-charcoal)", color: "white" }}
                >
                  {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  저장
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* ── 본문 영역 (테두리 없음, 전체 폭) ── */}
            <div className="pb-6" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
              {/* 이미지 상단 배치 */}
              {imgs.length > 0 && (
                <div className="mb-6">
                  {imgs.map((url, idx) => (
                    <div key={idx} className="mb-3">
                      <img
                        src={url}
                        alt={`첨부 이미지 ${idx + 1}`}
                        className="w-full object-contain"
                        style={{ maxHeight: 500, background: "var(--kino-bg)" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 메타 정보 행 */}
              <div className="flex items-center justify-between mb-3" style={{ borderBottom: "1px solid var(--kino-pale)", paddingBottom: "0.75rem" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: badge.bg, color: badge.color }}>
                    {item.type}
                  </span>
                  <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{dateStr}</span>
                  {item.authorName && (
                    <span className="text-xs" style={{ color: "var(--kino-muted)" }}>· {item.authorName}</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleEditStart}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95"
                      style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}
                    >
                      <Pencil size={11} /> 수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95"
                      style={{ background: "#FEF2F2", color: "#DC2626" }}
                    >
                      <Trash2 size={11} /> 삭제
                    </button>
                  </div>
                )}
              </div>

              {/* 제목 */}
              <h1 className="text-xl font-bold mb-5 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {item.title}
              </h1>

              {/* 본문 */}
              {item.content ? (
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  style={{ color: "var(--kino-charcoal)" }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }}
                />
              ) : (
                <p className="text-sm" style={{ color: "var(--kino-muted)" }}>내용이 없습니다.</p>
              )}
            </div>

            {/* ── 하단 인사발령 리스트 (디씨 스타일) ── */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <List size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>인사발령 목록</span>
              </div>
              <div style={{ border: "1px solid var(--kino-pale)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                <div
                  className="grid text-xs font-semibold px-4 py-2"
                  style={{
                    gridTemplateColumns: "1fr auto",
                    background: "var(--kino-bg)",
                    borderBottom: "1px solid var(--kino-pale)",
                    color: "var(--kino-muted)",
                  }}
                >
                  <span>제목</span>
                  <span>날짜</span>
                </div>
                {hrList.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: "var(--kino-muted)" }}>인사발령이 없습니다.</div>
                ) : (
                  hrList.map((h: any) => {
                    const hDate = h.effectiveDate || new Date(h.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
                    const isCurrent = h.id === itemId;
                    return (
                      <Link
                        key={h.id}
                        href={`/hr/${h.id}`}
                        className="grid px-4 py-2.5 text-sm transition-colors"
                        style={{
                          gridTemplateColumns: "1fr auto",
                          borderBottom: "1px solid var(--kino-pale)",
                          background: isCurrent ? "var(--kino-pale)" : "transparent",
                          color: isCurrent ? "var(--kino-charcoal)" : "var(--kino-mid)",
                          fontWeight: isCurrent ? 600 : 400,
                          textDecoration: "none",
                        }}
                      >
                        <span className="truncate pr-4">
                          {isCurrent && <span className="mr-1.5" style={{ color: "var(--kino-red)" }}>▶</span>}
                          {h.title}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--kino-muted)" }}>{hDate}</span>
                      </Link>
                    );
                  })
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate("/hr")}
                  className="flex items-center gap-1.5 px-5 py-2 rounded text-sm font-medium transition-all active:scale-95"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                >
                  <List size={13} /> 전체 목록
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  );
}

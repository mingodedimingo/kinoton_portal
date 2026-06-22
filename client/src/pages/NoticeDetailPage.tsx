/**
 * NoticeDetailPage.tsx — 공지사항 상세 페이지
 * 이미지 상단 배치, 본문 하단, 어드민 수정/삭제 기능
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Trash2, X, Save } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

type EditForm = {
  tag: string;
  title: string;
  content: string;
  category: "company" | "dept" | "all";
  isNew: boolean;
  isPinned: boolean;
  images: string[];
};

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const noticeId = Number(id);
  const { data: notice, isLoading, error } = trpc.notices.get.useQuery(
    { id: noticeId },
    { enabled: !isNaN(noticeId) }
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const updateMutation = trpc.notices.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.notices.get.invalidate({ id: noticeId });
      utils.notices.list.invalidate();
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.notices.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.notices.list.invalidate();
      navigate("/notices");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEditStart = () => {
    if (!notice) return;
    setEditForm({
      tag: notice.tag ?? "공지",
      title: notice.title,
      content: notice.content ?? "",
      category: (notice.category as "company" | "dept" | "all") ?? "all",
      isNew: notice.isNew ?? false,
      isPinned: notice.isPinned ?? false,
      images: parseImages(notice.images),
    });
    setIsEditing(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    updateMutation.mutate({ id: noticeId, ...editForm });
  };

  const handleDelete = () => {
    if (!confirm("이 공지사항을 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id: noticeId });
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

  if (error || !notice) {
    return (
      <PortalLayout>
        <div className="container py-10 text-center">
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>공지사항을 찾을 수 없습니다.</p>
          <button onClick={() => navigate("/notices")} className="mt-4 text-sm underline" style={{ color: "var(--kino-mid)" }}>
            공지사항 목록으로 돌아가기
          </button>
        </div>
      </PortalLayout>
    );
  }

  const imgs = parseImages(notice.images);
  const dateStr = new Date(notice.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="max-w-3xl mx-auto">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate("/notices")}
            className="flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: "var(--kino-mid)" }}
          >
            <ChevronLeft size={16} />
            공지사항 목록
          </button>

          {/* 수정 폼 */}
          {isEditing && editForm ? (
            <div className="portal-card">
              <form onSubmit={handleEditSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>공지사항 수정</h2>
                  <button type="button" onClick={() => setIsEditing(false)} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>태그</label>
                      <input
                        className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                        value={editForm.tag}
                        onChange={e => setEditForm({ ...editForm, tag: e.target.value })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>카테고리</label>
                      <select
                        className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                        value={editForm.category}
                        onChange={e => setEditForm({ ...editForm, category: e.target.value as "company" | "dept" | "all" })}
                      >
                        <option value="all">전체</option>
                        <option value="company">회사</option>
                        <option value="dept">부서</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>제목 *</label>
                    <input
                      className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      value={editForm.title}
                      onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>내용</label>
                    <textarea
                      className="w-full px-3 py-1.5 rounded text-sm border outline-none resize-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      rows={6}
                      value={editForm.content}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--kino-mid)" }}>
                      <input type="checkbox" checked={editForm.isNew} onChange={e => setEditForm({ ...editForm, isNew: e.target.checked })} />
                      NEW 표시
                    </label>
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--kino-mid)" }}>
                      <input type="checkbox" checked={editForm.isPinned} onChange={e => setEditForm({ ...editForm, isPinned: e.target.checked })} />
                      상단 고정
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>이미지</label>
                    <ImageUploader
                      images={editForm.images}
                      onChange={(imgs) => setEditForm({ ...editForm, images: imgs })}
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
            <div className="portal-card">
              {/* 이미지 상단 배치 */}
              {imgs.length > 0 && (
                <div className="mb-5">
                  {imgs.map((url, idx) => (
                    <div key={idx} className="mb-3">
                      <img
                        src={url}
                        alt={`첨부 이미지 ${idx + 1}`}
                        className="w-full rounded-lg object-contain"
                        style={{ maxHeight: 400, background: "var(--kino-bg)" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 헤더 + 어드민 버튼 */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>
                    {notice.tag}
                  </span>
                  {notice.isNew && (
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: "var(--kino-red)", color: "white" }}>N</span>
                  )}
                  <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{dateStr}</span>
                  {notice.authorName && (
                    <span className="text-xs" style={{ color: "var(--kino-muted)" }}>· {notice.authorName}</span>
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
              <h1 className="text-lg font-bold mb-5 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {notice.title}
              </h1>

              {/* 본문 */}
              {notice.content ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kino-charcoal)" }}>
                  {notice.content}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--kino-muted)" }}>내용이 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

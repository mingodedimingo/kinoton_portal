/**
 * BoardDetailPage.tsx — 게시글 상세 페이지
 * 이미지 상단 배치, 본문 하단, 수정/삭제 버튼 (작성자 본인 또는 어드민)
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ChevronLeft, Loader2, ExternalLink, Trash2, Pencil, X, Save,
} from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

type Category = "언론보도" | "매뉴얼" | "기타";

export default function BoardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const postId = Number(id);
  const { data: post, isLoading, error } = trpc.board.get.useQuery({ id: postId }, { enabled: !isNaN(postId) });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    category: Category;
    title: string;
    content: string;
    link: string;
    images: string[];
  } | null>(null);

  const updateMutation = trpc.board.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.board.get.invalidate({ id: postId });
      utils.board.list.invalidate();
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.board.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.board.list.invalidate();
      navigate("/board");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEditStart = () => {
    if (!post) return;
    setEditForm({
      category: post.category as Category,
      title: post.title,
      content: post.content ?? "",
      link: post.link ?? "",
      images: parseImages(post.images),
    });
    setIsEditing(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    updateMutation.mutate({ id: postId, ...editForm });
  };

  const handleDelete = () => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id: postId });
  };

  const isOwner = user && post && (user.role === "admin" || (post as any).authorOpenId === user.openId);

  if (isLoading) {
    return (
      <PortalLayout>
        <div className="container py-10 flex justify-center">
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
        </div>
      </PortalLayout>
    );
  }

  if (error || !post) {
    return (
      <PortalLayout>
        <div className="container py-10 text-center">
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>게시글을 찾을 수 없습니다.</p>
          <button onClick={() => navigate("/board")} className="mt-4 text-sm underline" style={{ color: "var(--kino-mid)" }}>
            게시판으로 돌아가기
          </button>
        </div>
      </PortalLayout>
    );
  }

  const imgs = parseImages(post.images);
  const dateStr = new Date(post.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, ".").replace(/\.$/, "");

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="max-w-3xl mx-auto">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate("/board")}
            className="flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: "var(--kino-mid)" }}
          >
            <ChevronLeft size={16} />
            게시판 목록
          </button>

          {/* 수정 폼 */}
          {isEditing && editForm ? (
            <div className="portal-card">
              <div className="section-header mb-4">
                <span className="section-title">게시글 수정</span>
                <button onClick={() => setIsEditing(false)} style={{ color: "var(--kino-muted)" }}>
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>분류</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(f => f ? { ...f, category: e.target.value as Category } : f)}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  >
                    <option value="언론보도">언론보도</option>
                    <option value="매뉴얼">매뉴얼</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>제목</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(f => f ? { ...f, title: e.target.value } : f)}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>내용</label>
                  <textarea
                    value={editForm.content}
                    onChange={e => setEditForm(f => f ? { ...f, content: e.target.value } : f)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>외부 링크 (선택)</label>
                  <input
                    type="text"
                    value={editForm.link}
                    onChange={e => setEditForm(f => f ? { ...f, link: e.target.value } : f)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-md text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>이미지 첨부 (최대 5장)</label>
                  <ImageUploader
                    images={editForm.images}
                    onChange={(imgs) => setEditForm(f => f ? { ...f, images: imgs } : f)}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-md text-sm font-medium"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
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
              {/* 이미지 상단 배치 (언론보도 스타일 — 최대 400px 높이) */}
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

              {/* 헤더 (카테고리 + 날짜 + 버튼) */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="badge-tag">{post.category}</span>
                  {post.isNew && <span className="badge-new">N</span>}
                  <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{dateStr}</span>
                  <span className="text-xs" style={{ color: "var(--kino-muted)" }}>· {post.authorName}</span>
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={handleEditStart}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                    >
                      <Pencil size={11} /> 수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all active:scale-95"
                      style={{ border: "1px solid #FEE2E2", color: "#DC2626" }}
                    >
                      <Trash2 size={11} /> 삭제
                    </button>
                  </div>
                )}
              </div>

              {/* 제목 */}
              <h1 className="text-lg font-bold mb-4 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {post.title}
              </h1>

              {/* 외부 링크 */}
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs mb-4 underline"
                  style={{ color: "var(--kino-mid)" }}
                >
                  <ExternalLink size={12} /> 원문 보기
                </a>
              )}

              {/* 본문 */}
              {post.content ? (
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--kino-charcoal)" }}
                >
                  {post.content}
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

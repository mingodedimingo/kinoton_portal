/**
 * BoardDetailPage.tsx — 게시글 상세 페이지
 * - portal-card 제거, 전체 폭 사용
 * - 하단 게시글 리스트 (디씨 스타일)
 */
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ChevronLeft, Loader2, ExternalLink, Trash2, Pencil, X, Save, List,
  Paperclip, Download, FileText, Film, FileSpreadsheet, Presentation, Archive, File,
} from "lucide-react";
import FileUploader, { AttachmentItem } from "@/components/FileUploader";
import DOMPurify from "dompurify";
import RichEditor from "@/components/RichEditor";

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
  const { data: listData } = trpc.board.list.useQuery({ limit: 10 });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    category: Category;
    title: string;
    content: string;
    link: string;
    attachments: AttachmentItem[];
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
    let existingAttachments: AttachmentItem[] = [];
    if ((post as any).attachments) {
      try {
        const parsed = typeof (post as any).attachments === 'string'
          ? JSON.parse((post as any).attachments)
          : (post as any).attachments;
        if (Array.isArray(parsed)) existingAttachments = parsed;
      } catch { /* ignore */ }
    }
    if (existingAttachments.length === 0) {
      existingAttachments = parseImages(post.images).map(url => ({
        name: url.split('/').pop() || 'image',
        url,
        mimeType: 'image/jpeg',
        size: 0,
      }));
    }
    setEditForm({
      category: post.category as Category,
      title: post.title,
      content: post.content ?? "",
      link: post.link ?? "",
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
      id: postId,
      ...editForm,
      images: imageAttachments.map(a => a.url),
      attachments: editForm.attachments,
    });
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

  const posts = (listData as any)?.items ?? (listData as any)?.posts ?? [];

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate("/board")}
          className="flex items-center gap-1 text-sm mb-5 transition-colors"
          style={{ color: "var(--kino-mid)" }}
        >
          <ChevronLeft size={16} />
          게시판 목록
        </button>

        {/* 수정 폼 */}
        {isEditing && editForm ? (
          <div className="portal-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>게시글 수정</span>
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
                <RichEditor
                  value={editForm.content}
                  onChange={(html) => setEditForm(f => f ? { ...f, content: html } : f)}
                  placeholder="내용을 입력하세요"
                  minHeight={200}
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
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>파일 첨부 (최대 10개)</label>
                <FileUploader
                  attachments={editForm.attachments}
                  onChange={(files) => setEditForm(f => f ? { ...f, attachments: files } : f)}
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
              <h1 className="text-xl font-bold mb-5 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {post.title}
              </h1>

              {/* 외부 링크 */}
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs mb-5 underline"
                  style={{ color: "var(--kino-mid)" }}
                >
                  <ExternalLink size={12} /> 원문 보기
                </a>
              )}

              {/* 본문 */}
              {post.content ? (
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  style={{ color: "var(--kino-charcoal)" }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content, {
                    ALLOWED_TAGS: ['p','br','strong','em','u','s','h1','h2','h3','ul','ol','li','blockquote','pre','code','table','thead','tbody','tr','th','td','a','img','span','div'],
                    ALLOWED_ATTR: ['href','src','alt','style','class','target','rel','width','height'],
                    ALLOW_DATA_ATTR: false,
                  }) }}
                />
              ) : (
                <p className="text-sm" style={{ color: "var(--kino-muted)" }}>내용이 없습니다.</p>
              )}

              {/* 첨부파일 다운로드 */}
              {(() => {
                let attachments: AttachmentItem[] = [];
                try {
                  const raw = (post as any).attachments;
                  if (raw) {
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (Array.isArray(parsed)) attachments = parsed;
                  }
                } catch { /* ignore */ }
                if (attachments.length === 0) return null;
                return (
                  <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--kino-pale)" }}>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Paperclip size={13} style={{ color: "var(--kino-mid)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>첨부파일 ({attachments.length})</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {attachments.map((att, idx) => {
                        const isImage = att.mimeType.startsWith('image/');
                        const isVideo = att.mimeType.startsWith('video/');
                        const isPdf = att.mimeType === 'application/pdf';
                        const isWord = att.mimeType.includes('word');
                        const isExcel = att.mimeType.includes('excel') || att.mimeType.includes('spreadsheet');
                        const isPpt = att.mimeType.includes('powerpoint') || att.mimeType.includes('presentation');
                        const isZip = att.mimeType.includes('zip');
                        const Icon = isVideo ? Film : isPdf || isWord ? FileText : isExcel ? FileSpreadsheet : isPpt ? Presentation : isZip ? Archive : File;
                        const sizeStr = att.size > 1024 * 1024
                          ? `${(att.size / 1024 / 1024).toFixed(1)}MB`
                          : att.size > 1024 ? `${(att.size / 1024).toFixed(0)}KB` : `${att.size}B`;
                        return (
                          <a
                            key={idx}
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors"
                            style={{ background: "var(--kino-pale)", color: "var(--kino-charcoal)", textDecoration: "none" }}
                          >
                            {isImage ? (
                              <img src={att.url} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
                            ) : (
                              <Icon size={18} className="shrink-0" style={{ color: "var(--kino-mid)" }} />
                            )}
                            <span className="text-xs flex-1 truncate">{att.name}</span>
                            <span className="text-xs shrink-0" style={{ color: "var(--kino-muted)" }}>{sizeStr}</span>
                            <Download size={13} className="shrink-0" style={{ color: "var(--kino-mid)" }} />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ── 하단 게시글 리스트 (디씨 스타일) ── */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <List size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>게시판 목록</span>
              </div>
              <div style={{ border: "1px solid var(--kino-pale)", borderRadius: "var(--radius)", overflow: "hidden" }}>
                {/* 헤더 행 */}
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
                {posts.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: "var(--kino-muted)" }}>게시글이 없습니다.</div>
                ) : (
                  posts.map((p: any) => {
                    const pDate = new Date(p.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
                    const isCurrent = p.id === postId;
                    return (
                      <Link
                        key={p.id}
                        href={`/board/${p.id}`}
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
                          {p.title}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--kino-muted)" }}>{pDate}</span>
                      </Link>
                    );
                  })
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate("/board")}
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

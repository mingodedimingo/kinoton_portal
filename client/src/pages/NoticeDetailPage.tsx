/**
 * NoticeDetailPage.tsx — 공지사항 상세 페이지
 * - portal-card 제거, 전체 폭 사용
 * - 하단 공지 리스트 (디씨 스타일)
 */
import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Trash2, X, Save, List, Paperclip, Download, FileText, Film, FileSpreadsheet, Presentation, Archive, File } from "lucide-react";
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

type EditForm = {
  tag: string;
  title: string;
  content: string;
  category: "company" | "dept" | "all";
  isNew: boolean;
  isPinned: boolean;
  attachments: AttachmentItem[];
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
  const { data: listData } = trpc.notices.list.useQuery({ limit: 10 });

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
    let existingAttachments: AttachmentItem[] = [];
    if ((notice as any).attachments) {
      try {
        const parsed = typeof (notice as any).attachments === 'string'
          ? JSON.parse((notice as any).attachments)
          : (notice as any).attachments;
        if (Array.isArray(parsed)) existingAttachments = parsed;
      } catch { /* ignore */ }
    }
    if (existingAttachments.length === 0) {
      existingAttachments = parseImages(notice.images).map(url => ({
        name: url.split('/').pop() || 'image',
        url,
        mimeType: 'image/jpeg',
        size: 0,
      }));
    }
    setEditForm({
      tag: notice.tag ?? "공지",
      title: notice.title,
      content: notice.content ?? "",
      category: (notice.category as "company" | "dept" | "all") ?? "all",
      isNew: notice.isNew ?? false,
      isPinned: notice.isPinned ?? false,
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
      id: noticeId,
      ...editForm,
      images: imageAttachments.map(a => a.url),
      attachments: editForm.attachments,
    });
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

  const notices = (listData as any)?.items ?? (Array.isArray(listData) ? listData : []);

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate("/notices")}
          className="flex items-center gap-1 text-sm mb-5 transition-colors"
          style={{ color: "var(--kino-mid)" }}
        >
          <ChevronLeft size={16} />
          공지사항 목록
        </button>

        {/* 수정 폼 */}
        {isEditing && editForm ? (
          <div className="portal-card p-5">
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
                      className="w-full px-3 py-1.5 rounded text-sm outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      value={editForm.tag}
                      onChange={e => setEditForm({ ...editForm, tag: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>카테고리</label>
                    <select
                      className="w-full px-3 py-1.5 rounded text-sm outline-none"
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
              <h1 className="text-xl font-bold mb-5 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {notice.title}
              </h1>

              {/* 본문 */}
              {notice.content ? (
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none"
                  style={{ color: "var(--kino-charcoal)" }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notice.content, {
                    ALLOWED_TAGS: ['p','br','strong','em','u','s','h1','h2','h3','ul','ol','li','blockquote','pre','code','table','thead','tbody','tr','th','td','a','img','span','div'],
                    ALLOWED_ATTR: ['href','src','alt','style','class','target','rel','width','height','colspan','rowspan'],
                  }) }}
                />
              ) : (
                <p className="text-sm" style={{ color: "var(--kino-muted)" }}>내용이 없습니다.</p>
              )}

              {/* 첨부파일 다운로드 */}
              {(() => {
                let attachments: AttachmentItem[] = [];
                try {
                  const raw = (notice as any).attachments;
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

            {/* ── 하단 공지 리스트 (디씨 스타일) ── */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <List size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>공지사항 목록</span>
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
                {notices.length === 0 ? (
                  <div className="py-6 text-center text-xs" style={{ color: "var(--kino-muted)" }}>공지사항이 없습니다.</div>
                ) : (
                  notices.map((n: any) => {
                    const nDate = new Date(n.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
                    const isCurrent = n.id === noticeId;
                    return (
                      <Link
                        key={n.id}
                        href={`/notices/${n.id}`}
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
                          {n.title}
                        </span>
                        <span className="text-xs shrink-0" style={{ color: "var(--kino-muted)" }}>{nDate}</span>
                      </Link>
                    );
                  })
                )}
              </div>
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate("/notices")}
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

/**
 * CondolenceDetailPage.tsx — 경조사 상세 페이지
 * 이미지 상단 배치, 본문 하단, 어드민 수정/삭제 기능
 */
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Pencil, Trash2, X, Save } from "lucide-react";
import FileUploader, { AttachmentItem } from "@/components/FileUploader";

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

const EMOJI: Record<string, string> = { 결혼: "💍", 출산: "👶", 부고: "🕯️", 기타: "📋" };
const TYPE_BADGE: Record<string, { bg: string; color: string }> = {
  결혼: { bg: "#FFF7ED", color: "#C2410C" },
  출산: { bg: "#F0FDF4", color: "#16A34A" },
  부고: { bg: "#F9FAFB", color: "var(--kino-mid)" },
  기타: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
};

type EditForm = {
  type: "결혼" | "출산" | "부고" | "기타";
  name: string;
  content: string;
  eventDate: string;
  attachments: AttachmentItem[];
};

export default function CondolenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const itemId = Number(id);
  const { data: item, isLoading, error } = trpc.condolences.get.useQuery(
    { id: itemId },
    { enabled: !isNaN(itemId) }
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);

  const updateMutation = trpc.condolences.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.condolences.get.invalidate({ id: itemId });
      utils.condolences.list.invalidate();
      setIsEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.condolences.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.condolences.list.invalidate();
      navigate("/condolences");
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
      type: item.type as "결혼" | "출산" | "부고" | "기타",
      name: item.name,
      content: item.content ?? "",
      eventDate: item.eventDate ?? "",
      attachments: existingAttachments,
    });
    setIsEditing(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;
    if (!editForm.name.trim()) { toast.error("내용을 입력해주세요."); return; }
    const imageAttachments = editForm.attachments.filter(a => a.mimeType.startsWith('image/'));
    updateMutation.mutate({
      id: itemId,
      ...editForm,
      images: imageAttachments.map(a => a.url),
      attachments: editForm.attachments,
    });
  };

  const handleDelete = () => {
    if (!confirm("이 경조사를 삭제하시겠습니까?")) return;
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
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>경조사 정보를 찾을 수 없습니다.</p>
          <button onClick={() => navigate("/condolences")} className="mt-4 text-sm underline" style={{ color: "var(--kino-mid)" }}>
            경조사 목록으로 돌아가기
          </button>
        </div>
      </PortalLayout>
    );
  }

  const imgs = parseImages(item.images);
  const dateStr = item.eventDate
    ? item.eventDate
    : new Date(item.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(/\.$/, "");
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE["기타"];
  const emoji = EMOJI[item.type] ?? "📋";

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="max-w-3xl mx-auto">
          {/* 뒤로가기 */}
          <button
            onClick={() => navigate("/condolences")}
            className="flex items-center gap-1 text-sm mb-4 transition-colors"
            style={{ color: "var(--kino-mid)" }}
          >
            <ChevronLeft size={16} />
            경조사 목록
          </button>

          {/* 수정 폼 */}
          {isEditing && editForm ? (
            <div className="portal-card">
              <form onSubmit={handleEditSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>경조사 수정</h2>
                  <button type="button" onClick={() => setIsEditing(false)} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>구분</label>
                      <select
                        className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                        value={editForm.type}
                        onChange={e => setEditForm({ ...editForm, type: e.target.value as "결혼" | "출산" | "부고" | "기타" })}
                      >
                        <option value="결혼">결혼</option>
                        <option value="출산">출산</option>
                        <option value="부고">부고</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>날짜</label>
                      <input
                        type="date"
                        className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                        value={editForm.eventDate}
                        onChange={e => setEditForm({ ...editForm, eventDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>내용 *</label>
                    <input
                      className="w-full px-3 py-1.5 rounded text-sm border outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>상세 내용</label>
                    <textarea
                      className="w-full px-3 py-1.5 rounded text-sm border outline-none resize-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                      rows={4}
                      value={editForm.content}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>파일 첨부 (이미지·동영상·문서 등 · 최대 10개)</label>
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
                  <span className="text-xl">{emoji}</span>
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

              {/* 제목 (name 필드) */}
              <h1 className="text-lg font-bold mb-5 leading-snug" style={{ color: "var(--kino-charcoal)" }}>
                {item.name}
              </h1>

              {/* 본문 */}
              {item.content ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kino-charcoal)" }}>
                  {item.content}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--kino-muted)" }}>상세 내용이 없습니다.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}

/**
 * AdminNoticesPage — 공지사항 관리 (이미지 첨부 지원)
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Pin, Image as ImageIcon } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

type FormData = {
  tag: string;
  title: string;
  content: string;
  category: "company" | "dept" | "all";
  isNew: boolean;
  isPinned: boolean;
  images: string[];
};

const DEFAULT_FORM: FormData = {
  tag: "공지",
  title: "",
  content: "",
  category: "all",
  isNew: true,
  isPinned: false,
  images: [],
};

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

export default function AdminNoticesPage() {
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: noticesData, isLoading } = trpc.notices.list.useQuery({ limit: 50 });
  const notices = noticesData?.items;

  const createMutation = trpc.notices.create.useMutation({
    onSuccess: () => {
      toast.success("공지사항이 등록되었습니다.");
      utils.notices.list.invalidate();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.notices.update.useMutation({
    onSuccess: () => {
      toast.success("공지사항이 수정되었습니다.");
      utils.notices.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.notices.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.notices.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate({ ...form });
    }
  };

  const handleEdit = (n: NonNullable<typeof notices>[0]) => {
    setEditId(n.id);
    setForm({
      tag: n.tag,
      title: n.title,
      content: n.content ?? "",
      category: n.category,
      isNew: n.isNew,
      isPinned: n.isPinned,
      images: parseImages(n.images),
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id });
  };

  const categoryLabel = { all: "전체", company: "회사", dept: "부서" };

  return (
    <AdminLayout title="공지사항 관리">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--kino-muted)" }}>총 {notices?.length ?? 0}건</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(DEFAULT_FORM); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--kino-charcoal)", color: "white" }}
        >
          <Plus size={14} /> 공지 등록
        </button>
      </div>

      {/* 작성/수정 폼 */}
      {showForm && (
        <div className="rounded-lg p-5 mb-5" style={{ background: "var(--kino-white)", border: "1.5px solid var(--kino-charcoal)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
              {editId !== null ? "공지 수정" : "새 공지 등록"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(DEFAULT_FORM); }}>
              <X size={16} style={{ color: "var(--kino-muted)" }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>태그</label>
                <input
                  type="text"
                  value={form.tag}
                  onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>카테고리</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as "company" | "dept" | "all" }))}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                >
                  <option value="all">전체</option>
                  <option value="company">회사</option>
                  <option value="dept">부서</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="공지 제목을 입력하세요"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>내용</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="공지 내용을 입력하세요 (선택)"
                rows={4}
                className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>이미지 첨부 (선택 · 최대 5장)</label>
              <ImageUploader images={form.images} onChange={(imgs) => setForm(f => ({ ...f, images: imgs }))} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isNew} onChange={e => setForm(f => ({ ...f, isNew: e.target.checked }))} />
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>NEW 표시</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPinned} onChange={e => setForm(f => ({ ...f, isPinned: e.target.checked }))} />
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>상단 고정</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(DEFAULT_FORM); }}
                className="px-4 py-2 rounded-md text-sm font-medium" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>
                취소
              </button>
              <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
                style={{ background: "var(--kino-charcoal)", color: "white" }}>
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={12} className="animate-spin" />}
                {editId !== null ? "수정 완료" : "등록"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !notices || (notices as any[]).length === 0 ? (
          <div className="text-center py-10"><p className="text-sm" style={{ color: "var(--kino-light)" }}>등록된 공지사항이 없습니다</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--kino-pale)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>태그</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>제목</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>카테고리</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>등록일</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n, i) => {
                const imgs = parseImages(n.images);
                return (
                  <>
                    <tr key={n.id} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: imgs.length > 0 && expandedId === n.id ? "none" : "1px solid var(--kino-pale)" }}>
                      <td className="px-4 py-2.5">
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>{n.tag}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {n.isPinned && <Pin size={11} style={{ color: "var(--kino-red)" }} />}
                          <span style={{ color: "var(--kino-charcoal)" }}>{n.title}</span>
                          {n.isNew && <span className="text-xs px-1 py-0.5 rounded font-bold" style={{ background: "var(--kino-red)", color: "white" }}>N</span>}
                          {imgs.length > 0 && (
                            <button onClick={() => setExpandedId(expandedId === n.id ? null : n.id)} className="flex items-center gap-0.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                              <ImageIcon size={11} /> {imgs.length}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{categoryLabel[n.category]}</td>
                      <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{new Date(n.createdAt).toLocaleDateString("ko-KR")}</td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(n)} className="p-1.5 rounded transition-all" style={{ color: "var(--kino-mid)" }}><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(n.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded transition-all" style={{ color: "var(--kino-red)" }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    {imgs.length > 0 && expandedId === n.id && (
                      <tr key={`${n.id}-imgs`} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                        <td colSpan={5} className="px-4 pb-3">
                          <div className="flex flex-wrap gap-2">
                            {imgs.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`이미지 ${idx + 1}`} className="rounded-lg object-cover hover:opacity-90 transition-opacity" style={{ width: 120, height: 90 }} />
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

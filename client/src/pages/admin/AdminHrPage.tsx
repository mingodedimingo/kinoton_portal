/**
 * AdminHrPage — 인사발령 관리
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Image as ImageIcon } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

type HrType = "입사" | "퇴직" | "발령" | "승진";

type FormData = {
  type: HrType;
  title: string;
  content: string;
  effectiveDate: string;
  authorName: string;
  images: string[];
};

function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

const DEFAULT_FORM: FormData = {
  type: "입사",
  title: "",
  content: "",
  effectiveDate: "",
  authorName: "",
  images: [],
};

const TYPE_COLORS: Record<HrType, { bg: string; color: string }> = {
  입사: { bg: "#F0FDF4", color: "#16A34A" },
  퇴직: { bg: "#FEF2F2", color: "#DC2626" },
  발령: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
  승진: { bg: "#EFF6FF", color: "#2563EB" },
};

export default function AdminHrPage() {
  const { token } = useAdminAuth();
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: hrList, isLoading } = trpc.hrNotices.list.useQuery({ limit: 50 });

  const createMutation = trpc.hrNotices.create.useMutation({
    onSuccess: () => {
      toast.success("인사발령이 등록되었습니다.");
      utils.hrNotices.list.invalidate();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.hrNotices.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.hrNotices.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.hrNotices.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.hrNotices.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (editId !== null) {
      updateMutation.mutate({ adminToken: token, id: editId, ...form });
    } else {
      createMutation.mutate({ adminToken: token, ...form });
    }
  };

  const handleEdit = (h: NonNullable<typeof hrList>[0]) => {
    setEditId(h.id);
    setForm({
      type: h.type,
      title: h.title,
      content: h.content ?? "",
      effectiveDate: h.effectiveDate ?? "",
      authorName: h.authorName ?? "",
      images: parseImages(h.images),
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ adminToken: token, id });
  };

  return (
    <AdminLayout title="인사발령 관리">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--kino-muted)" }}>총 {hrList?.length ?? 0}건</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(DEFAULT_FORM); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--kino-charcoal)", color: "white" }}
        >
          <Plus size={14} /> 인사발령 등록
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg p-5 mb-5" style={{ background: "var(--kino-white)", border: "1.5px solid var(--kino-charcoal)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
              {editId !== null ? "인사발령 수정" : "새 인사발령 등록"}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(DEFAULT_FORM); }}>
              <X size={16} style={{ color: "var(--kino-muted)" }} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>유형 *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as HrType }))}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                >
                  <option value="입사">입사</option>
                  <option value="퇴직">퇴직</option>
                  <option value="발령">발령</option>
                  <option value="승진">승진</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>발령일 (YYYY.MM.DD)</label>
                <input
                  type="text"
                  value={form.effectiveDate}
                  onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  placeholder="2026.06.01"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>내용 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 홍길동 선임 → 책임 승진"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>상세 내용</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="추가 설명 (선택)"
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>작성자</label>
              <input
                type="text"
                value={form.authorName}
                onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                placeholder="인사팀"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>이미지 첨부 (선택 · 최대 5장)</label>
              <ImageUploader images={form.images} onChange={(imgs) => setForm(f => ({ ...f, images: imgs }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditId(null); setForm(DEFAULT_FORM); }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
                style={{ background: "var(--kino-charcoal)", color: "white" }}
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={12} className="animate-spin" />}
                {editId !== null ? "수정 완료" : "등록"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !hrList || hrList.length === 0 ? (
          <div className="text-center py-10"><p className="text-sm" style={{ color: "var(--kino-light)" }}>등록된 인사발령이 없습니다</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--kino-pale)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>유형</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>내용</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>발령일</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>등록일</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {hrList.map((h, i) => {
                const tc = TYPE_COLORS[h.type];
                return (
                  <tr key={h.id} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: tc.bg, color: tc.color }}>{h.type}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--kino-charcoal)" }}>{h.title}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{h.effectiveDate ?? "-"}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{new Date(h.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(h)} className="p-1.5 rounded" style={{ color: "var(--kino-mid)" }}><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(h.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded" style={{ color: "var(--kino-red)" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

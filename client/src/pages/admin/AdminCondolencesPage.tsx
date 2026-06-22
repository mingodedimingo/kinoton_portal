/**
 * AdminCondolencesPage — 경조사 관리
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

type CondolenceType = "결혼" | "출산" | "부고" | "기타";

type FormData = {
  type: CondolenceType;
  name: string;
  content: string;
  eventDate: string;
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
  type: "결혼",
  name: "",
  content: "",
  eventDate: "",
  authorName: "",
  images: [],
};

const TYPE_EMOJI: Record<CondolenceType, string> = {
  결혼: "💍",
  출산: "👶",
  부고: "🕯️",
  기타: "📋",
};

const TYPE_COLORS: Record<CondolenceType, { bg: string; color: string }> = {
  결혼: { bg: "#FFF7ED", color: "#C2410C" },
  출산: { bg: "#F0FDF4", color: "#16A34A" },
  부고: { bg: "#F9FAFB", color: "var(--kino-mid)" },
  기타: { bg: "var(--kino-pale)", color: "var(--kino-mid)" },
};

export default function AdminCondolencesPage() {
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);

  const { data: list, isLoading } = trpc.condolences.list.useQuery({ limit: 50 });

  const createMutation = trpc.condolences.create.useMutation({
    onSuccess: () => {
      toast.success("경조사가 등록되었습니다.");
      utils.condolences.list.invalidate();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.condolences.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.condolences.list.invalidate();
      setShowForm(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.condolences.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.condolences.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("내용을 입력해주세요."); return; }
    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate({ ...form });
    }
  };

  const handleEdit = (c: NonNullable<typeof list>[0]) => {
    setEditId(c.id);
    setForm({
      type: c.type,
      name: c.name,
      content: c.content ?? "",
      eventDate: c.eventDate ?? "",
      authorName: c.authorName ?? "",
      images: parseImages(c.images),
    });
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id });
  };

  return (
    <AdminLayout title="경조사 관리">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "var(--kino-muted)" }}>총 {list?.length ?? 0}건</p>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(DEFAULT_FORM); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          style={{ background: "var(--kino-charcoal)", color: "white" }}
        >
          <Plus size={14} /> 경조사 등록
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg p-5 mb-5" style={{ background: "var(--kino-white)", border: "1.5px solid var(--kino-charcoal)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
              {editId !== null ? "경조사 수정" : "새 경조사 등록"}
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
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as CondolenceType }))}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                >
                  <option value="결혼">💍 결혼</option>
                  <option value="출산">👶 출산</option>
                  <option value="부고">🕯️ 부고</option>
                  <option value="기타">📋 기타</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>날짜 (YYYY.MM.DD)</label>
                <input
                  type="text"
                  value={form.eventDate}
                  onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
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
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 경영기획팀 홍길동 선임님 결혼"
                className="w-full px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>상세 내용</label>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="장소, 시간 등 추가 정보 (선택)"
                rows={3}
                className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
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
        ) : !list || list.length === 0 ? (
          <div className="text-center py-10"><p className="text-sm" style={{ color: "var(--kino-light)" }}>등록된 경조사가 없습니다</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--kino-pale)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>유형</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>내용</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>날짜</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>등록일</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => {
                const tc = TYPE_COLORS[c.type];
                return (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1">
                        <span>{TYPE_EMOJI[c.type]}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: tc.bg, color: tc.color }}>{c.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "var(--kino-charcoal)" }}>{c.name}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{c.eventDate ?? "-"}</td>
                    <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{new Date(c.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded" style={{ color: "var(--kino-mid)" }}><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(c.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded" style={{ color: "var(--kino-red)" }}><Trash2 size={13} /></button>
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

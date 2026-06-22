/**
 * AdminBoardPage — 게시판 관리 (어드민)
 * 어드민은 모든 게시글 수정/삭제 가능
 */
import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2, X, Pin, ExternalLink } from "lucide-react";

type BoardCategory = "언론보도" | "매뉴얼" | "기타";

type EditFormData = {
  category: BoardCategory;
  title: string;
  content: string;
  link: string;
  isPinned: boolean;
  isNew: boolean;
};

export default function AdminBoardPage() {
  const utils = trpc.useUtils();

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormData | null>(null);

  const { data: boardData, isLoading } = trpc.board.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
    limit: 100,
  });
  const posts = boardData?.items;

  const updateMutation = trpc.board.update.useMutation({
    onSuccess: () => {
      toast.success("수정되었습니다.");
      utils.board.list.invalidate();
      setEditId(null);
      setEditForm(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.board.delete.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      utils.board.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = (p: NonNullable<typeof posts>[0]) => {
    setEditId(p.id);
    setEditForm({
      category: p.category,
      title: p.title,
      content: p.content ?? "",
      link: p.link ?? "",
      isPinned: p.isPinned,
      isNew: p.isNew,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm || editId === null) return;
    updateMutation.mutate({ id: editId, ...editForm });
  };

  const handleDelete = (id: number) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id });
  };

  const CATEGORIES = ["all", "언론보도", "매뉴얼", "기타"];

  return (
    <AdminLayout title="게시판 관리">
      {/* 필터 탭 */}
      <div className="flex items-center gap-2 mb-4">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: categoryFilter === cat ? "var(--kino-charcoal)" : "var(--kino-white)",
              color: categoryFilter === cat ? "white" : "var(--kino-mid)",
              border: "1px solid var(--kino-pale)",
            }}
          >
            {cat === "all" ? "전체" : cat}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: "var(--kino-muted)" }}>
          총 {posts?.length ?? 0}건
        </span>
      </div>

      {/* 수정 폼 */}
      {editId !== null && editForm && (
        <div className="rounded-lg p-5 mb-5" style={{ background: "var(--kino-white)", border: "1.5px solid var(--kino-charcoal)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>게시글 수정</h3>
            <button onClick={() => { setEditId(null); setEditForm(null); }}>
              <X size={16} style={{ color: "var(--kino-muted)" }} />
            </button>
          </div>
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>카테고리</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm(f => f ? { ...f, category: e.target.value as BoardCategory } : f)}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                >
                  <option value="언론보도">언론보도</option>
                  <option value="매뉴얼">매뉴얼</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>외부 링크</label>
                <input
                  type="text"
                  value={editForm.link}
                  onChange={e => setEditForm(f => f ? { ...f, link: e.target.value } : f)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
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
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isPinned} onChange={e => setEditForm(f => f ? { ...f, isPinned: e.target.checked } : f)} />
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>상단 고정</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.isNew} onChange={e => setEditForm(f => f ? { ...f, isNew: e.target.checked } : f)} />
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>NEW 표시</span>
              </label>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setEditId(null); setEditForm(null); }}
                className="px-4 py-2 rounded-md text-sm font-medium"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>
                취소
              </button>
              <button type="submit" disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 active:scale-95"
                style={{ background: "var(--kino-charcoal)", color: "white" }}>
                {updateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                수정 완료
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 목록 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !posts || posts.length === 0 ? (
          <div className="text-center py-10"><p className="text-sm" style={{ color: "var(--kino-light)" }}>게시글이 없습니다</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--kino-pale)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>카테고리</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>제목</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>작성자</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold hidden md:table-cell" style={{ color: "var(--kino-mid)" }}>등록일</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {p.isPinned && <Pin size={11} style={{ color: "var(--kino-red)" }} />}
                      <span style={{ color: "var(--kino-charcoal)" }}>{p.title}</span>
                      {p.isNew && <span className="text-xs px-1 py-0.5 rounded font-bold" style={{ background: "var(--kino-red)", color: "white" }}>N</span>}
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={11} style={{ color: "var(--kino-muted)" }} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{p.authorName}</td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-xs" style={{ color: "var(--kino-muted)" }}>{new Date(p.createdAt).toLocaleDateString("ko-KR")}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded" style={{ color: "var(--kino-mid)" }}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending} className="p-1.5 rounded" style={{ color: "var(--kino-red)" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}

/**
 * BoardPage.tsx — 게시판 (전체 직원 글쓰기 가능, DB 연동, 이미지 첨부 지원)
 */
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Search, Plus, BookOpen, Loader2, X, ExternalLink, Trash2, Image as ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import ImageUploader from "@/components/ImageUploader";

const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "언론보도", label: "언론보도" },
  { key: "매뉴얼", label: "매뉴얼" },
  { key: "기타", label: "기타" },
];

type Category = "언론보도" | "매뉴얼" | "기타";

type WriteForm = {
  category: Category;
  title: string;
  content: string;
  link: string;
  authorName: string;
  images: string[];
};

const DEFAULT_WRITE: WriteForm = {
  category: "기타",
  title: "",
  content: "",
  link: "",
  authorName: "",
  images: [],
};

// 이미지 URL 파싱 헬퍼
function parseImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images as string[];
  if (typeof images === "string") {
    try { return JSON.parse(images) as string[]; } catch { return []; }
  }
  return [];
}

export default function BoardPage() {
  const utils = trpc.useUtils();
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [showWrite, setShowWrite] = useState(false);
  const [writeForm, setWriteForm] = useState<WriteForm>(DEFAULT_WRITE);
  const [expandedPost, setExpandedPost] = useState<number | null>(null);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const { data: boardData, isLoading } = trpc.board.list.useQuery({
    category: activeCategory === "all" ? undefined : activeCategory,
    search: search || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const posts = boardData?.items;
  const total = boardData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const createMutation = trpc.board.create.useMutation({
    onSuccess: () => {
      toast.success("게시글이 등록되었습니다.");
      utils.board.list.invalidate();
      setShowWrite(false);
      setWriteForm(DEFAULT_WRITE);
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

  const handleWriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeForm.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!writeForm.authorName.trim()) { toast.error("이름을 입력해주세요."); return; }
    createMutation.mutate(writeForm);
  };

  const handleDelete = (id: number) => {
    if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id });
  };

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex gap-5">
          {/* 좌측 카테고리 */}
          <div className="shrink-0 w-44 hidden md:block">
            <div className="portal-card overflow-hidden">
              <div className="section-header">
                <span className="section-title flex items-center gap-1.5">
                  <BookOpen size={13} style={{ color: "var(--kino-mid)" }} />
                  게시판
                </span>
              </div>
              <nav className="py-1">
                {CATEGORIES.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setActiveCategory(b.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
                    style={{
                      background: activeCategory === b.key ? "var(--kino-charcoal)" : "transparent",
                      color: activeCategory === b.key ? "white" : "var(--kino-mid)",
                      fontWeight: activeCategory === b.key ? 600 : 400,
                    }}
                  >
                    {b.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 우측 본문 */}
          <div className="flex-1 min-w-0">
            {/* 모바일 카테고리 탭 */}
            <div className="flex gap-2 mb-3 md:hidden overflow-x-auto pb-1">
              {CATEGORIES.map(b => (
                <button
                  key={b.key}
                  onClick={() => setActiveCategory(b.key)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium shrink-0"
                  style={{
                    background: activeCategory === b.key ? "var(--kino-charcoal)" : "var(--kino-white)",
                    color: activeCategory === b.key ? "white" : "var(--kino-mid)",
                    border: "1px solid var(--kino-pale)",
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* 글쓰기 폼 */}
            {showWrite && (
              <div
                className="portal-card mb-4 p-5"
                style={{ border: "1.5px solid var(--kino-charcoal)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>새 글 작성</h3>
                  <button onClick={() => { setShowWrite(false); setWriteForm(DEFAULT_WRITE); }}>
                    <X size={16} style={{ color: "var(--kino-muted)" }} />
                  </button>
                </div>
                <form onSubmit={handleWriteSubmit} className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>카테고리</label>
                      <select
                        value={writeForm.category}
                        onChange={e => setWriteForm(f => ({ ...f, category: e.target.value as Category }))}
                        className="w-full px-3 py-2 rounded-md text-sm outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                      >
                        <option value="언론보도">언론보도</option>
                        <option value="매뉴얼">매뉴얼</option>
                        <option value="기타">기타</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>이름 *</label>
                      <input
                        type="text"
                        value={writeForm.authorName}
                        onChange={e => setWriteForm(f => ({ ...f, authorName: e.target.value }))}
                        placeholder="홍길동"
                        className="w-full px-3 py-2 rounded-md text-sm outline-none"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>제목 *</label>
                    <input
                      type="text"
                      value={writeForm.title}
                      onChange={e => setWriteForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="게시글 제목을 입력하세요"
                      className="w-full px-3 py-2 rounded-md text-sm outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>내용</label>
                    <textarea
                      value={writeForm.content}
                      onChange={e => setWriteForm(f => ({ ...f, content: e.target.value }))}
                      placeholder="내용을 입력하세요 (선택)"
                      rows={4}
                      className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>외부 링크 (선택)</label>
                    <input
                      type="text"
                      value={writeForm.link}
                      onChange={e => setWriteForm(f => ({ ...f, link: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-md text-sm outline-none"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                    />
                  </div>
                  {/* 이미지 첨부 */}
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>
                      이미지 첨부 (선택 · 최대 5장)
                    </label>
                    <ImageUploader
                      images={writeForm.images}
                      onChange={(imgs) => setWriteForm(f => ({ ...f, images: imgs }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowWrite(false); setWriteForm(DEFAULT_WRITE); }}
                      className="px-4 py-2 rounded-md text-sm font-medium"
                      style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
                      style={{ background: "var(--kino-charcoal)", color: "white" }}
                    >
                      {createMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                      등록
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 게시글 목록 */}
            <div className="portal-card">
              <div className="section-header">
                <span className="section-title">
                  {CATEGORIES.find(b => b.key === activeCategory)?.label || "전체"}
                  <span className="ml-2 text-xs font-normal" style={{ color: "var(--kino-muted)" }}>
                    총 {posts?.length ?? 0}건
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
                    style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}
                  >
                    <Search size={12} style={{ color: "var(--kino-muted)" }} />
                    <input
                      type="text"
                      placeholder="검색..."
                      className="bg-transparent outline-none w-28 text-xs"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ color: "var(--kino-charcoal)" }}
                    />
                  </div>
                  <button
                    onClick={() => setShowWrite(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white transition-all active:scale-95"
                    style={{ background: "var(--kino-charcoal)" }}
                  >
                    <Plus size={12} /> 글쓰기
                  </button>
                </div>
              </div>

              {/* 헤더 */}
              <div
                className="grid text-xs font-semibold px-3 py-2"
                style={{
                  gridTemplateColumns: "70px 1fr 80px 80px 40px",
                  background: "var(--kino-bg)",
                  color: "var(--kino-muted)",
                  borderBottom: "1px solid var(--kino-pale)",
                }}
              >
                <span>분류</span>
                <span>제목</span>
                <span className="text-center">작성자</span>
                <span className="text-center">날짜</span>
                <span className="text-center">삭제</span>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={18} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
                </div>
              ) : !posts || posts.length === 0 ? (
                <div className="py-12 text-center text-sm" style={{ color: "var(--kino-light)" }}>
                  게시글이 없습니다. 첫 번째 글을 작성해보세요!
                </div>
              ) : (
                posts.map((p) => {
                  const imgs = parseImages(p.images);
                  const isExpanded = expandedPost === p.id;
                  const hasDetail = (p.content && p.content.trim()) || imgs.length > 0;
                  return (
                    <div key={p.id} style={{ borderBottom: "1px solid var(--kino-pale)" }}>
                      {/* 목록 행 */}
                      <div
                        className="grid items-center px-3 py-2.5 text-sm"
                        style={{ gridTemplateColumns: "70px 1fr 80px 80px 40px" }}
                      >
                        <span className="badge-tag" style={{ width: "fit-content" }}>{p.category}</span>
                        <span className="flex items-center gap-1.5 min-w-0">
                          <button
                            className="truncate text-left"
                            style={{ color: "var(--kino-charcoal)" }}
                            onClick={() => {
                              if (hasDetail) setExpandedPost(isExpanded ? null : p.id);
                              else if (p.link) window.open(p.link, "_blank");
                            }}
                          >
                            {p.title}
                          </button>
                          {p.isNew && <span className="badge-new shrink-0">N</span>}
                          {imgs.length > 0 && (
                            <ImageIcon size={11} style={{ color: "var(--kino-muted)" }} className="shrink-0" />
                          )}
                          {p.link && (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <ExternalLink size={11} style={{ color: "var(--kino-muted)" }} />
                            </a>
                          )}
                          {hasDetail && (
                            <button onClick={() => setExpandedPost(isExpanded ? null : p.id)} className="shrink-0">
                              {isExpanded
                                ? <ChevronUp size={12} style={{ color: "var(--kino-muted)" }} />
                                : <ChevronDown size={12} style={{ color: "var(--kino-muted)" }} />}
                            </button>
                          )}
                        </span>
                        <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>{p.authorName}</span>
                        <span className="text-center text-xs" style={{ color: "var(--kino-muted)" }}>
                          {new Date(p.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                        </span>
                        <span className="text-center">
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1 rounded transition-all"
                            style={{ color: "var(--kino-light)" }}
                            title="본인 글 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </span>
                      </div>

                      {/* 펼쳐진 상세 (내용 + 이미지) */}
                      {isExpanded && hasDetail && (
                        <div
                          className="px-4 pb-4 pt-1"
                          style={{ background: "var(--kino-bg)", borderTop: "1px solid var(--kino-pale)" }}
                        >
                          {p.content && (
                            <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "var(--kino-mid)" }}>
                              {p.content}
                            </p>
                          )}
                          {imgs.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {imgs.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={url}
                                    alt={`첨부 이미지 ${idx + 1}`}
                                    className="rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    style={{ width: 160, height: 120 }}
                                  />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{ background: page === 0 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page === 0 ? 'var(--kino-muted)' : 'white' }}>
                    이전
                  </button>
                  <span className="text-xs" style={{ color: 'var(--kino-mid)' }}>{page + 1} / {totalPages} (열 {total}건)</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{ background: page >= totalPages - 1 ? 'var(--kino-pale)' : 'var(--kino-charcoal)', color: page >= totalPages - 1 ? 'var(--kino-muted)' : 'white' }}>
                    다음
                  </button>
                </div>
              )}
              {totalPages <= 1 && posts && posts.length > 0 && (
                <div className="flex items-center justify-center gap-1 py-3">
                  <span className="text-xs" style={{ color: "var(--kino-light)" }}>열 {total}건</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

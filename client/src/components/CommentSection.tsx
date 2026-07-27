/**
 * CommentSection.tsx — 공통 댓글 컴포넌트
 * - board / notice / hr_notice / condolence 4개 게시판에서 공용 사용
 */
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type PostType = "board" | "notice" | "hr_notice" | "condolence";

interface CommentSectionProps {
  postType: PostType;
  postId: number;
}

function formatDate(dateStr: string | Date) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }).replace(/\. /g, ".").replace(/\.$/, "");
}

export default function CommentSection({ postType, postId }: CommentSectionProps) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [content, setContent] = useState("");

  const { data: comments, isLoading } = trpc.comments.list.useQuery(
    { postType, postId },
    { enabled: !!postId }
  );

  const createMutation = trpc.comments.create.useMutation({
    onSuccess: () => {
      setContent("");
      utils.comments.list.invalidate({ postType, postId });
      toast.success("댓글이 등록되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ postType, postId });
      toast.success("댓글이 삭제되었습니다.");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ postType, postId, content: content.trim() });
  };

  const handleDelete = (id: number) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    deleteMutation.mutate({ id });
  };

  const myOpenId = user?.openId;
  const isAdmin = user?.role === "admin";

  return (
    <div className="mt-8">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={15} style={{ color: "var(--kino-mid)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>
          댓글 {comments ? `(${comments.length})` : ""}
        </span>
      </div>

      {/* 댓글 목록 */}
      <div
        className="rounded-lg overflow-hidden mb-4"
        style={{ border: "1px solid var(--kino-pale)" }}
      >
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : !comments || comments.length === 0 ? (
          <div className="py-6 text-center text-xs" style={{ color: "var(--kino-muted)" }}>
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
          </div>
        ) : (
          comments.map((c, idx) => {
            const canDelete = isAdmin || c.authorOpenId === myOpenId;
            return (
              <div
                key={c.id}
                className="px-4 py-3 flex items-start gap-3"
                style={{
                  borderBottom: idx < comments.length - 1 ? "1px solid var(--kino-pale)" : "none",
                  background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA",
                }}
              >
                {/* 아바타 */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}
                >
                  {c.authorName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                      {c.authorName}
                    </span>
                    <span className="text-xs" style={{ color: "var(--kino-muted)" }}>
                      {formatDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--kino-charcoal)" }}>
                    {c.content}
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1 rounded transition-colors shrink-0"
                    style={{ color: "var(--kino-muted)" }}
                    title="댓글 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 댓글 작성 폼 */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="댓글을 입력하세요 (최대 1000자)"
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded text-sm outline-none"
            style={{
              border: "1px solid var(--kino-pale)",
              color: "var(--kino-charcoal)",
              background: "var(--kino-white)",
            }}
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold transition-all active:scale-95"
            style={{
              background: "var(--kino-charcoal)",
              color: "white",
              opacity: (createMutation.isPending || !content.trim()) ? 0.6 : 1,
            }}
          >
            {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            등록
          </button>
        </form>
      ) : (
        <p className="text-xs text-center py-3" style={{ color: "var(--kino-muted)" }}>
          댓글을 작성하려면 로그인이 필요합니다.
        </p>
      )}
    </div>
  );
}

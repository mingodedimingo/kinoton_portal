/**
 * AdminBannerPage.tsx — 어드민 배너 관리 페이지
 * - 배너 목록 조회 (등록순)
 * - 배너 추가 / 수정 / 삭제 / 활성화 토글
 * - 이미지 업로드: multipart/form-data (/api/upload-image)
 */
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2,
  ToggleLeft, ToggleRight, Image, X, ExternalLink,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

interface BannerFormState {
  name: string;
  imageUrl: string;
  linkUrl: string;
  note: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_FORM: BannerFormState = {
  name: "",
  imageUrl: "",
  linkUrl: "",
  note: "",
  isActive: true,
  sortOrder: 0,
};

// 이미지 업로드 헬퍼 (multipart/form-data — Cloudflare WAF 우회)
async function uploadBannerImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드 가능합니다.");
  if (file.size > 10 * 1024 * 1024) throw new Error("파일 크기는 10MB 이하여야 합니다.");
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload-image", { method: "POST", body: formData, credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.startsWith("<") ? "로그인이 필요합니다." : `업로드 실패: ${text}`);
  }
  const data = await res.json() as { url: string };
  return data.url;
}

export default function AdminBannerPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BannerFormState>(DEFAULT_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners, isLoading } = trpc.banners.adminList.useQuery();

  const createMutation = trpc.banners.create.useMutation({
    onSuccess: () => {
      toast.success("배너가 등록되었습니다.");
      utils.banners.adminList.invalidate();
      utils.banners.list.invalidate();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.banners.update.useMutation({
    onSuccess: () => {
      toast.success("배너가 수정되었습니다.");
      utils.banners.adminList.invalidate();
      utils.banners.list.invalidate();
      setEditId(null);
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.banners.delete.useMutation({
    onSuccess: () => {
      toast.success("배너가 삭제되었습니다.");
      utils.banners.adminList.invalidate();
      utils.banners.list.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMutation = trpc.banners.update.useMutation({
    onSuccess: () => {
      utils.banners.adminList.invalidate();
      utils.banners.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // 이미지 파일 처리
  const handleImageFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadBannerImage(file);
      setForm(f => ({ ...f, imageUrl: url }));
      toast.success("이미지가 업로드되었습니다.");
    } catch (e: any) {
      toast.error(e.message ?? "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  };

  const openEdit = (banner: NonNullable<typeof banners>[0]) => {
    setEditId(banner.id);
    setForm({
      name: banner.name,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl ?? "",
      note: banner.note ?? "",
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error("구좌명을 입력해주세요."); return; }
    if (!form.imageUrl) { toast.error("이미지를 업로드해주세요."); return; }

    const payload = {
      name: form.name.trim(),
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl.trim() || undefined,
      note: form.note.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };

    if (editId !== null) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm(DEFAULT_FORM);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout title="배너 관리">
      <div className="max-w-4xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>배너 관리</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
              포탈 메인 화면에 노출되는 롤링 배너를 관리합니다. 최대 10개까지 등록 가능합니다.
            </p>
          </div>
          {!showForm && (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              <Plus size={14} />
              배너 추가
            </button>
          )}
        </div>

        {/* 등록/수정 폼 */}
        {showForm && (
          <div
            className="rounded-lg p-5 mb-6"
            style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}
          >
            <h3 className="text-sm font-bold mb-4" style={{ color: "var(--kino-charcoal)" }}>
              {editId !== null ? "배너 수정" : "새 배너 등록"}
            </h3>

            <div className="space-y-4">
              {/* 구좌명 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--kino-mid)" }}>
                  구좌명 <span style={{ color: "var(--kino-red)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예) 2026 하반기 채용 공고"
                  maxLength={200}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none transition-all"
                  style={{
                    border: "1px solid var(--kino-pale)",
                    background: "var(--kino-bg)",
                    color: "var(--kino-charcoal)",
                  }}
                />
              </div>

              {/* 이미지 업로드 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--kino-mid)" }}>
                  배너 이미지 <span style={{ color: "var(--kino-red)" }}>*</span>
                </label>

                {/* 현재 이미지 미리보기 */}
                {form.imageUrl && (
                  <div className="relative mb-2 rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
                    <img
                      src={form.imageUrl}
                      alt="배너 미리보기"
                      className="w-full object-cover"
                      style={{ maxHeight: "160px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                )}

                {/* 업로드 영역 */}
                {!form.imageUrl && (
                  <div
                    className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors"
                    style={{
                      borderColor: dragOver ? "var(--kino-charcoal)" : "var(--kino-pale)",
                      background: dragOver ? "var(--kino-bg)" : "transparent",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {uploading ? (
                      <div className="flex items-center justify-center gap-2" style={{ color: "var(--kino-muted)" }}>
                        <Loader2 size={18} className="animate-spin" />
                        <span className="text-sm">업로드 중...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5" style={{ color: "var(--kino-light)" }}>
                        <Image size={24} />
                        <span className="text-sm" style={{ color: "var(--kino-muted)" }}>클릭하거나 이미지를 드래그하세요</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 안내 문구 */}
                <div className="mt-2 space-y-0.5">
                  <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
                    📐 권장 이미지 사이즈: <strong>540 × 140 px</strong> (가로형 배너)
                  </p>
                  <p className="text-xs" style={{ color: "var(--kino-light)" }}>
                    등록 가능 확장자: jpg, jpeg, png, gif, webp · 최대 10MB
                  </p>
                </div>
              </div>

              {/* 연결 링크 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--kino-mid)" }}>
                  연결 링크 <span className="font-normal" style={{ color: "var(--kino-light)" }}>(선택 — 빈칸이면 클릭 이벤트 없음)</span>
                </label>
                <input
                  type="text"
                  value={form.linkUrl}
                  onChange={e => setForm(f => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="예) https://example.com 또는 /notices/123"
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none transition-all"
                  style={{
                    border: "1px solid var(--kino-pale)",
                    background: "var(--kino-bg)",
                    color: "var(--kino-charcoal)",
                  }}
                />
                <p className="text-xs mt-1" style={{ color: "var(--kino-light)" }}>
                  외부 URL(https://...)은 새 탭으로, 포탈 내부 경로(/notices/...)는 현재 탭으로 이동합니다.
                </p>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--kino-mid)" }}>
                  비고 <span className="font-normal" style={{ color: "var(--kino-light)" }}>(관리자 메모)</span>
                </label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="관리자용 메모를 입력하세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none transition-all resize-none"
                  style={{
                    border: "1px solid var(--kino-pale)",
                    background: "var(--kino-bg)",
                    color: "var(--kino-charcoal)",
                  }}
                />
              </div>

              {/* 노출 순서 + 활성화 */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--kino-mid)" }}>
                    노출 순서
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                    min={0}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none transition-all"
                    style={{
                      border: "1px solid var(--kino-pale)",
                      background: "var(--kino-bg)",
                      color: "var(--kino-charcoal)",
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: "var(--kino-light)" }}>숫자가 낮을수록 먼저 노출됩니다.</p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      style={{ color: form.isActive ? "var(--kino-charcoal)" : "var(--kino-light)" }}
                    >
                      {form.isActive
                        ? <ToggleRight size={28} />
                        : <ToggleLeft size={28} />
                      }
                    </button>
                    <span className="text-sm font-medium" style={{ color: "var(--kino-mid)" }}>
                      {form.isActive ? "활성" : "비활성"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-5 pt-4" style={{ borderTop: "1px solid var(--kino-pale)" }}>
              <button
                onClick={handleSubmit}
                disabled={isPending || uploading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
                style={{
                  background: "var(--kino-charcoal)",
                  color: "white",
                  opacity: (isPending || uploading) ? 0.6 : 1,
                }}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                {editId !== null ? "수정 완료" : "등록"}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 배너 목록 */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-white)" }}
        >
          {/* 테이블 헤더 */}
          <div
            className="grid text-xs font-semibold px-4 py-2.5"
            style={{
              gridTemplateColumns: "40px 1fr 120px 80px 80px 100px",
              background: "var(--kino-bg)",
              borderBottom: "1px solid var(--kino-pale)",
              color: "var(--kino-muted)",
            }}
          >
            <span>#</span>
            <span>구좌명 / 이미지</span>
            <span>연결 링크</span>
            <span>순서</span>
            <span>상태</span>
            <span className="text-right">관리</span>
          </div>

          {/* 목록 */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
            </div>
          ) : !banners || banners.length === 0 ? (
            <div className="py-12 text-center">
              <Image size={32} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 배너가 없습니다.</p>
              <p className="text-xs mt-1" style={{ color: "var(--kino-light)" }}>상단 [배너 추가] 버튼을 눌러 첫 배너를 등록하세요.</p>
            </div>
          ) : (
            banners.map((banner, idx) => (
              <div
                key={banner.id}
                className="grid items-center px-4 py-3 transition-colors hover:bg-gray-50"
                style={{
                  gridTemplateColumns: "40px 1fr 120px 80px 80px 100px",
                  borderBottom: idx < banners.length - 1 ? "1px solid var(--kino-pale)" : "none",
                }}
              >
                {/* 번호 */}
                <span className="text-xs font-medium" style={{ color: "var(--kino-light)" }}>{idx + 1}</span>

                {/* 구좌명 + 이미지 썸네일 */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 rounded overflow-hidden"
                    style={{ width: "72px", height: "36px", background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
                  >
                    <img
                      src={banner.imageUrl}
                      alt={banner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--kino-charcoal)" }}>{banner.name}</p>
                    {banner.note && (
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--kino-light)" }}>{banner.note}</p>
                    )}
                  </div>
                </div>

                {/* 연결 링크 */}
                <div className="min-w-0">
                  {banner.linkUrl ? (
                    <a
                      href={banner.linkUrl}
                      target={banner.linkUrl.startsWith("http") ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs truncate"
                      style={{ color: "#2563EB" }}
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={10} />
                      <span className="truncate">{banner.linkUrl}</span>
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--kino-light)" }}>없음</span>
                  )}
                </div>

                {/* 순서 */}
                <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{banner.sortOrder}</span>

                {/* 상태 토글 */}
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: banner.id, isActive: !banner.isActive })}
                  className="flex items-center gap-1 transition-all"
                  style={{ color: banner.isActive ? "var(--kino-charcoal)" : "var(--kino-light)" }}
                >
                  {banner.isActive
                    ? <ToggleRight size={22} />
                    : <ToggleLeft size={22} />
                  }
                  <span className="text-xs font-medium">{banner.isActive ? "활성" : "비활성"}</span>
                </button>

                {/* 관리 버튼 */}
                <div className="flex items-center justify-end gap-1">
                  {deleteConfirmId === banner.id ? (
                    <>
                      <button
                        onClick={() => deleteMutation.mutate({ id: banner.id })}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 rounded text-xs font-semibold transition-all"
                        style={{ background: "#DC2626", color: "white" }}
                      >
                        {deleteMutation.isPending ? <Loader2 size={10} className="animate-spin" /> : "확인"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 rounded text-xs transition-all"
                        style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(banner)}
                        className="p-1.5 rounded transition-all hover:bg-gray-100"
                        style={{ color: "var(--kino-mid)" }}
                        title="수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(banner.id)}
                        className="p-1.5 rounded transition-all hover:bg-red-50"
                        style={{ color: "#DC2626" }}
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 안내 */}
        {banners && banners.length > 0 && (
          <p className="text-xs mt-3" style={{ color: "var(--kino-light)" }}>
            * 활성 배너가 1개이면 고정 노출, 2개 이상이면 10초 간격으로 자동 롤링됩니다. (최대 10개)
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

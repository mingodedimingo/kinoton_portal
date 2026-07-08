/**
 * AdminResourcePage.tsx — 어드민 자원 관리 페이지
 * - 예약 가능한 자원(회의실, 차량, 장비, 공간) 목록 조회
 * - 자원 추가 / 수정 / 삭제 / 활성화 토글
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2, Car, Monitor, Coffee,
  Plus, Pencil, Trash2, Loader2,
  ToggleLeft, ToggleRight, Package,
  ChevronDown, ChevronUp, X, Check,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

type ResourceType = "회의실" | "차량" | "장비" | "공간";

const TYPE_ICON: Record<ResourceType, React.ReactNode> = {
  "회의실": <Building2 size={14} />,
  "차량":   <Car size={14} />,
  "장비":   <Monitor size={14} />,
  "공간":   <Coffee size={14} />,
};

const TYPE_COLOR: Record<ResourceType, { bg: string; color: string }> = {
  "회의실": { bg: "#EFF6FF", color: "#1D4ED8" },
  "차량":   { bg: "#F0FDF4", color: "#15803D" },
  "장비":   { bg: "#FFF7ED", color: "#C2410C" },
  "공간":   { bg: "#FAF5FF", color: "#7E22CE" },
};

const RESOURCE_TYPES: ResourceType[] = ["회의실", "차량", "장비", "공간"];

interface FormState {
  resourceType: ResourceType;
  name: string;
  capacity: number;
  location: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

const DEFAULT_FORM: FormState = {
  resourceType: "회의실",
  name: "",
  capacity: 1,
  location: "",
  description: "",
  isActive: true,
  sortOrder: 0,
};

export default function AdminResourcePage() {
  const utils = trpc.useUtils();
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("전체");

  const { data: resources, isLoading } = trpc.reservationResources.adminList.useQuery();

  const createMutation = trpc.reservationResources.create.useMutation({
    onSuccess: () => {
      toast.success("자원이 추가되었습니다.");
      utils.reservationResources.adminList.invalidate();
      setShowForm(false);
      setForm(DEFAULT_FORM);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.reservationResources.update.useMutation({
    onSuccess: () => {
      toast.success("자원 정보가 수정되었습니다.");
      utils.reservationResources.adminList.invalidate();
      setEditId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.reservationResources.delete.useMutation({
    onSuccess: () => {
      toast.success("자원이 삭제되었습니다.");
      utils.reservationResources.adminList.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error("자원 이름을 입력해주세요."); return; }
    createMutation.mutate({
      resourceType: form.resourceType,
      name: form.name.trim(),
      capacity: form.capacity,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    });
  };

  const handleUpdate = (id: number) => {
    if (!form.name.trim()) { toast.error("자원 이름을 입력해주세요."); return; }
    updateMutation.mutate({
      id,
      resourceType: form.resourceType,
      name: form.name.trim(),
      capacity: form.capacity,
      location: form.location.trim() || undefined,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    });
  };

  const handleToggleActive = (id: number, current: boolean) => {
    updateMutation.mutate({ id, isActive: !current });
  };

  const startEdit = (r: typeof resources extends (infer T)[] | undefined ? T : never) => {
    if (!r) return;
    setEditId((r as any).id);
    setForm({
      resourceType: (r as any).resourceType as ResourceType,
      name: (r as any).name,
      capacity: (r as any).capacity,
      location: (r as any).location ?? "",
      description: (r as any).description ?? "",
      isActive: (r as any).isActive,
      sortOrder: (r as any).sortOrder,
    });
    setShowForm(false);
  };

  const filtered = (resources ?? []).filter(r =>
    typeFilter === "전체" || r.resourceType === typeFilter
  );

  // 요약 통계
  const summary = RESOURCE_TYPES.map(t => ({
    type: t,
    total: (resources ?? []).filter(r => r.resourceType === t).length,
    active: (resources ?? []).filter(r => r.resourceType === t && r.isActive).length,
  }));

  return (
    <AdminLayout title="자원 관리">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {summary.map(s => {
          const cfg = TYPE_COLOR[s.type];
          return (
            <div key={s.type} className="portal-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: cfg.color }}>{TYPE_ICON[s.type]}</span>
                <span className="text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{s.type}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: cfg.color }}>{s.total}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
                활성 {s.active} / 전체 {s.total}
              </p>
            </div>
          );
        })}
      </div>

      {/* 자원 목록 카드 */}
      <div className="portal-card">
        {/* 헤더 */}
        <div className="section-header flex-wrap gap-2">
          <span className="section-title flex items-center gap-1.5">
            <Package size={14} style={{ color: "var(--kino-mid)" }} />
            자원 목록
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* 유형 필터 */}
            <div className="flex gap-1">
              {["전체", ...RESOURCE_TYPES].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    background: typeFilter === t ? "var(--kino-charcoal)" : "var(--kino-pale)",
                    color: typeFilter === t ? "white" : "var(--kino-mid)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* 추가 버튼 */}
            <button
              onClick={() => { setShowForm(!showForm); setEditId(null); setForm(DEFAULT_FORM); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              {showForm ? <X size={12} /> : <Plus size={12} />}
              {showForm ? "취소" : "자원 추가"}
            </button>
          </div>
        </div>

        {/* 자원 추가 폼 */}
        {showForm && (
          <div
            className="mx-4 mb-4 p-4 rounded-lg"
            style={{ background: "var(--kino-pale)", border: "1px solid #E5E7EB" }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--kino-charcoal)" }}>
              새 자원 추가
            </p>
            <ResourceForm form={form} setForm={setForm} />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold"
                style={{ background: "var(--kino-charcoal)", color: "white" }}
              >
                {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                추가
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(DEFAULT_FORM); }}
                className="px-4 py-1.5 rounded text-xs font-semibold"
                style={{ background: "white", color: "var(--kino-mid)", border: "1px solid #E5E7EB" }}
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>
              {typeFilter === "전체" ? "등록된 자원이 없습니다" : `등록된 ${typeFilter}이(가) 없습니다`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--kino-pale)", borderBottom: "1px solid var(--kino-pale)" }}>
                  {["유형", "자원명", "수용 인원", "위치", "설명", "정렬순서", "상태", "관리"].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const cfg = TYPE_COLOR[r.resourceType as ResourceType] ?? TYPE_COLOR["회의실"];
                  const isEditing = editId === r.id;
                  return (
                    <>
                      <tr
                        key={r.id}
                        style={{
                          background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA",
                          borderBottom: isEditing ? "none" : "1px solid var(--kino-pale)",
                          opacity: r.isActive ? 1 : 0.55,
                        }}
                      >
                        <td className="px-3 py-3">
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold w-fit"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {TYPE_ICON[r.resourceType as ResourceType]}
                            {r.resourceType}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                          {r.name}
                        </td>
                        <td className="px-3 py-3 text-center" style={{ color: "var(--kino-mid)" }}>
                          {r.capacity}명
                        </td>
                        <td className="px-3 py-3" style={{ color: "var(--kino-muted)" }}>
                          {r.location ?? "-"}
                        </td>
                        <td className="px-3 py-3 max-w-40 truncate" style={{ color: "var(--kino-muted)" }}>
                          {r.description ?? "-"}
                        </td>
                        <td className="px-3 py-3 text-center" style={{ color: "var(--kino-muted)" }}>
                          {r.sortOrder}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => handleToggleActive(r.id, r.isActive)}
                            disabled={updateMutation.isPending}
                            className="flex items-center gap-1 text-xs font-medium transition-all"
                            style={{ color: r.isActive ? "#16A34A" : "#9CA3AF" }}
                            title={r.isActive ? "비활성화" : "활성화"}
                          >
                            {r.isActive
                              ? <ToggleRight size={18} />
                              : <ToggleLeft size={18} />
                            }
                            {r.isActive ? "활성" : "비활성"}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => isEditing ? setEditId(null) : startEdit(r)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                              style={{ background: isEditing ? "var(--kino-pale)" : "#EFF6FF", color: isEditing ? "var(--kino-mid)" : "#1D4ED8" }}
                            >
                              {isEditing ? <ChevronUp size={11} /> : <Pencil size={11} />}
                              {isEditing ? "닫기" : "수정"}
                            </button>
                            {deleteConfirmId === r.id ? (
                              <>
                                <button
                                  onClick={() => deleteMutation.mutate({ id: r.id })}
                                  disabled={deleteMutation.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                                  style={{ background: "#FEF2F2", color: "#DC2626" }}
                                >
                                  {deleteMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                                  확인
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                                  style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}
                                >
                                  <X size={11} /> 취소
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                                style={{ background: "#FEF2F2", color: "#DC2626" }}
                              >
                                <Trash2 size={11} /> 삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 인라인 수정 폼 */}
                      {isEditing && (
                        <tr
                          key={`edit-${r.id}`}
                          style={{
                            background: "#F8FAFF",
                            borderBottom: "1px solid var(--kino-pale)",
                          }}
                        >
                          <td colSpan={8} className="px-4 py-4">
                            <p className="text-xs font-semibold mb-3" style={{ color: "var(--kino-charcoal)" }}>
                              자원 수정
                            </p>
                            <ResourceForm form={form} setForm={setForm} />
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleUpdate(r.id)}
                                disabled={updateMutation.isPending}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold"
                                style={{ background: "var(--kino-charcoal)", color: "white" }}
                              >
                                {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                저장
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="px-4 py-1.5 rounded text-xs font-semibold"
                                style={{ background: "white", color: "var(--kino-mid)", border: "1px solid #E5E7EB" }}
                              >
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── 자원 폼 컴포넌트 ─────────────────────────────────────────────────────────
function ResourceForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const inputStyle = {
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "12px",
    color: "var(--kino-charcoal)",
    background: "white",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {/* 유형 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          유형 <span style={{ color: "#DC2626" }}>*</span>
        </label>
        <select
          value={form.resourceType}
          onChange={e => setForm(f => ({ ...f, resourceType: e.target.value as ResourceType }))}
          style={inputStyle}
        >
          {["회의실", "차량", "장비", "공간"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* 이름 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          자원명 <span style={{ color: "#DC2626" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="예: 4층 C, 법인차량 3호"
          style={inputStyle}
        />
      </div>

      {/* 수용 인원 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          수용 인원
        </label>
        <input
          type="number"
          min={1}
          value={form.capacity}
          onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) || 1 }))}
          style={inputStyle}
        />
      </div>

      {/* 위치 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          위치
        </label>
        <input
          type="text"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
          placeholder="예: 2F, B1, 창고"
          style={inputStyle}
        />
      </div>

      {/* 정렬 순서 */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          정렬 순서
        </label>
        <input
          type="number"
          min={0}
          value={form.sortOrder}
          onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
          style={inputStyle}
        />
      </div>

      {/* 활성 여부 */}
      <div className="flex items-end">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 rounded"
            style={{ accentColor: "var(--kino-charcoal)" }}
          />
          <span className="text-xs font-medium" style={{ color: "var(--kino-mid)" }}>
            활성 (예약 가능)
          </span>
        </label>
      </div>

      {/* 설명 */}
      <div className="col-span-2 md:col-span-3">
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>
          설명 (선택)
        </label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="자원에 대한 간단한 설명"
          style={inputStyle}
        />
      </div>
    </div>
  );
}

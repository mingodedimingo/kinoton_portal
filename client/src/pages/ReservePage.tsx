/**
 * ReservePage.tsx — 예약 페이지
 * - 자원 목록: reservationResources.list API (DB 기반, 활성 자원만)
 * - 내 예약 현황: reservations.myList API (로그인 유저 기반)
 * - 일자별 전체 예약 현황: reservations.byDate API
 * - 예약 신청 모달: reservations.request API
 */
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Building2, Car, Monitor, Coffee, Plus, Clock, CalendarDays, Loader2, X, ChevronDown } from "lucide-react";

// 자원 유형별 아이콘
function ResourceIcon({ type, size = 18 }: { type: string; size?: number }) {
  const style = { color: "var(--kino-mid)" };
  if (type === "회의실") return <Building2 size={size} style={style} />;
  if (type === "차량") return <Car size={size} style={style} />;
  if (type === "장비") return <Monitor size={size} style={style} />;
  return <Coffee size={size} style={style} />;
}

// 오늘 날짜 yyyy-mm-dd
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReservePage() {
  const { user } = useAuth();
  const [activeType, setActiveType] = useState("전체");
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [showModal, setShowModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<{ id: number; name: string; type: string } | null>(null);

  // 예약 신청 폼 상태
  const [form, setForm] = useState({
    reserveDate: todayStr(),
    startTime: "09:00",
    endTime: "10:00",
    purpose: "",
    attendees: 1,
    note: "",
  });

  const utils = trpc.useUtils();

  // ── API 호출 ──────────────────────────────────────────────────────
  // 1. 활성 자원 목록 (DB 기반)
  const { data: resources, isLoading: resourcesLoading } = trpc.reservationResources.list.useQuery(
    { onlyActive: true }
  );

  // 2. 내 예약 현황 (로그인 유저 기반)
  const openId = (user as any)?.openId ?? "";
  const empId = openId.startsWith("emp_") ? parseInt(openId.replace("emp_", "")) : null;
  const { data: myReservations } = trpc.reservations.myList.useQuery(
    { employeeId: empId! },
    { enabled: empId !== null }
  );

  // 3. 일자별 전체 예약 현황
  const { data: dateReservations } = trpc.reservations.byDate.useQuery(
    { reserveDate: selectedDate },
    { enabled: !!selectedDate }
  );

  // 4. 예약 신청 뮤테이션
  const requestMutation = trpc.reservations.request.useMutation({
    onSuccess: () => {
      toast.success("예약 신청이 완료되었습니다.");
      setShowModal(false);
      utils.reservations.myList.invalidate();
      utils.reservations.byDate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // 5. 예약 취소 뮤테이션
  const cancelMutation = trpc.reservations.cancel.useMutation({
    onSuccess: () => {
      toast.success("예약이 취소되었습니다.");
      utils.reservations.myList.invalidate();
      utils.reservations.byDate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const types = ["전체", "회의실", "차량", "장비", "공간"];
  const filtered = !resources ? [] :
    activeType === "전체" ? resources : resources.filter((r: any) => r.resourceType === activeType);

  // 예약하기 버튼 클릭
  const handleReserveClick = (r: any) => {
    if (!user) { toast.error("로그인이 필요합니다."); return; }
    setSelectedResource({ id: r.id, name: r.name, type: r.resourceType });
    setForm({ ...form, reserveDate: todayStr() });
    setShowModal(true);
  };

  // 예약 신청 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource || !user) return;
    if (!form.purpose.trim()) { toast.error("사용 목적을 입력해주세요."); return; }
    if (form.startTime >= form.endTime) { toast.error("종료 시간은 시작 시간보다 늦어야 합니다."); return; }
    requestMutation.mutate({
      resourceType: selectedResource.type as any,
      resourceName: selectedResource.name,
      reserveDate: form.reserveDate,
      startTime: form.startTime,
      endTime: form.endTime,
      purpose: form.purpose,
      employeeId: empId ?? undefined,
      employeeName: (user as any)?.name ?? "알 수 없음",
      department: (user as any)?.department ?? undefined,
      attendees: form.attendees,
      note: form.note || undefined,
    });
  };

  // 상태 뱃지 스타일
  const statusStyle = (status: string) => {
    if (status === "승인") return { background: "#F0FDF4", color: "#16A34A" };
    if (status === "반려") return { background: "#FEF2F2", color: "#DC2626" };
    if (status === "취소") return { background: "var(--kino-pale)", color: "var(--kino-muted)" };
    return { background: "#FEF9C3", color: "#92400E" }; // 대기
  };

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>예약</h1>
          <button
            onClick={() => {
              if (!user) { toast.error("로그인이 필요합니다."); return; }
              setSelectedResource(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold text-white"
            style={{ background: "var(--kino-charcoal)" }}
          >
            <Plus size={14} /> 예약 신청
          </button>
        </div>

        {/* ── 일자별 예약 현황 ── */}
        <div className="portal-card mb-4">
          <div className="section-header">
            <span className="section-title flex items-center gap-1.5">
              <CalendarDays size={14} style={{ color: "var(--kino-mid)" }} />
              일자별 예약 현황
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs px-2 py-1 rounded outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
            />
          </div>
          <div className="px-4 py-3">
            {!dateReservations || dateReservations.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: "var(--kino-muted)" }}>해당 날짜에 예약이 없습니다</p>
            ) : (
              <div className="flex flex-col gap-2">
                {dateReservations.map((r: any) => (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "var(--kino-pale)" }}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{r.resourceName}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
                        {r.startTime} ~ {r.endTime} · {r.employeeName} · {r.purpose}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={statusStyle(r.status)}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 내 예약 현황 ── */}
        <div className="portal-card mb-4">
          <div className="section-header">
            <span className="section-title flex items-center gap-1.5">
              <Clock size={14} style={{ color: "var(--kino-mid)" }} />
              내 예약 현황
            </span>
          </div>
          {!myReservations || myReservations.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--kino-muted)" }}>예약 내역이 없습니다</p>
          ) : (
            myReservations.slice().reverse().slice(0, 5).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--kino-pale)" }}>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{r.resourceName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
                    {r.reserveDate} · {r.startTime} ~ {r.endTime} · {r.purpose}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded font-medium" style={statusStyle(r.status)}>
                  {r.status}
                </span>
                {(r.status === "대기" || r.status === "승인") && (
                  <button
                    onClick={() => cancelMutation.mutate({ id: r.id })}
                    disabled={cancelMutation.isPending}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-muted)" }}
                  >
                    취소
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── 예약 가능 자원 ── */}
        <div className="portal-card">
          <div className="section-header">
            <span className="section-title">예약 가능 자원</span>
            <div className="flex gap-1">
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    background: activeType === t ? "var(--kino-charcoal)" : "transparent",
                    color: activeType === t ? "white" : "var(--kino-muted)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {resourcesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--kino-muted)" }}>등록된 자원이 없습니다</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {filtered.map((r: any) => (
                <div key={r.id} className="portal-card p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "var(--kino-bg)" }}>
                      <ResourceIcon type={r.resourceType} />
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: "#F0FDF4", color: "#16A34A" }}
                    >
                      예약가능
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
                    {r.location} · 수용 {r.capacity}명
                  </p>
                  {r.description && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{r.description}</p>
                  )}
                  <button
                    className="mt-2 w-full py-1.5 rounded text-xs font-semibold text-white transition-colors"
                    style={{ background: "var(--kino-charcoal)" }}
                    onClick={() => handleReserveClick(r)}
                  >
                    예약하기
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 예약 신청 모달 ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="portal-card w-full max-w-md mx-4 p-5" style={{ background: "white" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
                예약 신청{selectedResource ? ` — ${selectedResource.name}` : ""}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--kino-muted)" }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* 자원 선택 (직접 신청 시) */}
              {!selectedResource && (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>자원 선택 *</label>
                  <select
                    className="w-full px-3 py-1.5 rounded text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                    onChange={e => {
                      const r = resources?.find((x: any) => x.id === Number(e.target.value));
                      if (r) setSelectedResource({ id: r.id, name: r.name, type: r.resourceType });
                    }}
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>자원을 선택하세요</option>
                    {(resources ?? []).map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.resourceType})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>예약 날짜 *</label>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 rounded text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                  value={form.reserveDate}
                  min={todayStr()}
                  onChange={e => setForm({ ...form, reserveDate: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>시작 시간 *</label>
                  <input
                    type="time"
                    className="w-full px-3 py-1.5 rounded text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>종료 시간 *</label>
                  <input
                    type="time"
                    className="w-full px-3 py-1.5 rounded text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                    value={form.endTime}
                    onChange={e => setForm({ ...form, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>사용 목적 *</label>
                <input
                  className="w-full px-3 py-1.5 rounded text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                  placeholder="예: Q3 기획 회의"
                  value={form.purpose}
                  onChange={e => setForm({ ...form, purpose: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>참석 인원</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-1.5 rounded text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                  value={form.attendees}
                  onChange={e => setForm({ ...form, attendees: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>비고 (선택)</label>
                <textarea
                  className="w-full px-3 py-1.5 rounded text-sm outline-none resize-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                  rows={2}
                  placeholder="추가 요청사항"
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-1.5 rounded text-sm"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="px-4 py-1.5 rounded text-sm font-semibold text-white flex items-center gap-1.5"
                  style={{ background: "var(--kino-charcoal)" }}
                >
                  {requestMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
                  신청하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

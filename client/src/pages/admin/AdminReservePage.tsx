/**
 * AdminReservePage.tsx — 어드민 예약 관리 페이지
 * - 전체 예약 신청 목록 조회
 * - 승인 / 반려 처리
 */
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Loader2, Building2, Car, Monitor, Coffee, CalendarDays } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "대기":   { bg: "#FEF9C3", color: "#92400E", icon: <Clock size={11} /> },
  "승인":   { bg: "#F0FDF4", color: "#16A34A", icon: <CheckCircle size={11} /> },
  "반려":   { bg: "#FEF2F2", color: "#DC2626", icon: <XCircle size={11} /> },
  "취소":   { bg: "#F3F4F6", color: "#6B7280", icon: <XCircle size={11} /> },
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  "회의실": <Building2 size={13} />,
  "차량":   <Car size={13} />,
  "장비":   <Monitor size={13} />,
  "공간":   <Coffee size={13} />,
};

export default function AdminReservePage() {
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState("전체");
  const [typeFilter, setTypeFilter] = useState("전체");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: reservations, isLoading } = trpc.reservations.adminList.useQuery({
    status: statusFilter === "전체" ? undefined : statusFilter,
    resourceType: typeFilter === "전체" ? undefined : typeFilter,
  });

  const approveMutation = trpc.reservations.approve.useMutation({
    onSuccess: () => {
      toast.success("예약이 승인되었습니다.");
      utils.reservations.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.reservations.reject.useMutation({
    onSuccess: () => {
      toast.success("예약이 반려되었습니다.");
      utils.reservations.adminList.invalidate();
      setRejectId(null);
      setRejectReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApprove = (id: number) => {
    if (!confirm("이 예약 신청을 승인하시겠습니까?")) return;
    approveMutation.mutate({ id, approverName: "관리자" });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ id, approverName: "관리자", rejectReason: rejectReason || undefined });
  };

  const statusFilters = ["전체", "대기", "승인", "반려", "취소"];
  const typeFilters = ["전체", "회의실", "차량", "장비", "공간"];

  // 요약 통계
  const summary = {
    대기: (reservations ?? []).filter(r => r.status === "대기").length,
    승인: (reservations ?? []).filter(r => r.status === "승인").length,
    반려: (reservations ?? []).filter(r => r.status === "반려").length,
    취소: (reservations ?? []).filter(r => r.status === "취소").length,
  };

  return (
    <AdminLayout title="예약 관리">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "승인 대기", value: summary.대기, color: "#92400E" },
          { label: "승인 완료", value: summary.승인, color: "#16A34A" },
          { label: "반려",      value: summary.반려, color: "#DC2626" },
          { label: "취소",      value: summary.취소, color: "#6B7280" },
        ].map(s => (
          <div key={s.label} className="portal-card p-4 text-center">
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="portal-card">
        {/* 필터 */}
        <div className="section-header flex-wrap gap-2">
          <span className="section-title flex items-center gap-1.5">
            <CalendarDays size={14} style={{ color: "var(--kino-mid)" }} />
            예약 신청 목록
          </span>
          <div className="flex flex-wrap gap-2">
            {/* 상태 필터 */}
            <div className="flex gap-1">
              {statusFilters.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    background: statusFilter === s ? "var(--kino-charcoal)" : "var(--kino-pale)",
                    color: statusFilter === s ? "white" : "var(--kino-mid)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* 자원 유형 필터 */}
            <div className="flex gap-1">
              {typeFilters.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    background: typeFilter === t ? "#374151" : "transparent",
                    color: typeFilter === t ? "white" : "var(--kino-muted)",
                    border: typeFilter === t ? "none" : "1px solid var(--kino-pale)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : !reservations || reservations.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>예약 신청이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--kino-pale)", borderBottom: "1px solid var(--kino-pale)" }}>
                  {["유형", "자원명", "신청자", "부서", "날짜", "시간", "목적", "인원", "상태", "처리"].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((r, idx) => {
                  const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["대기"];
                  return (
                    <tr
                      key={r.id}
                      style={{
                        background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA",
                        borderBottom: "1px solid var(--kino-pale)",
                      }}
                    >
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1" style={{ color: "var(--kino-mid)" }}>
                          {TYPE_ICON[r.resourceType] ?? <Building2 size={13} />}
                          {r.resourceType}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium" style={{ color: "var(--kino-charcoal)" }}>
                        {r.resourceName}
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--kino-mid)" }}>{r.employeeName}</td>
                      <td className="px-3 py-3" style={{ color: "var(--kino-muted)" }}>{r.department ?? "-"}</td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--kino-muted)" }}>{r.reserveDate}</td>
                      <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--kino-muted)" }}>
                        {r.startTime}~{r.endTime}
                      </td>
                      <td className="px-3 py-3 max-w-32 truncate" style={{ color: "var(--kino-charcoal)" }}>
                        {r.purpose}
                      </td>
                      <td className="px-3 py-3 text-center" style={{ color: "var(--kino-muted)" }}>
                        {r.attendees ?? 1}명
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold w-fit"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.icon}{r.status}
                        </span>
                        {r.status === "반려" && r.rejectReason && (
                          <p className="text-xs mt-0.5" style={{ color: "#DC2626" }}>{r.rejectReason}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {r.status === "대기" ? (
                          rejectId === r.id ? (
                            <div className="flex flex-col gap-1 min-w-40">
                              <input
                                type="text"
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="반려 사유 (선택)"
                                className="px-2 py-1 rounded text-xs outline-none w-full"
                                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)" }}
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReject(r.id)}
                                  disabled={rejectMutation.isPending}
                                  className="flex-1 py-1 rounded text-xs font-semibold"
                                  style={{ background: "#FEF2F2", color: "#DC2626" }}
                                >
                                  확인
                                </button>
                                <button
                                  onClick={() => { setRejectId(null); setRejectReason(""); }}
                                  className="flex-1 py-1 rounded text-xs font-semibold"
                                  style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApprove(r.id)}
                                disabled={approveMutation.isPending}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                                style={{ background: "#F0FDF4", color: "#16A34A" }}
                              >
                                <CheckCircle size={11} /> 승인
                              </button>
                              <button
                                onClick={() => setRejectId(r.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                                style={{ background: "#FEF2F2", color: "#DC2626" }}
                              >
                                <XCircle size={11} /> 반려
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs" style={{ color: "var(--kino-light)" }}>
                            {r.approvedAt
                              ? new Date(r.approvedAt).toLocaleDateString("ko-KR")
                              : r.status === "취소" ? "취소됨" : "-"}
                          </span>
                        )}
                      </td>
                    </tr>
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

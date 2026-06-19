/**
 * AdminLeavePage.tsx — 어드민 연차 관리 페이지
 * - 연차 신청 목록 조회, 승인/반려
 * - 전체 직원 연차 현황
 * - 이카운트 CSV 내보내기
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Clock, Loader2, Download,
  Users, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "대기": { bg: "#FEF9C3", color: "#92400E", icon: <Clock size={11} /> },
  "승인": { bg: "#F0FDF4", color: "#16A34A", icon: <CheckCircle size={11} /> },
  "반려": { bg: "#FEF2F2", color: "#DC2626", icon: <XCircle size={11} /> },
};

// ── 연차 신청 목록 탭 ─────────────────────────────────────────────
function LeaveRequestsTab({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: requests, isLoading } = trpc.leave.adminList.useQuery({
    adminToken,
    year,
    status: statusFilter === "전체" ? undefined : statusFilter,
  });

  const approveMutation = trpc.leave.approve.useMutation({
    onSuccess: () => {
      toast.success("연차가 승인되었습니다.");
      utils.leave.adminList.invalidate();
      utils.employees.allLeaveBalances.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.leave.reject.useMutation({
    onSuccess: () => {
      toast.success("연차가 반려되었습니다.");
      utils.leave.adminList.invalidate();
      setRejectId(null);
      setRejectReason("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleApprove = (id: number) => {
    if (!confirm("이 연차 신청을 승인하시겠습니까?")) return;
    approveMutation.mutate({ adminToken, id, approverName: "관리자" });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ adminToken, id, approverName: "관리자", rejectReason: rejectReason || undefined });
  };

  // CSV 내보내기 (이카운트 호환 형식)
  const handleExportCSV = () => {
    if (!requests || requests.length === 0) {
      toast.error("내보낼 데이터가 없습니다.");
      return;
    }
    const headers = ["이름", "부서", "휴가종류", "시작일", "종료일", "일수", "사유", "상태", "처리일"];
    const rows = requests.map(r => [
      r.employeeName,
      r.department,
      r.leaveType,
      r.startDate,
      r.endDate,
      r.days,
      r.reason ?? "",
      r.status,
      r.approvedAt ?? "",
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `연차현황_${year}년.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 파일이 다운로드되었습니다.");
  };

  return (
    <div>
      {/* 필터 + 내보내기 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-1.5 rounded text-xs outline-none"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <div className="flex gap-1">
            {["전체", "대기", "승인", "반려"].map(s => (
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
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
        >
          <Download size={12} /> CSV 내보내기
        </button>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
      ) : !requests || requests.length === 0 ? (
        <div className="text-center py-12">
          <FileText size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>신청 내역이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--kino-pale)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--kino-pale)", borderBottom: "1px solid var(--kino-pale)" }}>
                {["이름", "부서", "휴가종류", "기간", "일수", "사유", "상태", "처리"].map(h => (
                  <th key={h} className="px-3 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => {
                const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["대기"];
                return (
                  <tr key={req.id} style={{ background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-3 py-3 font-medium" style={{ color: "var(--kino-charcoal)" }}>{req.employeeName}</td>
                    <td className="px-3 py-3" style={{ color: "var(--kino-mid)" }}>{req.department}</td>
                    <td className="px-3 py-3" style={{ color: "var(--kino-mid)" }}>{req.leaveType}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ color: "var(--kino-muted)" }}>
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate}~${req.endDate}`}
                    </td>
                    <td className="px-3 py-3 text-center font-medium" style={{ color: "var(--kino-charcoal)" }}>{req.days}일</td>
                    <td className="px-3 py-3 max-w-32 truncate" style={{ color: "var(--kino-muted)" }}>{req.reason ?? "-"}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold w-fit" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.icon}{req.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {req.status === "대기" ? (
                        rejectId === req.id ? (
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
                                onClick={() => handleReject(req.id)}
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
                              onClick={() => handleApprove(req.id)}
                              disabled={approveMutation.isPending}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                              style={{ background: "#F0FDF4", color: "#16A34A" }}
                            >
                              <CheckCircle size={11} /> 승인
                            </button>
                            <button
                              onClick={() => setRejectId(req.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all"
                              style={{ background: "#FEF2F2", color: "#DC2626" }}
                            >
                              <XCircle size={11} /> 반려
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-xs" style={{ color: "var(--kino-light)" }}>
                          {req.approvedAt ? new Date(req.approvedAt).toLocaleDateString('ko-KR') : "-"}
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
  );
}

// ── 전체 직원 연차 현황 탭 ────────────────────────────────────────
function LeaveBalancesTab({ adminToken }: { adminToken: string }) {
  const utils = trpc.useUtils();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: balances, isLoading } = trpc.employees.allLeaveBalances.useQuery({ adminToken, year });

  // CSV 내보내기 (이카운트 호환)
  const handleExportCSV = () => {
    if (!balances || balances.length === 0) { toast.error("내보낼 데이터가 없습니다."); return; }
    const headers = ["이름", "부서", "직위", "총연차", "사용일수", "잔여일수"];
    const rows = balances.map(b => [
      b.employee.name,
      b.employee.department,
      b.employee.position,
      b.totalDays,
      b.usedDays,
      b.remainingDays,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `연차잔액현황_${year}년.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 파일이 다운로드되었습니다.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          className="px-3 py-1.5 rounded text-xs outline-none"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
        >
          {[currentYear - 1, currentYear, currentYear + 1].map(y => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
        >
          <Download size={12} /> CSV 내보내기
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
      ) : !balances || balances.length === 0 ? (
        <div className="text-center py-12">
          <Users size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>직원이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--kino-pale)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--kino-pale)", borderBottom: "1px solid var(--kino-pale)" }}>
                {["이름", "부서", "직위", "총 연차", "사용", "잔여", "사용률"].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map((b, idx) => {
                const pct = b.totalDays > 0 ? Math.min(100, (b.usedDays / b.totalDays) * 100) : 0;
                const isLow = b.remainingDays <= 3;
                return (
                  <tr key={b.employee.id} style={{ background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--kino-charcoal)" }}>{b.employee.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{b.employee.department}</td>
                    <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{b.employee.position}</td>
                    <td className="px-4 py-3 text-center font-medium" style={{ color: "var(--kino-charcoal)" }}>{b.totalDays}일</td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--kino-mid)" }}>{b.usedDays}일</td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: isLow ? "var(--kino-red)" : "#16A34A" }}>
                      {b.remainingDays}일
                      {isLow && <span className="ml-1">⚠</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full overflow-hidden" style={{ height: "5px", background: "var(--kino-pale)", minWidth: "60px" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: isLow ? "var(--kino-red)" : "var(--kino-charcoal)" }}
                          />
                        </div>
                        <span style={{ color: "var(--kino-muted)", minWidth: "30px" }}>{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminLeavePage() {
  const { token: adminToken } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "balances">("requests");

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--kino-charcoal)" }}>
            <FileText size={18} style={{ color: "var(--kino-mid)" }} />
            연차 관리
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
            연차 신청 승인/반려 및 전체 직원 연차 현황을 관리합니다
          </p>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "var(--kino-pale)", width: "fit-content" }}>
          {[
            { key: "requests", label: "연차 신청 목록" },
            { key: "balances", label: "연차 잔액 현황" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "requests" | "balances")}
              className="px-4 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? "var(--kino-charcoal)" : "transparent",
                color: activeTab === tab.key ? "white" : "var(--kino-mid)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "requests" ? (
          <LeaveRequestsTab adminToken={adminToken} />
        ) : (
          <LeaveBalancesTab adminToken={adminToken} />
        )}
      </div>
    </AdminLayout>
  );
}

/**
 * LeavePage.tsx — 연차 신청 페이지 (직원용)
 * - 직원 선택 → 연차 현황 확인 → 신청 폼 → 신청 이력
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown, Loader2, Calendar, FileText,
  CheckCircle, XCircle, Clock, Plus, X,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

// ── 직원 선택 드롭다운 ────────────────────────────────────────────
function EmployeeSelector({ selected, onSelect }: {
  selected: { id: number; name: string; department: string; position: string } | null;
  onSelect: (emp: { id: number; name: string; department: string; position: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: employees, isLoading } = trpc.employees.list.useQuery({ activeOnly: true });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded text-sm font-medium transition-all w-full"
        style={{ border: "1.5px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
      >
        <span className="flex-1 text-left truncate">
          {selected ? `${selected.name} — ${selected.department} · ${selected.position}` : "직원을 선택하세요"}
        </span>
        <ChevronDown size={14} style={{ color: "var(--kino-muted)", flexShrink: 0 }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded shadow-xl z-50 max-h-60 overflow-y-auto"
          style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}
        >
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
          ) : !employees || employees.length === 0 ? (
            <div className="py-4 text-center text-sm" style={{ color: "var(--kino-muted)" }}>
              등록된 직원이 없습니다<br />
              <span className="text-xs" style={{ color: "var(--kino-light)" }}>어드민에서 직원을 먼저 등록해주세요</span>
            </div>
          ) : employees.map(emp => (
            <button
              key={emp.id}
              onClick={() => { onSelect({ id: emp.id, name: emp.name, department: emp.department, position: emp.position }); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm transition-colors"
              style={{
                background: selected?.id === emp.id ? "var(--kino-pale)" : "transparent",
                color: "var(--kino-charcoal)",
                borderBottom: "1px solid var(--kino-pale)",
              }}
            >
              <span className="font-medium">{emp.name}</span>
              <span className="ml-2 text-xs" style={{ color: "var(--kino-muted)" }}>{emp.department} · {emp.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 연차 현황 카드 ────────────────────────────────────────────────
function LeaveBalanceCard({ employeeId }: { employeeId: number }) {
  const { data: balance, isLoading } = trpc.employees.leaveBalance.useQuery({ employeeId });

  if (isLoading) {
    return (
      <div className="portal-card p-4 flex justify-center">
        <Loader2 size={18} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
      </div>
    );
  }

  if (!balance) return null;

  const usedPct = Math.min(100, (balance.usedDays / balance.totalDays) * 100);
  const isLow = balance.remainingDays <= 3;

  return (
    <div className="portal-card p-4">
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--kino-charcoal)" }}>
        {balance.year}년 연차 현황
      </h3>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: "총 연차", value: `${balance.totalDays}일`, color: "var(--kino-charcoal)" },
          { label: "사용", value: `${balance.usedDays}일`, color: "var(--kino-mid)" },
          { label: "잔여", value: `${balance.remainingDays}일`, color: isLow ? "var(--kino-red)" : "var(--kino-green)" },
        ].map(item => (
          <div key={item.label} className="text-center p-3 rounded" style={{ background: "var(--kino-pale)" }}>
            <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{item.label}</p>
          </div>
        ))}
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--kino-pale)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${usedPct}%`,
            background: isLow ? "var(--kino-red)" : "var(--kino-charcoal)",
          }}
        />
      </div>
      <p className="text-xs mt-1.5" style={{ color: "var(--kino-muted)" }}>
        {usedPct.toFixed(0)}% 사용
        {isLow && <span className="ml-2 font-semibold" style={{ color: "var(--kino-red)" }}>⚠ 잔여 연차 부족</span>}
      </p>
    </div>
  );
}

// ── 연차 신청 폼 ──────────────────────────────────────────────────
const LEAVE_TYPES = ["연차", "반차(오전)", "반차(오후)", "반반차", "병가", "경조휴가", "기타"] as const;
const LEAVE_DAYS: Record<string, number> = {
  "연차": 1, "반차(오전)": 0.5, "반차(오후)": 0.5, "반반차": 0.25,
  "병가": 1, "경조휴가": 1, "기타": 1,
};

function LeaveRequestForm({
  employee,
  onSuccess,
}: {
  employee: { id: number; name: string; department: string; position: string };
  onSuccess: () => void;
}) {
  const utils = trpc.useUtils();
  const [leaveType, setLeaveType] = useState<typeof LEAVE_TYPES[number]>("연차");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);

  // 자동 일수 계산 (주말 제외)
  const calcDays = () => {
    if (!startDate || !endDate) return LEAVE_DAYS[leaveType] ?? 1;
    if (leaveType !== "연차" && leaveType !== "병가" && leaveType !== "경조휴가" && leaveType !== "기타") {
      return LEAVE_DAYS[leaveType];
    }
    let count = 0;
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const days = calcDays();

  const mutation = trpc.leave.request.useMutation({
    onSuccess: () => {
      toast.success("연차 신청이 완료되었습니다. 승인을 기다려주세요.");
      utils.leave.myRequests.invalidate();
      utils.employees.leaveBalance.invalidate();
      setStartDate("");
      setEndDate("");
      setReason("");
      setShowForm(false);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) { toast.error("시작일을 선택해주세요."); return; }
    if (!endDate) { toast.error("종료일을 선택해주세요."); return; }
    if (new Date(startDate) > new Date(endDate)) { toast.error("종료일이 시작일보다 앞설 수 없습니다."); return; }
    if (days <= 0) { toast.error("신청 일수가 0일입니다. 날짜를 확인해주세요."); return; }

    mutation.mutate({
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      leaveType,
      startDate,
      endDate,
      days,
      reason: reason || undefined,
    });
  };

  return (
    <div className="portal-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
          <FileText size={14} style={{ color: "var(--kino-mid)" }} />
          연차 신청
        </h3>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-all active:scale-95"
          style={{ background: showForm ? "var(--kino-pale)" : "var(--kino-charcoal)", color: showForm ? "var(--kino-mid)" : "white" }}
        >
          {showForm ? <><X size={11} /> 취소</> : <><Plus size={11} /> 신청하기</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* 휴가 종류 */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--kino-mid)" }}>휴가 종류</label>
            <div className="flex flex-wrap gap-1.5">
              {LEAVE_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLeaveType(t)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-all"
                  style={{
                    background: leaveType === t ? "var(--kino-charcoal)" : "var(--kino-pale)",
                    color: leaveType === t ? "white" : "var(--kino-mid)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value); }}
                className="w-full px-3 py-2 rounded text-xs outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>종료일</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded text-xs outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
                required
              />
            </div>
          </div>

          {/* 계산된 일수 */}
          {startDate && endDate && (
            <div className="px-3 py-2 rounded text-xs" style={{ background: "var(--kino-pale)", color: "var(--kino-charcoal)" }}>
              신청 일수: <strong>{days}일</strong>
              {(leaveType === "연차" || leaveType === "병가" || leaveType === "경조휴가" || leaveType === "기타") && (
                <span className="ml-1" style={{ color: "var(--kino-muted)" }}>(주말 제외)</span>
              )}
            </div>
          )}

          {/* 사유 */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>사유 (선택)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="신청 사유를 입력하세요"
              className="w-full px-3 py-2 rounded text-xs outline-none resize-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full py-2.5 rounded text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: "var(--kino-charcoal)", color: "white", opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            연차 신청 제출
          </button>
        </form>
      )}
    </div>
  );
}

// ── 신청 이력 ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  "대기": { icon: <Clock size={12} />, bg: "#FEF9C3", color: "#92400E" },
  "승인": { icon: <CheckCircle size={12} />, bg: "#F0FDF4", color: "#16A34A" },
  "반려": { icon: <XCircle size={12} />, bg: "#FEF2F2", color: "#DC2626" },
};

function LeaveHistory({ employeeId }: { employeeId: number }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { data: requests, isLoading } = trpc.leave.myRequests.useQuery({ employeeId, year });

  return (
    <div className="portal-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
          <Calendar size={14} style={{ color: "var(--kino-mid)" }} />
          신청 이력
        </h3>
        <div className="flex gap-1">
          {[currentYear - 1, currentYear].map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="px-2 py-0.5 rounded text-xs font-medium transition-colors"
              style={{
                background: year === y ? "var(--kino-charcoal)" : "transparent",
                color: year === y ? "white" : "var(--kino-muted)",
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
      ) : !requests || requests.length === 0 ? (
        <div className="py-6 text-center text-sm" style={{ color: "var(--kino-light)" }}>신청 이력이 없습니다</div>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["대기"];
            return (
              <div
                key={req.id}
                className="flex items-start gap-3 p-3 rounded"
                style={{ background: "var(--kino-pale)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{req.leaveType}</span>
                    <span className="text-xs" style={{ color: "var(--kino-muted)" }}>
                      {req.startDate === req.endDate ? req.startDate : `${req.startDate} ~ ${req.endDate}`}
                    </span>
                    <span className="text-xs font-medium" style={{ color: "var(--kino-mid)" }}>({req.days}일)</span>
                  </div>
                  {req.reason && (
                    <p className="text-xs truncate" style={{ color: "var(--kino-muted)" }}>{req.reason}</p>
                  )}
                  {req.status === "반려" && req.rejectReason && (
                    <p className="text-xs mt-0.5" style={{ color: "#DC2626" }}>반려 사유: {req.rejectReason}</p>
                  )}
                </div>
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold shrink-0"
                  style={{ background: cfg.bg, color: cfg.color }}
                >
                  {cfg.icon}
                  {req.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LeavePage() {
  const [employee, setEmployee] = useState<{ id: number; name: string; department: string; position: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <PortalLayout>
      <div className="container py-4 md:py-6 max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="mb-5">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>연차 신청</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>직원을 선택하고 연차를 신청하세요</p>
        </div>

        {/* 직원 선택 */}
        <div className="portal-card p-4 mb-4">
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--kino-charcoal)" }}>직원 선택</label>
          <EmployeeSelector selected={employee} onSelect={setEmployee} />
        </div>

        {employee ? (
          <div className="flex flex-col gap-4">
            {/* 연차 현황 */}
            <LeaveBalanceCard key={`balance-${refreshKey}`} employeeId={employee.id} />

            {/* 연차 신청 폼 */}
            <LeaveRequestForm employee={employee} onSuccess={() => setRefreshKey(k => k + 1)} />

            {/* 신청 이력 */}
            <LeaveHistory key={`history-${refreshKey}`} employeeId={employee.id} />
          </div>
        ) : (
          <div className="portal-card p-8 text-center">
            <Calendar size={32} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>직원을 선택하면 연차 현황과 신청 폼이 표시됩니다</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

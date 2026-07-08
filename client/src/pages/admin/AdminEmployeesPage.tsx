/**
 * AdminEmployeesPage.tsx — 어드민 직원 관리 페이지
 * - 직원 목록 조회, 등록, 수정, 비활성화
 * - 연차 부여 기능
 * - 재직/퇴사/휴직 상태 관리
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Users, X, Check, Gift, KeyRound, ShieldCheck, ShieldOff,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

type Employee = {
  id: number;
  name: string;
  department: string;
  position: string;
  ext: string | null;
  email: string | null;
  phone: string | null;
  joinDate: string;
  profileImage: string | null;
  isActive: boolean;
  employmentStatus?: string | null;
};

// ── 직원 폼 모달 ──────────────────────────────────────────────────
function EmployeeFormModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: employee?.name ?? "",
    department: employee?.department ?? "",
    position: employee?.position ?? "",
    ext: employee?.ext ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    joinDate: employee?.joinDate ?? new Date().toISOString().split("T")[0],
    profileImage: (employee as Employee | null)?.profileImage ?? "",
    annualLeave: 15,
  });

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      toast.success("직원이 등록되었습니다.");
      utils.employees.list.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("직원 정보가 수정되었습니다.");
      utils.employees.list.invalidate();
      onSaved();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (employee) {
      updateMutation.mutate({
        id: employee.id,
        name: form.name,
        department: form.department,
        position: form.position,
        email: form.email,
        phone: form.phone,
        joinDate: form.joinDate,
        profileImage: form.profileImage || undefined,
      });
    } else {
      createMutation.mutate({ ...form });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-md rounded-lg p-6 shadow-xl" style={{ background: "var(--kino-white)", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
            {employee ? "직원 정보 수정" : "직원 등록"}
          </h3>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {[
            { label: "이름 *", key: "name", type: "text", placeholder: "홍길동" },
            { label: "부서 *", key: "department", type: "text", placeholder: "경영기획팀" },
            { label: "직위 *", key: "position", type: "text", placeholder: "선임" },
            { label: "내선번호", key: "ext", type: "text", placeholder: "1928" },
            { label: "이메일", key: "email", type: "email", placeholder: "hong@kinoton.co.kr" },
            { label: "연락처", key: "phone", type: "tel", placeholder: "010-0000-0000" },
            { label: "입사일 *", key: "joinDate", type: "date", placeholder: "" },
            { label: "프로필 사진 URL", key: "profileImage", type: "url", placeholder: "https://example.com/photo.jpg" },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>{field.label}</label>
              <input
                type={field.type}
                value={form[field.key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                required={field.label.includes("*")}
                className="w-full px-3 py-2 rounded text-xs outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
              />
            </div>
          ))}

          {!employee && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>초기 연차 일수</label>
              <input
                type="number"
                min={0}
                max={365}
                step={0.5}
                value={form.annualLeave}
                onChange={e => setForm(f => ({ ...f, annualLeave: parseFloat(e.target.value) || 15 }))}
                className="w-full px-3 py-2 rounded text-xs outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
              />
            </div>
          )}

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded text-xs font-semibold transition-all"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-1"
              style={{ background: "var(--kino-charcoal)", color: "white", opacity: isPending ? 0.7 : 1 }}
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              {employee ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 비밀번호 설정 모달 ────────────────────────────────────────────
function SetPasswordModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = trpc.auth.setEmployeePassword.useMutation({
    onSuccess: () => {
      toast.success(`${employee.name} 님의 비밀번호가 설정되었습니다.`);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("비밀번호는 6자 이상이어야 합니다."); return; }
    if (password !== confirm) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    mutation.mutate({ employeeId: employee.id, password });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-sm rounded-lg p-6 shadow-xl" style={{ background: "var(--kino-white)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
            비밀번호 설정 — {employee.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>새 비밀번호 (6자 이상)</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full px-3 py-2 rounded text-xs outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              className="w-full px-3 py-2 rounded text-xs outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded text-xs font-semibold" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>취소</button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1"
              style={{ background: "var(--kino-charcoal)", color: "white", opacity: mutation.isPending ? 0.7 : 1 }}
            >
              {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
              설정
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 연차 부여 모달 ────────────────────────────────────────────────
function LeaveGrantModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [totalDays, setTotalDays] = useState(15);

  const { data: balance } = trpc.employees.leaveBalance.useQuery({ employeeId: employee.id, year });

  const mutation = trpc.employees.setLeaveBalance.useMutation({
    onSuccess: () => {
      toast.success("연차가 부여되었습니다.");
      utils.employees.leaveBalance.invalidate();
      utils.employees.allLeaveBalances.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-sm rounded-lg p-6 shadow-xl" style={{ background: "var(--kino-white)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
            연차 부여 — {employee.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>

        {balance && (
          <div className="mb-3 p-3 rounded text-xs" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>
            현재 {year}년: 총 {balance.totalDays}일 / 사용 {balance.usedDays}일 / 잔여 {balance.remainingDays}일
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>연도</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded text-xs outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--kino-mid)" }}>총 연차 일수</label>
            <input
              type="number"
              min={0}
              max={365}
              step={0.5}
              value={totalDays}
              onChange={e => setTotalDays(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded text-xs outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded text-xs font-semibold" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>취소</button>
          <button
            onClick={() => mutation.mutate({ employeeId: employee.id, year, totalDays })}
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "var(--kino-charcoal)", color: "white", opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Gift size={12} />}
            부여
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 재직 상태 변경 모달 ───────────────────────────────────────────
function EmploymentStatusModal({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  // 현재 상태 결정: isActive=false면 퇴사, employmentStatus 우선
  const currentStatus = !employee.isActive
    ? (employee.employmentStatus === "휴직" ? "휴직" : "퇴사")
    : (employee.employmentStatus === "휴직" ? "휴직" : "재직");
  const [status, setStatus] = useState<"재직" | "퇴사" | "휴직">(currentStatus as "재직" | "퇴사" | "휴직");

  const mutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success(`${employee.name} 님의 상태가 변경되었습니다.`);
      utils.employees.list.invalidate();
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    const isActive = status === "재직";
    mutation.mutate({ id: employee.id, isActive, employmentStatus: status });
  };

  const statusConfig = {
    재직: { bg: "#F0FDF4", color: "#16A34A" },
    퇴사: { bg: "#FEF2F2", color: "#DC2626" },
    휴직: { bg: "#FFF7ED", color: "#EA580C" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-sm rounded-lg p-6 shadow-xl" style={{ background: "var(--kino-white)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
            재직 상태 변경 — {employee.name}
          </h3>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "var(--kino-muted)" }}>
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          {(["재직", "퇴사", "휴직"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="flex-1 py-2 rounded text-xs font-semibold border-2 transition-all"
              style={{
                borderColor: status === s ? statusConfig[s].color : "var(--kino-pale)",
                background: status === s ? statusConfig[s].bg : "var(--kino-white)",
                color: status === s ? statusConfig[s].color : "var(--kino-muted)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded text-xs font-semibold" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>취소</button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="flex-1 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1"
            style={{ background: "var(--kino-charcoal)", color: "white", opacity: mutation.isPending ? 0.7 : 1 }}
          >
            {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminEmployeesPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [grantEmployee, setGrantEmployee] = useState<Employee | null>(null);
  const [pwEmployee, setPwEmployee] = useState<Employee | null>(null);
  const [statusEmployee, setStatusEmployee] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: employees, isLoading } = trpc.employees.list.useQuery({ activeOnly: !showInactive });

  // 어드민 권한 목록 조회
  const { data: adminRoles, refetch: refetchAdminRoles } = trpc.employees.getAdminRoles.useQuery();
  const adminOpenIds = new Set((adminRoles ?? []).filter(r => r.role === 'admin').map(r => r.openId));

  const setAdminRoleMutation = trpc.employees.setAdminRole.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isAdmin ? '어드민 권한이 부여되었습니다.' : '어드민 권한이 해제되었습니다.');
      refetchAdminRoles();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggleAdmin = (emp: Employee) => {
    const openId = `emp_${emp.id}`;
    const isCurrentlyAdmin = adminOpenIds.has(openId);
    const action = isCurrentlyAdmin ? '해제' : '부여';
    if (!confirm(`"${emp.name}" 직원의 어드민 권한을 ${action}하시겠습니까?`)) return;
    setAdminRoleMutation.mutate({ employeeId: emp.id, isAdmin: !isCurrentlyAdmin });
  };

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("직원이 삭제되었습니다.");
      utils.employees.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (emp: Employee) => {
    if (!confirm(`"${emp.name}" 직원을 삭제하시겠습니까? 출퇴근 기록도 함께 삭제됩니다.`)) return;
    deleteMutation.mutate({ id: emp.id });
  };

  // 상태 표시 헬퍼
  const getStatusDisplay = (emp: Employee) => {
    if (emp.employmentStatus === "휴직") return { label: "휴직", bg: "#FFF7ED", color: "#EA580C" };
    if (!emp.isActive || emp.employmentStatus === "퇴사") return { label: "퇴사", bg: "#FEF2F2", color: "#DC2626" };
    return { label: "재직", bg: "#F0FDF4", color: "#16A34A" };
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--kino-charcoal)" }}>
              <Users size={18} style={{ color: "var(--kino-mid)" }} />
              직원 관리
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
              직원 등록, 수정, 연차 부여를 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--kino-muted)" }}>
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="rounded"
              />
              비활성 포함
            </label>
            <button
              onClick={() => { setEditEmployee(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-all active:scale-95"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              <Plus size={13} /> 직원 등록
            </button>
          </div>
        </div>

        {/* 직원 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} /></div>
        ) : !employees || employees.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>등록된 직원이 없습니다</p>
            <button
              onClick={() => { setEditEmployee(null); setShowForm(true); }}
              className="mt-3 px-4 py-2 rounded text-xs font-semibold"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              첫 직원 등록하기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--kino-pale)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "var(--kino-pale)", borderBottom: "1px solid var(--kino-pale)" }}>
                  {["이름", "부서", "직위", "입사일", "상태", "권한", "관리"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => {
                  const statusDisplay = getStatusDisplay(emp as Employee);
                  return (
                    <tr
                      key={emp.id}
                      style={{
                        background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA",
                        borderBottom: "1px solid var(--kino-pale)",
                        opacity: emp.isActive ? 1 : 0.6,
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--kino-charcoal)" }}>{emp.name}</td>
                      <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{emp.department}</td>
                      <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{emp.position}</td>
                      <td className="px-4 py-3" style={{ color: "var(--kino-muted)" }}>{emp.joinDate}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setStatusEmployee(emp as Employee)}
                          className="px-2 py-0.5 rounded font-semibold transition-all hover:opacity-80"
                          style={{
                            background: statusDisplay.bg,
                            color: statusDisplay.color,
                          }}
                          title="클릭하여 상태 변경"
                        >
                          {statusDisplay.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const openId = `emp_${emp.id}`;
                          const isAdmin = adminOpenIds.has(openId);
                          return (
                            <button
                              onClick={() => handleToggleAdmin(emp as Employee)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded font-semibold transition-all hover:opacity-80"
                              style={{
                                background: isAdmin ? '#EFF6FF' : 'var(--kino-pale)',
                                color: isAdmin ? '#1D4ED8' : 'var(--kino-muted)',
                              }}
                              title={isAdmin ? '어드민 권한 해제' : '어드민 권한 부여'}
                            >
                              {isAdmin ? <ShieldCheck size={11} /> : <ShieldOff size={11} />}
                              {isAdmin ? '어드민' : '일반'}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPwEmployee(emp as Employee)}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: "#7C3AED" }}
                            title="비밀번호 설정"
                          >
                            <KeyRound size={13} />
                          </button>
                          <button
                            onClick={() => setGrantEmployee(emp as Employee)}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: "#16A34A" }}
                            title="연차 부여"
                          >
                            <Gift size={13} />
                          </button>
                          <button
                            onClick={() => { setEditEmployee(emp as Employee); setShowForm(true); }}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: "var(--kino-mid)" }}
                            title="수정"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp as Employee)}
                            className="p-1.5 rounded transition-colors"
                            style={{ color: "var(--kino-red)" }}
                            title="삭제"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* 직원 등록/수정 모달 */}
      {showForm && (
        <EmployeeFormModal
          employee={editEmployee}
          onClose={() => { setShowForm(false); setEditEmployee(null); }}
          onSaved={() => { setShowForm(false); setEditEmployee(null); }}
        />
      )}

      {/* 연차 부여 모달 */}
      {grantEmployee && (
        <LeaveGrantModal
          employee={grantEmployee}
          onClose={() => setGrantEmployee(null)}
        />
      )}

      {/* 비밀번호 설정 모달 */}
      {pwEmployee && (
        <SetPasswordModal
          employee={pwEmployee}
          onClose={() => setPwEmployee(null)}
        />
      )}

      {/* 재직 상태 변경 모달 */}
      {statusEmployee && (
        <EmploymentStatusModal
          employee={statusEmployee}
          onClose={() => setStatusEmployee(null)}
        />
      )}
    </AdminLayout>
  );
}

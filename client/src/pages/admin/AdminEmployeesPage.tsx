/**
 * AdminEmployeesPage.tsx — 어드민 직원 관리 페이지
 * - 직원 목록 조회, 등록, 수정, 비활성화
 * - 연차 부여 기능
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Loader2, Users, X, Check, Gift,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

type Employee = {
  id: number;
  name: string;
  department: string;
  position: string;
  email: string | null;
  phone: string | null;
  joinDate: string;
  profileImage: string | null;
  isActive: boolean;
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

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminEmployeesPage() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [grantEmployee, setGrantEmployee] = useState<Employee | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: employees, isLoading } = trpc.employees.list.useQuery({ activeOnly: !showInactive });

  const deleteMutation = trpc.employees.delete.useMutation({
    onSuccess: () => {
      toast.success("직원이 삭제되었습니다.");
      utils.employees.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("처리되었습니다.");
      utils.employees.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (emp: Employee) => {
    if (!confirm(`"${emp.name}" 직원을 삭제하시겠습니까? 출퇴근 기록도 함께 삭제됩니다.`)) return;
    deleteMutation.mutate({ id: emp.id });
  };

  const handleDeactivate = (emp: Employee) => {
    const action = emp.isActive ? "비활성화" : "활성화";
    if (!confirm(`"${emp.name}" 직원을 ${action}하시겠습니까?`)) return;
    deactivateMutation.mutate({ id: emp.id, isActive: !emp.isActive });
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
                  {["이름", "부서", "직위", "입사일", "상태", "관리"].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr
                    key={emp.id}
                    style={{
                      background: idx % 2 === 0 ? "var(--kino-white)" : "#FAFAFA",
                      borderBottom: "1px solid var(--kino-pale)",
                      opacity: emp.isActive ? 1 : 0.5,
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--kino-charcoal)" }}>{emp.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{emp.department}</td>
                    <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>{emp.position}</td>
                    <td className="px-4 py-3" style={{ color: "var(--kino-muted)" }}>{emp.joinDate}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: emp.isActive ? "#F0FDF4" : "#F9FAFB",
                          color: emp.isActive ? "#16A34A" : "var(--kino-light)",
                        }}
                      >
                        {emp.isActive ? "재직" : "퇴직"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
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
                          onClick={() => handleDeactivate(emp as Employee)}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: emp.isActive ? "#92400E" : "#16A34A" }}
                          title={emp.isActive ? "비활성화" : "활성화"}
                        >
                          {emp.isActive ? <X size={13} /> : <Check size={13} />}
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
                ))}
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
    </AdminLayout>
  );
}

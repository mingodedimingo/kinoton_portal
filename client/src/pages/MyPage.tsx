/**
 * MyPage.tsx — 마이페이지
 * - 내 프로필 정보 (이름, 부서, 직위, 이메일)
 * - 연차 현황 (총/사용/잔여)
 * - 최근 출퇴근 이력
 * - 연차 신청 이력
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  User, Mail, Building2, Briefcase, Calendar,
  LogIn, LogOut, Clock, CheckCircle, XCircle,
  ChevronRight, FileText,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  "대기":  { bg: "#FEF9C3", color: "#92400E",  icon: <Clock size={11} /> },
  "승인":  { bg: "#F0FDF4", color: "#16A34A",  icon: <CheckCircle size={11} /> },
  "반려":  { bg: "#FEF2F2", color: "#DC2626",  icon: <XCircle size={11} /> },
};

export default function MyPage() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  // 직원 목록
  const { data: employees } = trpc.employees.list.useQuery({ activeOnly: true });

  // 선택된 직원 정보
  const employee = employees?.find(e => e.id === selectedEmployee) ?? employees?.[0] ?? null;
  const employeeId = employee?.id ?? null;

  // 연차 잔액
  const { data: leaveBalance } = trpc.employees.leaveBalance.useQuery(
    { employeeId: employeeId!, year: currentYear },
    { enabled: !!employeeId }
  );

  // 내 연차 신청 이력
  const { data: leaveRequests } = trpc.leave.myRequests.useQuery(
    { employeeId: employeeId!, year: currentYear },
    { enabled: !!employeeId }
  );

  // 최근 출퇴근 이력 (7일)
  const [today] = useState(() => new Date());
  const [weekAgo] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const { data: attendanceLogs } = trpc.attendance.myHistory.useQuery(
    { employeeName: employee?.name ?? "", days: 7 },
    { enabled: !!employee }
  );

  return (
    <PortalLayout>
      <div className="container py-6">
        <h1 className="text-lg font-bold mb-5" style={{ color: "var(--kino-charcoal)" }}>마이페이지</h1>

        {/* 직원 선택 */}
        <div className="portal-card mb-4 p-4">
          <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--kino-mid)" }}>직원 선택</label>
          <select
            value={selectedEmployee ?? employee?.id ?? ""}
            onChange={e => setSelectedEmployee(Number(e.target.value))}
            className="w-full px-3 py-2 rounded text-sm outline-none"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-white)" }}
          >
            {employees?.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.department} · {emp.position})</option>
            ))}
          </select>
        </div>

        {employee ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 좌측: 프로필 카드 */}
            <div className="portal-card p-5 flex flex-col items-center text-center">
              {employee.profileImage ? (
                <img
                  src={employee.profileImage}
                  alt={employee.name}
                  className="w-20 h-20 rounded-full object-cover mb-3"
                  style={{ border: "2px solid var(--kino-pale)" }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-3"
                  style={{ background: "var(--kino-pale)", border: "2px solid var(--kino-pale)" }}
                >
                  <User size={36} style={{ color: "var(--kino-mid)" }} />
                </div>
              )}
              <p className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>{employee.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{employee.department} · {employee.position}</p>

              <div className="w-full mt-4 flex flex-col gap-2">
                {employee.email && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                    <Mail size={12} />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                  <Building2 size={12} />
                  <span>{employee.department}</span>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                  <Briefcase size={12} />
                  <span>{employee.position}</span>
                </div>
                {employee.joinDate && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--kino-mid)" }}>
                    <Calendar size={12} />
                    <span>입사일: {employee.joinDate}</span>
                  </div>
                )}
              </div>

              <Link href="/leave" className="mt-4 w-full">
                <button
                  className="w-full py-2 rounded text-xs font-semibold text-white transition-all active:scale-95"
                  style={{ background: "var(--kino-charcoal)" }}
                >
                  연차 신청하기
                </button>
              </Link>
            </div>

            {/* 우측: 연차 현황 + 이력 */}
            <div className="md:col-span-2 flex flex-col gap-4">
              {/* 연차 현황 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <Calendar size={14} style={{ color: "var(--kino-mid)" }} />
                    {currentYear}년 연차 현황
                  </span>
                  <Link href="/leave" className="section-more flex items-center gap-0.5">
                    신청 이력 <ChevronRight size={12} />
                  </Link>
                </div>
                {leaveBalance ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {[
                        { label: "총 연차", value: `${leaveBalance.totalDays}일`, color: "var(--kino-charcoal)" },
                        { label: "사용", value: `${leaveBalance.usedDays}일`, color: "var(--kino-mid)" },
                        { label: "잔여", value: `${leaveBalance.remainingDays}일`, color: leaveBalance.remainingDays <= 3 ? "var(--kino-red)" : "#16A34A" },
                      ].map(s => (
                        <div key={s.label} className="text-center py-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                          <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: "6px", background: "var(--kino-pale)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${leaveBalance.totalDays > 0 ? Math.min(100, (leaveBalance.usedDays / leaveBalance.totalDays) * 100) : 0}%`,
                          background: "var(--kino-charcoal)",
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1.5 text-right" style={{ color: "var(--kino-muted)" }}>
                      사용률 {leaveBalance.totalDays > 0 ? ((leaveBalance.usedDays / leaveBalance.totalDays) * 100).toFixed(0) : 0}%
                    </p>
                  </>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>연차 정보가 없습니다. 어드민에서 연차를 부여해주세요.</p>
                )}
              </div>

              {/* 최근 연차 신청 이력 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <FileText size={14} style={{ color: "var(--kino-mid)" }} />
                    최근 연차 신청
                  </span>
                </div>
                {leaveRequests && leaveRequests.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {leaveRequests.slice(0, 5).map(req => {
                      const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG["대기"];
                      return (
                        <div key={req.id} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon}{req.status}
                          </span>
                          <span className="text-xs font-medium flex-1" style={{ color: "var(--kino-charcoal)" }}>{req.leaveType}</span>
                          <span className="text-xs" style={{ color: "var(--kino-muted)" }}>
                            {req.startDate === req.endDate ? req.startDate : `${req.startDate}~${req.endDate}`}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{req.days}일</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>신청 이력이 없습니다.</p>
                )}
              </div>

              {/* 최근 출퇴근 이력 */}
              <div className="portal-card p-4">
                <div className="section-header mb-3">
                  <span className="section-title flex items-center gap-1.5">
                    <Clock size={14} style={{ color: "var(--kino-mid)" }} />
                    최근 7일 출퇴근
                  </span>
                </div>
                {attendanceLogs && attendanceLogs.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {attendanceLogs.slice(0, 7).map((log, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--kino-bg)" }}>
                        <span className="text-xs font-semibold w-24" style={{ color: "var(--kino-charcoal)" }}>{log.date}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}>{log.workType}</span>
                        <div className="flex items-center gap-2 flex-1">
                          {log.checkIn && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "#16A34A" }}>
                              <LogIn size={11} /> {log.checkIn}
                            </span>
                          )}
                          {log.checkOut && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                              <LogOut size={11} /> {log.checkOut}
                            </span>
                          )}
                        </div>
                        {log.workHours && (
                          <span className="text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{log.workHours}h</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs py-4 text-center" style={{ color: "var(--kino-muted)" }}>출퇴근 기록이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="portal-card p-12 text-center">
            <User size={48} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
            <p className="text-sm" style={{ color: "var(--kino-muted)" }}>직원 정보가 없습니다. 어드민에서 직원을 등록해주세요.</p>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

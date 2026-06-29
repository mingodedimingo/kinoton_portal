/**
 * AttendancePage.tsx — 출퇴근 기록 관리 페이지
 * - 오늘 출퇴근 상태 표시 및 출근/퇴근 버튼
 * - 내근/외근 선택
 * - 최근 30일 출퇴근 이력 조회
 * - 월별 근무 통계 (출근일수, 총 근무시간)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import {
  LogIn, LogOut, Building2, MapPin, Clock, Calendar,
  Loader2, CheckCircle, AlertCircle, BarChart2, User,
} from "lucide-react";

// ── 유틸 함수 ─────────────────────────────────────────────────────
function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${dateStr.replace(/-/g, ".")} (${days[d.getDay()]})`;
}

function calcWorkHours(checkIn: string | null, checkOut: string | null): string {
  if (!checkIn || !checkOut) return "-";
  const [ih, im] = checkIn.split(":").map(Number);
  const [oh, om] = checkOut.split(":").map(Number);
  const mins = (oh * 60 + om) - (ih * 60 + im);
  if (mins <= 0) return "-";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function getTodayString(): string {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})`;
}

// ── 출퇴근 버튼 섹션 ──────────────────────────────────────────────
function AttendanceControl({ employee }: {
  employee: { id: number; name: string; department: string; position: string } | null;
}) {
  const utils = trpc.useUtils();
  const [workType, setWorkType] = useState<"내근" | "외근">("내근");

  const { data: todayStatus, isLoading } = trpc.attendance.todayStatus.useQuery(
    { employeeName: employee?.name ?? "" },
    { enabled: !!employee, refetchOnWindowFocus: true }
  );

  const recordMutation = trpc.attendance.record.useMutation({
    onSuccess: (data) => {
      utils.attendance.todayStatus.invalidate();
      utils.attendance.myHistory.invalidate();
      if (data.type === "checkin") {
        toast.success("출근 처리가 완료되었습니다.");
      } else {
        toast.success("퇴근 처리가 완료되었습니다.");
      }
    },
    onError: (err) => {
      toast.error(err.message || "처리에 실패했습니다.");
    },
  });

  const checkedIn = !!todayStatus?.checkin;
  const checkedOut = !!todayStatus?.checkout;
  const isPending = recordMutation.isPending;

  const handleCheckin = () => {
    if (!employee) { toast.error("직원 정보를 찾을 수 없습니다."); return; }
    recordMutation.mutate({
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      position: employee.position,
      type: "checkin",
      workType: workType === "내근" ? "office" : "field",
    });
  };

  const handleCheckout = () => {
    if (!employee) { toast.error("직원 정보를 찾을 수 없습니다."); return; }
    recordMutation.mutate({
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      position: employee.position,
      type: "checkout",
      workType: workType === "내근" ? "office" : "field",
    });
  };

  // 상태 배지
  const statusLabel = isLoading ? "조회 중" : checkedIn ? (checkedOut ? "퇴근" : "출근 중") : "미출근";
  const statusBg = checkedIn ? (checkedOut ? "#F3F4F6" : "#F0FDF4") : "#FEF2F2";
  const statusColor = checkedIn ? (checkedOut ? "#6B7280" : "#16A34A") : "#DC2626";

  if (!employee) {
    return (
      <div className="portal-card p-8 text-center">
        <User size={40} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
        <p className="text-sm mb-1" style={{ color: "var(--kino-muted)" }}>직원 정보와 연결되지 않은 계정입니다.</p>
        <p className="text-xs" style={{ color: "var(--kino-light)" }}>관리자에게 직원 이메일 등록을 요청해주세요.</p>
      </div>
    );
  }

  return (
    <div className="portal-card p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
            {getTodayString()}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
            {employee.department} · {employee.position} {employee.name}
          </p>
        </div>
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: statusBg, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* 출근/퇴근 시간 표시 */}
      {(todayStatus?.checkin || todayStatus?.checkout) && (
        <div
          className="flex items-center gap-4 px-4 py-2.5 rounded-lg mb-4 text-xs"
          style={{ background: "var(--kino-bg)" }}
        >
          {todayStatus.checkin && (
            <span className="flex items-center gap-1.5" style={{ color: "#16A34A" }}>
              <LogIn size={13} />
              <span className="font-semibold">출근</span>
              {formatTime(todayStatus.checkin.recordedAt)}
            </span>
          )}
          {todayStatus.checkin && todayStatus.checkout && (
            <span style={{ color: "var(--kino-pale)" }}>|</span>
          )}
          {todayStatus.checkout && (
            <span className="flex items-center gap-1.5" style={{ color: "var(--kino-mid)" }}>
              <LogOut size={13} />
              <span className="font-semibold">퇴근</span>
              {formatTime(todayStatus.checkout.recordedAt)}
            </span>
          )}
          {todayStatus.checkin && todayStatus.checkout && (
            <>
              <span style={{ color: "var(--kino-pale)" }}>|</span>
              <span className="flex items-center gap-1" style={{ color: "var(--kino-charcoal)" }}>
                <Clock size={11} />
                {calcWorkHours(
                  formatTime(todayStatus.checkin.recordedAt),
                  formatTime(todayStatus.checkout.recordedAt)
                )}
              </span>
            </>
          )}
        </div>
      )}

      {/* 내근 / 외근 선택 */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {(["내근", "외근"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setWorkType(t)}
            disabled={checkedIn}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              border: `1.5px solid ${workType === t ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
              background: workType === t ? "var(--kino-charcoal)" : "transparent",
              color: workType === t ? "white" : "var(--kino-mid)",
              opacity: checkedIn ? 0.5 : 1,
              cursor: checkedIn ? "not-allowed" : "pointer",
            }}
          >
            {t === "내근" ? <Building2 size={14} /> : <MapPin size={14} />}
            {t}
          </button>
        ))}
      </div>

      {/* 출근 / 퇴근 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCheckin}
          disabled={checkedIn || isPending || isLoading}
          className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all active:scale-95"
          style={{
            background: checkedIn ? "var(--kino-pale)" : "var(--kino-charcoal)",
            color: checkedIn ? "var(--kino-muted)" : "white",
            opacity: checkedIn ? 0.6 : 1,
            cursor: (checkedIn || isPending) ? "not-allowed" : "pointer",
          }}
        >
          {isPending && !checkedIn ? (
            <Loader2 size={14} className="animate-spin" />
          ) : checkedIn ? (
            <CheckCircle size={14} />
          ) : (
            <LogIn size={14} />
          )}
          출근
        </button>
        <button
          onClick={handleCheckout}
          disabled={!checkedIn || checkedOut || isPending || isLoading}
          className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all active:scale-95"
          style={{
            border: "1.5px solid var(--kino-pale)",
            background: (checkedIn && !checkedOut) ? "white" : "transparent",
            color: (!checkedIn || checkedOut) ? "var(--kino-light)" : "var(--kino-charcoal)",
            opacity: (!checkedIn || checkedOut) ? 0.5 : 1,
            cursor: (!checkedIn || checkedOut || isPending) ? "not-allowed" : "pointer",
          }}
        >
          {isPending && checkedIn && !checkedOut ? (
            <Loader2 size={14} className="animate-spin" />
          ) : checkedOut ? (
            <CheckCircle size={14} />
          ) : (
            <LogOut size={14} />
          )}
          퇴근
        </button>
      </div>
    </div>
  );
}

// ── 지각/조퇴 판별 헬퍼 ─────────────────────────────────────────
function isLate(checkIn: string | null): boolean {
  if (!checkIn) return false;
  const [h, m] = checkIn.split(":").map(Number);
  return h > 9 || (h === 9 && m > 0);
}

function isEarlyLeave(checkOut: string | null): boolean {
  if (!checkOut) return false;
  const [h] = checkOut.split(":").map(Number);
  return h < 18;
}

// ── 출퇴근 이력 섹션 ──────────────────────────────────────────────
function AttendanceHistory({ employeeName }: { employeeName: string }) {
  const [days, setDays] = useState(30);

  const { data: logs, isLoading } = trpc.attendance.myHistory.useQuery(
    { employeeName, days },
    { enabled: !!employeeName }
  );

  // 월별 통계 계산
  const monthlyStats = useMemo(() => {
    if (!logs) return null;
    const stats: Record<string, { month: string; workDays: number; totalMinutes: number }> = {};
    for (const log of logs) {
      const month = log.date.substring(0, 7); // YYYY-MM
      if (!stats[month]) stats[month] = { month, workDays: 0, totalMinutes: 0 };
      stats[month].workDays++;
      if (log.checkIn && log.checkOut) {
        const [ih, im] = log.checkIn.split(":").map(Number);
        const [oh, om] = log.checkOut.split(":").map(Number);
        const mins = (oh * 60 + om) - (ih * 60 + im);
        if (mins > 0) stats[month].totalMinutes += mins;
      }
    }
    return Object.values(stats).sort((a, b) => b.month.localeCompare(a.month));
  }, [logs]);

  return (
    <div className="flex flex-col gap-4">
      {/* 기간 선택 */}
      <div className="portal-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--kino-charcoal)" }}>
            <Calendar size={14} style={{ color: "var(--kino-mid)" }} />
            출퇴근 이력
          </span>
          <div className="flex gap-1.5">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: days === d ? "var(--kino-charcoal)" : "transparent",
                  color: days === d ? "white" : "var(--kino-muted)",
                  border: `1px solid ${days === d ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
                }}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="flex flex-col gap-1">
            {/* 헤더 */}
            <div
              className="grid gap-2 px-3 py-2 text-xs font-semibold rounded"
              style={{
                gridTemplateColumns: "1fr 52px 72px 72px 72px 80px",
                color: "var(--kino-muted)",
                background: "var(--kino-bg)",
              }}
            >
              <span>날짜</span>
              <span>근무형태</span>
              <span>출근</span>
              <span>퇴근</span>
              <span>근무시간</span>
              <span>비고</span>
            </div>
            {logs.map((log, idx) => {
              const late = isLate(log.checkIn);
              const early = isEarlyLeave(log.checkOut);
              const hasBadge = late || early;
              return (
                <div
                  key={idx}
                  className="grid gap-2 px-3 py-2.5 rounded-lg text-xs items-center"
                  style={{
                    gridTemplateColumns: "1fr 52px 72px 72px 72px 80px",
                    background: idx % 2 === 0 ? "transparent" : "var(--kino-bg)",
                  }}
                >
                  <span className="font-medium" style={{ color: "var(--kino-charcoal)" }}>
                    {formatDate(log.date)}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-center"
                    style={{
                      background: log.workType === "내근" ? "#EFF6FF" : "#F0FDF4",
                      color: log.workType === "내근" ? "#1D4ED8" : "#16A34A",
                      fontSize: "0.65rem",
                      width: "fit-content",
                    }}
                  >
                    {log.workType}
                  </span>
                  {/* 출근 시간 + 지각 배지 */}
                  <span className="flex items-center gap-1">
                    <span style={{ color: late ? "#DC2626" : "#16A34A", fontWeight: late ? 700 : 400 }}>
                      {log.checkIn || "-"}
                    </span>
                    {late && (
                      <span
                        className="px-1 py-0.5 rounded font-bold"
                        style={{ background: "#FEE2E2", color: "#DC2626", fontSize: "0.6rem", lineHeight: 1 }}
                      >
                        지각
                      </span>
                    )}
                  </span>
                  {/* 퇴근 시간 + 조퇴 배지 */}
                  <span className="flex items-center gap-1">
                    <span style={{ color: early ? "#F59E0B" : "var(--kino-mid)", fontWeight: early ? 700 : 400 }}>
                      {log.checkOut || "-"}
                    </span>
                    {early && log.checkOut && (
                      <span
                        className="px-1 py-0.5 rounded font-bold"
                        style={{ background: "#FEF3C7", color: "#B45309", fontSize: "0.6rem", lineHeight: 1 }}
                      >
                        조퇴
                      </span>
                    )}
                  </span>
                  <span className="font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                    {log.workHours ? `${log.workHours}h` : "-"}
                  </span>
                  {/* 비고 열: 지각/조퇴 요약 */}
                  <span>
                    {hasBadge ? (
                      <span className="flex gap-1 flex-wrap">
                        {late && (
                          <span
                            className="px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "#FEE2E2", color: "#DC2626", fontSize: "0.6rem" }}
                          >
                            지각
                          </span>
                        )}
                        {early && log.checkOut && (
                          <span
                            className="px-1.5 py-0.5 rounded font-semibold"
                            style={{ background: "#FEF3C7", color: "#B45309", fontSize: "0.6rem" }}
                          >
                            조퇴
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "#16A34A", fontSize: "0.65rem" }}>정상</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle size={32} className="mx-auto mb-2" style={{ color: "var(--kino-pale)" }} />
            <p className="text-xs" style={{ color: "var(--kino-muted)" }}>출퇴근 기록이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 월별 통계 */}
      {monthlyStats && monthlyStats.length > 0 && (
        <div className="portal-card p-4">
          <span className="text-sm font-semibold flex items-center gap-1.5 mb-3" style={{ color: "var(--kino-charcoal)" }}>
            <BarChart2 size={14} style={{ color: "var(--kino-mid)" }} />
            월별 통계
          </span>
          <div className="flex flex-col gap-2">
            {monthlyStats.map((stat) => {
              const totalH = Math.floor(stat.totalMinutes / 60);
              const totalM = stat.totalMinutes % 60;
              const workHoursStr = stat.totalMinutes > 0
                ? (totalM > 0 ? `${totalH}시간 ${totalM}분` : `${totalH}시간`)
                : "-";
              return (
                <div
                  key={stat.month}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{ background: "var(--kino-bg)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                    {stat.month.replace("-", "년 ")}월
                  </span>
                  <div className="flex items-center gap-4 text-xs">
                    <span style={{ color: "var(--kino-mid)" }}>
                      출근 <span className="font-bold" style={{ color: "var(--kino-charcoal)" }}>{stat.workDays}일</span>
                    </span>
                    <span style={{ color: "var(--kino-mid)" }}>
                      총 근무 <span className="font-bold" style={{ color: "var(--kino-charcoal)" }}>{workHoursStr}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function AttendancePage() {
  const { data: employee, isLoading: empLoading } = trpc.employees.me.useQuery();

  const empInfo = employee
    ? { id: employee.id, name: employee.name, department: employee.department, position: employee.position }
    : null;

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 페이지 헤더 */}
        <div className="mb-5">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--kino-charcoal)" }}>
            <Clock size={20} />
            출퇴근 관리
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>
            출근·퇴근 기록 및 근무 이력을 확인합니다.
          </p>
        </div>

        {empLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 출퇴근 버튼 */}
            <AttendanceControl employee={empInfo} />

            {/* 출퇴근 이력 */}
            {employee && (
              <AttendanceHistory employeeName={employee.name} />
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

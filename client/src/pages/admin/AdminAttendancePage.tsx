/**
 * AdminAttendancePage — 출퇴근 관리 (어드민 레이아웃)
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Users, LogIn, LogOut, Clock, Search, RefreshCw, Building2, MapPin } from "lucide-react";

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateString(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function calcWorkMinutes(checkin: Date | string | null | undefined, checkout: Date | string | null | undefined): string {
  if (!checkin || !checkout) return "-";
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  if (diff <= 0) return "-";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}시간 ${mins}분`;
}

export default function AdminAttendancePage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [deptFilter, setDeptFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  const queryDate = useMemo(() => fromDateString(selectedDate), [selectedDate]);

  const { data: logs, isLoading, refetch } = trpc.attendance.adminList.useQuery({
    date: queryDate,
    department: deptFilter || undefined,
    employeeName: nameFilter || undefined,
  });

  const { data: summary } = trpc.attendance.todaySummary.useQuery();

  // 직원별 출퇴근 정리
  const employeeMap = useMemo(() => {
    if (!logs) return [];
    const map = new Map<string, {
      name: string; dept: string; position: string;
      checkin: (typeof logs)[0] | null;
      checkout: (typeof logs)[0] | null;
      workType: string;
    }>();
    for (const log of logs) {
      if (!map.has(log.employeeName)) {
        map.set(log.employeeName, {
          name: log.employeeName,
          dept: log.department ?? "",
          position: log.position ?? "",
          checkin: null,
          checkout: null,
          workType: log.workType,
        });
      }
      const entry = map.get(log.employeeName)!;
      if (log.type === "checkin" && !entry.checkin) entry.checkin = log;
      if (log.type === "checkout" && !entry.checkout) entry.checkout = log;
    }
    return Array.from(map.values());
  }, [logs]);

  const isToday = selectedDate === toDateString(today);

  return (
    <AdminLayout title="출퇴근 관리">
      {/* 요약 카드 (오늘만) */}
      {isToday && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: LogIn, label: "오늘 출근", value: summary?.totalCheckin ?? 0, color: "#1A1A1A" },
            { icon: Users, label: "현재 재실", value: summary?.currentlyIn ?? 0, color: "#374151" },
            { icon: LogOut, label: "오늘 퇴근", value: summary?.totalCheckout ?? 0, color: "#6B7280" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="rounded-lg p-3 flex items-center gap-3"
              style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}>
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: color }}>
                <Icon size={14} color="white" />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--kino-muted)" }}>{label}</p>
                <p className="text-xl font-bold" style={{ color: "var(--kino-charcoal)" }}>{value}<span className="text-xs font-normal ml-0.5">명</span></p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 필터 */}
      <div className="rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end"
        style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>날짜</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>부서</label>
          <input
            type="text"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            placeholder="부서명 입력"
            className="px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)", width: "140px" }}
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>이름</label>
          <input
            type="text"
            value={nameFilter}
            onChange={e => setNameFilter(e.target.value)}
            placeholder="이름 입력"
            className="px-3 py-2 rounded-md text-sm outline-none"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)", width: "120px" }}
          />
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all active:scale-95"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)", background: "var(--kino-bg)" }}
        >
          <RefreshCw size={13} /> 새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="flex flex-col items-center gap-2">
              <Clock size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
              <p className="text-xs" style={{ color: "var(--kino-muted)" }}>조회 중...</p>
            </div>
          </div>
        ) : employeeMap.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: "var(--kino-light)" }}>
              {selectedDate} 출퇴근 기록이 없습니다
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--kino-pale)" }}>
                {["이름", "부서/직위", "근무형태", "출근", "퇴근", "근무시간", "상태"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeMap.map((emp, i) => {
                const isIn = !!emp.checkin && !emp.checkout;
                return (
                  <tr key={emp.name} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--kino-charcoal)" }}>{emp.name}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                      {emp.dept && <span>{emp.dept}</span>}
                      {emp.dept && emp.position && <span> · </span>}
                      {emp.position && <span>{emp.position}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                        {emp.workType === "office" ? <Building2 size={11} /> : <MapPin size={11} />}
                        {emp.workType === "office" ? "내근" : "외근"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: emp.checkin ? "#16A34A" : "var(--kino-light)" }}>
                      {formatTime(emp.checkin?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: emp.checkout ? "var(--kino-charcoal)" : "var(--kino-light)" }}>
                      {formatTime(emp.checkout?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                      {calcWorkMinutes(emp.checkin?.recordedAt, emp.checkout?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{
                          background: isIn ? "#F0FDF4" : emp.checkout ? "var(--kino-pale)" : "#FEF9C3",
                          color: isIn ? "#16A34A" : emp.checkout ? "var(--kino-mid)" : "#92400E",
                        }}
                      >
                        {isIn ? "재실" : emp.checkout ? "퇴근" : "미출근"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs mt-3 text-right" style={{ color: "var(--kino-light)" }}>
        총 {employeeMap.length}명 · 원시 로그 {logs?.length ?? 0}건
      </p>
    </AdminLayout>
  );
}

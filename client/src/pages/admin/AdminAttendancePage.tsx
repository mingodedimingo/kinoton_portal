/**
 * AdminAttendancePage — 출퇴근 관리 (어드민 레이아웃)
 * - 일별 출퇴근 현황 조회
 * - 월별 집계 (출근일수, 지각, 조퇴)
 * - 이카운트 업로드용 CSV 내보내기
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { toast } from "sonner";
import {
  Users, LogIn, LogOut, Clock, RefreshCw,
  Building2, MapPin, Download, Calendar, BarChart2,
} from "lucide-react";

// ── 유틸 함수 ─────────────────────────────────────────────────────
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function fromDateString(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  // KST 변환 (UTC+9)
  const d = new Date(new Date(date).getTime() + 9 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
function calcWorkMinutes(checkin: Date | string | null | undefined, checkout: Date | string | null | undefined): string {
  if (!checkin || !checkout) return "-";
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  if (diff <= 0) return "-";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}시간 ${mins}분`;
}
// 지각 여부 (09:00 이후 출근) - KST 기준
function isLate(checkin: Date | string | null | undefined): boolean {
  if (!checkin) return false;
  const d = new Date(new Date(checkin).getTime() + 9 * 60 * 60 * 1000);
  return d.getUTCHours() > 9 || (d.getUTCHours() === 9 && d.getUTCMinutes() > 0);
}
// 조퇴 여부 (18:00 이전 퇴근) - KST 기준
function isEarlyLeave(checkout: Date | string | null | undefined): boolean {
  if (!checkout) return false;
  const d = new Date(new Date(checkout).getTime() + 9 * 60 * 60 * 1000);
  return d.getUTCHours() < 18;
}

// ── 일별 현황 탭 ──────────────────────────────────────────────────
function DailyTab() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useRange, setUseRange] = useState(false);
  const [deptFilter, setDeptFilter] = useState("");
  const [nameFilter, setNameFilter] = useState("");

  const queryDate = useMemo(() => fromDateString(selectedDate), [selectedDate]);
  const queryStartDate = useMemo(() => startDate ? fromDateString(startDate) : undefined, [startDate]);
  const queryEndDate = useMemo(() => endDate ? fromDateString(endDate) : undefined, [endDate]);

  const { data: logs, isLoading, refetch } = trpc.attendance.adminList.useQuery(
    useRange && startDate && endDate
      ? { startDate: queryStartDate, endDate: queryEndDate, department: deptFilter || undefined, employeeName: nameFilter || undefined }
      : { date: queryDate, department: deptFilter || undefined, employeeName: nameFilter || undefined }
  );
  const { data: summary } = trpc.attendance.todaySummary.useQuery();

  // 날짜 범위 모드: 날짜별 전체 로그 목록
  const rangeLogList = useMemo(() => {
    if (!useRange || !logs) return [];
    return logs.map(log => {
      const kstDate = new Date(new Date(log.recordedAt).getTime() + 9 * 60 * 60 * 1000);
      return {
        ...log,
        dateStr: kstDate.toISOString().substring(0, 10),
        timeStr: `${String(kstDate.getUTCHours()).padStart(2, '0')}:${String(kstDate.getUTCMinutes()).padStart(2, '0')}`,
      };
    });
  }, [logs, useRange]);

  const employeeMap = useMemo(() => {
    if (useRange || !logs) return [];
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
  }, [logs, useRange]);

  const isToday = !useRange && selectedDate === toDateString(today);

  // CSV 내보내기 (이카운트 근태 업로드 형식)
  const handleExportCSV = async () => {
    if (employeeMap.length === 0) {
      toast.error("내보낼 데이터가 없습니다.");
      return;
    }
    const headers = ["사원명", "부서", "직위", "날짜", "출근시간", "퇴근시간", "근무형태", "근무시간", "지각여부", "조퇴여부"];
    const rows = employeeMap.map(emp => [
      emp.name,
      emp.dept,
      emp.position,
      selectedDate,
      formatTime(emp.checkin?.recordedAt),
      formatTime(emp.checkout?.recordedAt),
      emp.workType === "office" ? "내근" : "외근",
      calcWorkMinutes(emp.checkin?.recordedAt, emp.checkout?.recordedAt),
      isLate(emp.checkin?.recordedAt) ? "Y" : "N",
      isEarlyLeave(emp.checkout?.recordedAt) ? "Y" : "N",
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `출퇴근현황_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV 파일이 다운로드되었습니다.");
  };

  return (
    <div>
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
                <p className="text-xl font-bold" style={{ color: "var(--kino-charcoal)" }}>
                  {value}<span className="text-xs font-normal ml-0.5">명</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 필터 + CSV */}
      <div className="rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end justify-between"
        style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}>
        <div className="flex flex-wrap gap-3 items-end">
          {/* 단일 / 범위 토글 */}
          <div className="flex items-center gap-2 mr-1">
            <button
              onClick={() => setUseRange(false)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ background: !useRange ? "var(--kino-charcoal)" : "var(--kino-bg)", color: !useRange ? "white" : "var(--kino-mid)", border: "1px solid var(--kino-pale)" }}
            >단일</button>
            <button
              onClick={() => setUseRange(true)}
              className="px-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{ background: useRange ? "var(--kino-charcoal)" : "var(--kino-bg)", color: useRange ? "white" : "var(--kino-mid)", border: "1px solid var(--kino-pale)" }}
            >기간</button>
          </div>
          {!useRange ? (
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
          ) : (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-3 py-2 rounded-md text-sm outline-none"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
              />
            </div>
          </>
          )}
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
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
          style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)", background: "var(--kino-bg)" }}
        >
          <Download size={13} /> CSV 내보내기
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
        ) : useRange ? (
          /* 기간 모드: 날짜 코럼 포함 원시 로그 목록 */
          rangeLogList.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm" style={{ color: "var(--kino-light)" }}>
                {startDate} ~ {endDate} 기간에 출퇴근 기록이 없습니다
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--kino-pale)" }}>
                  {["날짜", "이름", "부서/직위", "구분", "시간", "근무형태"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rangeLogList.map((log, i) => (
                  <tr key={log.id} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{log.dateStr}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--kino-charcoal)" }}>{log.employeeName}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                      {log.department ?? ""}{log.department && log.position ? " · " : ""}{log.position ?? ""}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold`} style={{ background: log.type === 'checkin' ? '#F0FDF4' : '#EFF6FF', color: log.type === 'checkin' ? '#16A34A' : '#1D4ED8' }}>
                        {log.type === 'checkin' ? '출근' : '퇴근'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: "var(--kino-charcoal)" }}>{log.timeStr}</td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                        {log.workType === "office" ? <Building2 size={11} /> : <MapPin size={11} />}
                        {log.workType === "office" ? "내근" : "외근"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
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
                {["날짜", "이름", "부서/직위", "근무형태", "출근", "퇴근", "근무시간", "지각", "조퇴", "상태"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeMap.map((emp, i) => {
                const isIn = !!emp.checkin && !emp.checkout;
                const late = isLate(emp.checkin?.recordedAt);
                const early = isEarlyLeave(emp.checkout?.recordedAt);
                return (
                  <tr key={emp.name} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-charcoal)" }}>{selectedDate}</td>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--kino-charcoal)" }}>{emp.name}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                      {emp.dept}{emp.dept && emp.position ? " · " : ""}{emp.position}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                        {emp.workType === "office" ? <Building2 size={11} /> : <MapPin size={11} />}
                        {emp.workType === "office" ? "내근" : "외근"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: emp.checkin ? (late ? "#DC2626" : "#16A34A") : "var(--kino-light)" }}>
                      {formatTime(emp.checkin?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium" style={{ color: emp.checkout ? (early ? "#F59E0B" : "var(--kino-charcoal)") : "var(--kino-light)" }}>
                      {formatTime(emp.checkout?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>
                      {calcWorkMinutes(emp.checkin?.recordedAt, emp.checkout?.recordedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {emp.checkin ? (
                        <span style={{ color: late ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
                          {late ? "지각" : "정상"}
                        </span>
                      ) : <span style={{ color: "var(--kino-light)" }}>-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {emp.checkout ? (
                        <span style={{ color: early ? "#F59E0B" : "#16A34A", fontWeight: 600 }}>
                          {early ? "조퇴" : "정상"}
                        </span>
                      ) : <span style={{ color: "var(--kino-light)" }}>-</span>}
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
    </div>
  );
}

// ── 월별 집계 탭 ──────────────────────────────────────────────────
function MonthlyTab() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  // 해당 월의 시작일~종료일 계산 (KST 기준 00:00:00 ~ 23:59:59)
  const { startDate, endDate } = useMemo(() => {
    const yyyy = year;
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, '0');
    const start = new Date(`${yyyy}-${mm}-01T00:00:00+09:00`);
    const end = new Date(`${yyyy}-${mm}-${dd}T23:59:59+09:00`);
    return { startDate: start, endDate: end };
  }, [year, month]);

  const { data: logs, isLoading } = trpc.attendance.adminList.useQuery({
    date: startDate,
    // 월 전체를 가져오기 위해 날짜 필터 없이 조회 (백엔드에서 날짜 범위 지원 필요)
    // 현재 adminList는 하루 단위이므로 exportCsv를 활용
  }, { enabled: false }); // 월별은 exportCsv 사용

  const { data: csvData, isLoading: csvLoading, refetch: fetchCsv } = trpc.attendance.exportCsv.useQuery(
    { startDate, endDate },
    { enabled: false }
  );

  // 월별 집계 데이터 파싱
  const monthlyStats = useMemo(() => {
    if (!csvData?.csv) return [];
    const lines = csvData.csv.split("\n").slice(1); // 헤더 제외
    const empMap = new Map<string, {
      name: string; dept: string; position: string;
      workDays: number; lateDays: number; earlyDays: number;
    }>();
    for (const line of lines) {
      if (!line.trim()) continue;
      const cols = line.split(",");
      const name = cols[0];
      const dept = cols[1] ?? "";
      const position = cols[2] ?? "";
      const checkin = cols[4] ?? "";
      const checkout = cols[5] ?? "";
      if (!empMap.has(name)) {
        empMap.set(name, { name, dept, position, workDays: 0, lateDays: 0, earlyDays: 0 });
      }
      const entry = empMap.get(name)!;
      if (checkin && checkin !== "-") {
        entry.workDays++;
        const [h, m] = checkin.split(":").map(Number);
        if (h > 9 || (h === 9 && m > 0)) entry.lateDays++;
      }
      if (checkout && checkout !== "-") {
        const [h] = checkout.split(":").map(Number);
        if (h < 18) entry.earlyDays++;
      }
    }
    return Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [csvData]);

  const handleFetch = () => fetchCsv();

  const handleExportCSV = () => {
    if (monthlyStats.length === 0) { toast.error("내보낼 데이터가 없습니다."); return; }
    const headers = ["이름", "부서", "직위", "출근일수", "지각횟수", "조퇴횟수"];
    const rows = monthlyStats.map(s => [s.name, s.dept, s.position, s.workDays, s.lateDays, s.earlyDays]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `월별근태집계_${year}년${month}월.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("월별 집계 CSV가 다운로드되었습니다.");
  };

  return (
    <div>
      {/* 월 선택 */}
      <div className="rounded-lg p-4 mb-4 flex flex-wrap gap-3 items-end justify-between"
        style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>연도</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-md text-sm outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
            >
              {[today.getFullYear() - 1, today.getFullYear()].map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>월</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-md text-sm outline-none"
              style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleFetch}
            disabled={csvLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
            style={{ background: "var(--kino-charcoal)", color: "white" }}
          >
            <BarChart2 size={13} /> {csvLoading ? "집계 중..." : "집계 조회"}
          </button>
        </div>
        {monthlyStats.length > 0 && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold transition-all active:scale-95"
            style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)", background: "var(--kino-bg)" }}
          >
            <Download size={13} /> CSV 내보내기
          </button>
        )}
      </div>

      {/* 집계 결과 */}
      {monthlyStats.length === 0 ? (
        <div className="rounded-lg py-16 text-center" style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-white)" }}>
          <BarChart2 size={36} className="mx-auto mb-3" style={{ color: "var(--kino-pale)" }} />
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>
            연도와 월을 선택 후 <strong>집계 조회</strong>를 클릭하세요
          </p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "집계 인원", value: `${monthlyStats.length}명` },
              { label: "지각 발생", value: `${monthlyStats.filter(s => s.lateDays > 0).length}명` },
              { label: "조퇴 발생", value: `${monthlyStats.filter(s => s.earlyDays > 0).length}명` },
            ].map(card => (
              <div key={card.label} className="rounded-lg p-4 text-center"
                style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--kino-muted)" }}>{card.label}</p>
                <p className="text-2xl font-bold" style={{ color: "var(--kino-charcoal)" }}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--kino-pale)" }}>
                  {["이름", "부서", "직위", "출근일수", "지각", "조퇴"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-mid)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthlyStats.map((s, i) => (
                  <tr key={s.name} style={{ background: i % 2 === 0 ? "var(--kino-white)" : "var(--kino-bg)", borderBottom: "1px solid var(--kino-pale)" }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: "var(--kino-charcoal)" }}>{s.name}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>{s.dept}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: "var(--kino-muted)" }}>{s.position}</td>
                    <td className="px-4 py-2.5 text-center font-semibold" style={{ color: "var(--kino-charcoal)" }}>{s.workDays}일</td>
                    <td className="px-4 py-2.5 text-center">
                      <span style={{ color: s.lateDays > 0 ? "#DC2626" : "#16A34A", fontWeight: 600 }}>
                        {s.lateDays}회
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span style={{ color: s.earlyDays > 0 ? "#F59E0B" : "#16A34A", fontWeight: 600 }}>
                        {s.earlyDays}회
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-2 text-right" style={{ color: "var(--kino-light)" }}>
            {year}년 {month}월 기준 · 09:00 이후 출근 = 지각, 18:00 이전 퇴근 = 조퇴
          </p>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");

  return (
    <AdminLayout title="출퇴근 관리">
      {/* 탭 */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg" style={{ background: "var(--kino-pale)", width: "fit-content" }}>
        {[
          { key: "daily", label: "일별 현황", icon: Calendar },
          { key: "monthly", label: "월별 집계", icon: BarChart2 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as "daily" | "monthly")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? "var(--kino-charcoal)" : "transparent",
                color: activeTab === tab.key ? "white" : "var(--kino-mid)",
              }}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "daily" ? <DailyTab /> : <MonthlyTab />}
    </AdminLayout>
  );
}

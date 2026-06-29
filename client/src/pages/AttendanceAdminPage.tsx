/**
 * AttendanceAdminPage.tsx — 출퇴근 관리자 현황 페이지
 * 경로: /admin/attendance
 * 기능:
 *  - 날짜 선택 (기본값: 오늘)
 *  - 부서/이름 필터
 *  - 출퇴근 현황 테이블
 *  - 현재 출근 중 인원 수 요약
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import PortalLayout from "@/components/PortalLayout";
import {
  Users, LogIn, LogOut, Clock, Search, RefreshCw,
  Building2, MapPin, ChevronLeft,
} from "lucide-react";
import { Link } from "wouter";

// 날짜를 YYYY-MM-DD 형식으로 변환
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// YYYY-MM-DD 문자열을 Date 객체로 변환
function fromDateString(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date;
}

// 시간 포맷 (HH:MM)
function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// 근무 시간 계산 (분 단위)
function calcWorkMinutes(checkin: Date | string | null | undefined, checkout: Date | string | null | undefined): string {
  if (!checkin || !checkout) return "-";
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  if (diff <= 0) return "-";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}시간 ${mins}분`;
}

export default function AttendanceAdminPage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(toDateString(today));
  const [filterDept, setFilterDept] = useState("");
  const [filterName, setFilterName] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // 출퇴근 로그 조회
  const { data: logs = [], isLoading, refetch } = trpc.attendance.adminList.useQuery({
    dateStr: selectedDate, // 'YYYY-MM-DD' 문자열로 전달 (타임존 문제 방지)
    department: filterDept || undefined,
    employeeName: filterName || undefined,
  }, {
    refetchOnWindowFocus: true,
  });

  // 오늘 요약 (오늘 날짜인 경우에만 표시)
  const { data: summary } = trpc.attendance.todaySummary.useQuery(undefined, {
    refetchOnWindowFocus: true,
    enabled: selectedDate === toDateString(today),
  });

  // 직원별 출퇴근 집계 (같은 날 여러 번 찍힌 경우 최초 출근 / 최종 퇴근으로 정리)
  const employeeMap = useMemo(() => {
    const map = new Map<string, {
      name: string;
      department: string | null;
      position: string | null;
      checkin: Date | null;
      checkout: Date | null;
      workType: string;
    }>();

    for (const log of logs) {
      const key = log.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          name: log.employeeName,
          department: log.department,
          position: log.position,
          checkin: null,
          checkout: null,
          workType: log.workType,
        });
      }
      const entry = map.get(key)!;
      if (log.type === "checkin") {
        // 최초 출근 시간
        if (!entry.checkin || new Date(log.recordedAt) < new Date(entry.checkin)) {
          entry.checkin = new Date(log.recordedAt);
          entry.workType = log.workType;
        }
      } else if (log.type === "checkout") {
        // 최종 퇴근 시간
        if (!entry.checkout || new Date(log.recordedAt) > new Date(entry.checkout)) {
          entry.checkout = new Date(log.recordedAt);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (!a.checkin && !b.checkin) return 0;
      if (!a.checkin) return 1;
      if (!b.checkin) return -1;
      return a.checkin.getTime() - b.checkin.getTime();
    });
  }, [logs]);

  // 검색 필터 적용 (클라이언트 측)
  const filteredEmployees = useMemo(() => {
    if (!searchInput) return employeeMap;
    const q = searchInput.toLowerCase();
    return employeeMap.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.department ?? "").toLowerCase().includes(q)
    );
  }, [employeeMap, searchInput]);

  // 현재 출근 중 인원
  const currentlyInCount = employeeMap.filter(e => e.checkin && !e.checkout).length;
  const totalCheckinCount = employeeMap.filter(e => e.checkin).length;
  const totalCheckoutCount = employeeMap.filter(e => e.checkout).length;

  const isToday = selectedDate === toDateString(today);

  return (
    <PortalLayout>
      <div className="container py-4 md:py-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="flex items-center gap-1 text-sm" style={{ color: "var(--kino-muted)" }}>
            <ChevronLeft size={16} />
            홈으로
          </Link>
          <span style={{ color: "var(--kino-pale)" }}>|</span>
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>
            출퇴근 현황 관리
          </h1>
        </div>

        {/* 요약 카드 (오늘 날짜인 경우) */}
        {isToday && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="portal-card p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} style={{ color: "var(--kino-mid)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>현재 출근 중</span>
              </div>
              <span className="text-2xl font-black" style={{ color: "var(--kino-charcoal)" }}>
                {summary?.currentlyIn ?? currentlyInCount}
              </span>
              <span className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>명</span>
            </div>
            <div className="portal-card p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <LogIn size={16} style={{ color: "#16A34A" }} />
                <span className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>오늘 출근</span>
              </div>
              <span className="text-2xl font-black" style={{ color: "#16A34A" }}>
                {summary?.totalCheckin ?? totalCheckinCount}
              </span>
              <span className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>명</span>
            </div>
            <div className="portal-card p-4 flex flex-col items-center">
              <div className="flex items-center gap-2 mb-1">
                <LogOut size={16} style={{ color: "var(--kino-mid)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>오늘 퇴근</span>
              </div>
              <span className="text-2xl font-black" style={{ color: "var(--kino-charcoal)" }}>
                {summary?.totalCheckout ?? totalCheckoutCount}
              </span>
              <span className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>명</span>
            </div>
          </div>
        )}

        {/* 필터 영역 */}
        <div className="portal-card p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* 날짜 선택 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>날짜</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded text-sm border outline-none focus:ring-1"
                style={{
                  border: "1px solid var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                  background: "white",
                }}
              />
            </div>

            {/* 부서 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>부서</label>
              <input
                type="text"
                placeholder="부서명 입력"
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="px-3 py-1.5 rounded text-sm border outline-none"
                style={{
                  border: "1px solid var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                  background: "white",
                  width: "140px",
                }}
              />
            </div>

            {/* 이름 필터 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>이름</label>
              <input
                type="text"
                placeholder="이름 입력"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="px-3 py-1.5 rounded text-sm border outline-none"
                style={{
                  border: "1px solid var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                  background: "white",
                  width: "120px",
                }}
              />
            </div>

            {/* 검색 (클라이언트 측) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: "var(--kino-muted)" }}>검색</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--kino-muted)" }} />
                <input
                  type="text"
                  placeholder="이름 또는 부서"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded text-sm border outline-none"
                  style={{
                    border: "1px solid var(--kino-pale)",
                    color: "var(--kino-charcoal)",
                    background: "white",
                    width: "160px",
                  }}
                />
              </div>
            </div>

            {/* 새로고침 버튼 */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all active:scale-95"
              style={{
                background: "var(--kino-charcoal)",
                color: "white",
              }}
            >
              <RefreshCw size={13} />
              새로고침
            </button>
          </div>
        </div>

        {/* 출퇴근 현황 테이블 */}
        <div className="portal-card overflow-hidden">
          <div className="section-header px-4">
            <span className="section-title flex items-center gap-1.5">
              <Clock size={14} style={{ color: "var(--kino-mid)" }} />
              {selectedDate} 출퇴근 현황
            </span>
            <span className="text-xs" style={{ color: "var(--kino-muted)" }}>
              총 {filteredEmployees.length}명
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
                <span className="text-sm" style={{ color: "var(--kino-muted)" }}>데이터 불러오는 중...</span>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users size={32} style={{ color: "var(--kino-pale)" }} />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>해당 날짜의 출퇴근 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--kino-pale)", background: "#FAFAFA" }}>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>이름</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>부서</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>직위</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>근무형태</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>출근</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>퇴근</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>근무시간</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--kino-muted)" }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp, idx) => {
                    const isIn = emp.checkin && !emp.checkout;
                    const isDone = emp.checkin && emp.checkout;
                    return (
                      <tr
                        key={emp.name}
                        style={{
                          borderBottom: "1px solid var(--kino-pale)",
                          background: idx % 2 === 0 ? "white" : "#FAFAFA",
                        }}
                      >
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--kino-charcoal)" }}>
                          {emp.name}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>
                          {emp.department ?? "-"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--kino-mid)" }}>
                          {emp.position ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                            style={{
                              background: emp.workType === "office" ? "var(--kino-pale)" : "#FFF7ED",
                              color: emp.workType === "office" ? "var(--kino-mid)" : "#C2410C",
                            }}
                          >
                            {emp.workType === "office"
                              ? <><Building2 size={10} />내근</>
                              : <><MapPin size={10} />외근</>
                            }
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm"
                          style={{ color: emp.checkin ? "#16A34A" : "var(--kino-pale)" }}>
                          {formatTime(emp.checkin)}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-sm"
                          style={{ color: emp.checkout ? "var(--kino-mid)" : "var(--kino-pale)" }}>
                          {formatTime(emp.checkout)}
                        </td>
                        <td className="px-4 py-3 text-center text-xs" style={{ color: "var(--kino-muted)" }}>
                          {calcWorkMinutes(emp.checkin, emp.checkout)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isIn ? (
                            <span className="inline-block text-xs px-2 py-0.5 rounded font-semibold"
                              style={{ background: "#F0FDF4", color: "#16A34A" }}>
                              출근 중
                            </span>
                          ) : isDone ? (
                            <span className="inline-block text-xs px-2 py-0.5 rounded font-semibold"
                              style={{ background: "#EFF6FF", color: "#1D4ED8" }}>
                              퇴근
                            </span>
                          ) : (
                            <span className="inline-block text-xs px-2 py-0.5 rounded font-semibold"
                              style={{ background: "#FEF9C3", color: "#92400E" }}>
                              미출근
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

        {/* 원시 로그 (접기/펼치기) */}
        <RawLogSection logs={logs} />
      </div>
    </PortalLayout>
  );
}

// ── 원시 로그 섹션 ───────────────────────────────────────────────
function RawLogSection({ logs }: { logs: Array<{
  id: number;
  employeeName: string;
  department: string | null;
  position: string | null;
  type: "checkin" | "checkout";
  workType: "office" | "field";
  recordedAt: Date;
  note: string | null;
}> }) {
  const [open, setOpen] = useState(false);

  if (logs.length === 0) return null;

  return (
    <div className="portal-card mt-4 overflow-hidden">
      <button
        className="w-full section-header px-4 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="section-title">원시 로그 ({logs.length}건)</span>
        <span className="text-xs" style={{ color: "var(--kino-muted)" }}>{open ? "접기" : "펼치기"}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--kino-pale)", background: "#FAFAFA" }}>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>ID</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>이름</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>유형</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>근무형태</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>기록시각</th>
                <th className="text-left px-4 py-2 font-semibold" style={{ color: "var(--kino-muted)" }}>메모</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--kino-pale)" }}>
                  <td className="px-4 py-2" style={{ color: "var(--kino-muted)" }}>{log.id}</td>
                  <td className="px-4 py-2 font-medium" style={{ color: "var(--kino-charcoal)" }}>{log.employeeName}</td>
                  <td className="px-4 py-2">
                    <span style={{ color: log.type === "checkin" ? "#16A34A" : "var(--kino-mid)" }}>
                      {log.type === "checkin" ? "출근" : "퇴근"}
                    </span>
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--kino-muted)" }}>
                    {log.workType === "office" ? "내근" : "외근"}
                  </td>
                  <td className="px-4 py-2 font-mono" style={{ color: "var(--kino-mid)" }}>
                    {new Date(log.recordedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-4 py-2" style={{ color: "var(--kino-muted)" }}>{log.note ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

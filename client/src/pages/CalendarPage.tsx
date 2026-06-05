import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const TODAY = new Date(2026, 5, 5);
const DAY_NAMES = ["일","월","화","수","목","금","토"];
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const EVENTS: Record<string, { title: string; color: string }[]> = {
  "2026-6-4":  [{ title: "팀 주간 회의", color: "var(--kino-charcoal)" }],
  "2026-6-5":  [{ title: "오늘 일정 없음", color: "var(--kino-muted)" }],
  "2026-6-10": [{ title: "전사 워크숍", color: "var(--kino-charcoal)" }],
  "2026-6-15": [{ title: "사무실 이전", color: "var(--kino-red)" }],
  "2026-6-20": [{ title: "Q2 결산 보고", color: "var(--kino-charcoal)" }],
  "2026-6-25": [{ title: "하반기 사업계획", color: "var(--kino-charcoal)" }],
};

export default function CalendarPage() {
  const [current, setCurrent] = useState({ year: TODAY.getFullYear(), month: TODAY.getMonth() });
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
  const firstDay = new Date(current.year, current.month, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => d === TODAY.getDate() && current.month === TODAY.getMonth() && current.year === TODAY.getFullYear();
  const getEvents = (d: number) => EVENTS[`${current.year}-${current.month + 1}-${d}`] || [];

  const prevMonth = () => setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 });

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="portal-card">
          {/* Header */}
          <div className="section-header">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><ChevronLeft size={16} style={{ color: "var(--kino-mid)" }} /></button>
              <span className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>{current.year}년 {MONTH_NAMES[current.month]}</span>
              <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 transition-colors"><ChevronRight size={16} style={{ color: "var(--kino-mid)" }} /></button>
              <button onClick={() => setCurrent({ year: TODAY.getFullYear(), month: TODAY.getMonth() })}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}>오늘</button>
            </div>
            <button onClick={() => toast("일정 추가 기능 준비 중")}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white"
              style={{ background: "var(--kino-charcoal)" }}>
              <Plus size={12} /> 일정 추가
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--kino-pale)" }}>
            {DAY_NAMES.map((d, i) => (
              <div key={d} className="py-2 text-center text-xs font-semibold"
                style={{ color: i === 0 ? "var(--kino-red)" : i === 6 ? "#4A90D9" : "var(--kino-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dow = idx % 7;
              const events = day ? getEvents(day) : [];
              return (
                <div
                  key={idx}
                  className="min-h-[90px] p-1.5 border-b border-r transition-colors cursor-pointer hover:bg-gray-50"
                  style={{
                    borderColor: "var(--kino-pale)",
                    borderRight: dow === 6 ? "none" : undefined,
                  }}
                  onClick={() => day && toast(`${current.year}.${current.month + 1}.${day} 일정 추가 준비 중`)}
                >
                  {day && (
                    <>
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday(day) ? "text-white" : ""}`}
                        style={{
                          background: isToday(day) ? "var(--kino-black)" : "transparent",
                          color: isToday(day) ? "white" : dow === 0 ? "var(--kino-red)" : dow === 6 ? "#4A90D9" : "var(--kino-charcoal)",
                          fontWeight: isToday(day) ? 700 : 400,
                        }}>
                        {day}
                      </div>
                      {events.map((ev, ei) => (
                        <div key={ei} className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate"
                          style={{ background: `${ev.color}15`, color: ev.color, border: `1px solid ${ev.color}30` }}>
                          {ev.title}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

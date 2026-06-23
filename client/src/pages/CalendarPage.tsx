/**
 * CalendarPage.tsx — 일정 관리 페이지 (DB 연동)
 */
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2, Pencil } from "lucide-react";

const DAY_NAMES = ["일","월","화","수","목","금","토"];
const MONTH_NAMES = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const COLOR_OPTIONS = [
  { label: "기본", value: "#1a1a1a" },
  { label: "빨강", value: "#DC2626" },
  { label: "파랑", value: "#2563EB" },
  { label: "초록", value: "#16A34A" },
  { label: "주황", value: "#EA580C" },
  { label: "보라", value: "#7C3AED" },
];

type EventForm = {
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  color: string;
};

const defaultForm = (date?: string): EventForm => ({
  title: "",
  description: "",
  eventDate: date ?? "",
  startTime: "",
  endTime: "",
  color: "#1a1a1a",
});

export default function CalendarPage() {
  const now = new Date();
  const [current, setCurrent] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(defaultForm());
  const [submitting, setSubmitting] = useState(false);

  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  const firstDay = new Date(current.year, current.month - 1, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) => {
    return d === now.getDate() && current.month === now.getMonth() + 1 && current.year === now.getFullYear();
  };

  const { data: events, refetch } = trpc.calendar.listMonth.useQuery({ year: current.year, month: current.month });

  // 날짜별 이벤트 맵
  const eventMap = useMemo(() => {
    const map: Record<string, typeof events> = {};
    if (!events) return map;
    for (const ev of events) {
      if (!map[ev.eventDate]) map[ev.eventDate] = [];
      map[ev.eventDate]!.push(ev);
    }
    return map;
  }, [events]);

  const getDateStr = (d: number) => `${current.year}-${String(current.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const prevMonth = () => setCurrent(c => c.month === 1 ? { year: c.year - 1, month: 12 } : { ...c, month: c.month - 1 });
  const nextMonth = () => setCurrent(c => c.month === 12 ? { year: c.year + 1, month: 1 } : { ...c, month: c.month + 1 });

  const createMutation = trpc.calendar.create.useMutation({
    onSuccess: () => { refetch(); setShowModal(false); setForm(defaultForm()); toast.success("일정이 추가되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => { refetch(); setShowModal(false); setEditingId(null); setForm(defaultForm()); toast.success("일정이 수정되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.calendar.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("일정이 삭제되었습니다."); },
    onError: (e) => toast.error(e.message),
  });

  const openAdd = (dateStr?: string) => {
    setEditingId(null);
    setForm(defaultForm(dateStr));
    setShowModal(true);
  };

  const openEdit = (ev: NonNullable<typeof events>[0]) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title,
      description: ev.description ?? "",
      eventDate: ev.eventDate,
      startTime: ev.startTime ?? "",
      endTime: ev.endTime ?? "",
      color: ev.color,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!form.eventDate) { toast.error("날짜를 선택해주세요."); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form, startTime: form.startTime || undefined, endTime: form.endTime || undefined });
      } else {
        await createMutation.mutateAsync({ ...form, startTime: form.startTime || undefined, endTime: form.endTime || undefined });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="portal-card">
          {/* Header */}
          <div className="section-header">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded transition-colors" style={{ color: "var(--kino-mid)" }}>
                <ChevronLeft size={16} />
              </button>
              <span className="text-base font-bold" style={{ color: "var(--kino-charcoal)" }}>
                {current.year}년 {MONTH_NAMES[current.month - 1]}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded transition-colors" style={{ color: "var(--kino-mid)" }}>
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrent({ year: now.getFullYear(), month: now.getMonth() + 1 })}
                className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
              >
                오늘
              </button>
            </div>
            <button
              onClick={() => openAdd()}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold text-white transition-all active:scale-95"
              style={{ background: "var(--kino-charcoal)" }}
            >
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
              const dateStr = day ? getDateStr(day) : "";
              const dayEvents = day ? (eventMap[dateStr] ?? []) : [];
              return (
                <div
                  key={idx}
                  className="min-h-[90px] p-1.5 border-b border-r transition-colors cursor-pointer"
                  style={{
                    borderColor: "var(--kino-pale)",
                    borderRight: dow === 6 ? "none" : undefined,
                  }}
                  onClick={() => day && openAdd(getDateStr(day))}
                >
                  {day && (
                    <>
                      <div
                        className="w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1"
                        style={{
                          background: isToday(day) ? "var(--kino-black)" : "transparent",
                          color: isToday(day) ? "white" : dow === 0 ? "var(--kino-red)" : dow === 6 ? "#4A90D9" : "var(--kino-charcoal)",
                          fontWeight: isToday(day) ? 700 : 400,
                        }}
                      >
                        {day}
                      </div>
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer"
                          style={{ background: `${ev.color}20`, color: ev.color, border: `1px solid ${ev.color}40` }}
                          onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                        >
                          {ev.startTime ? `${ev.startTime} ` : ""}{ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs px-1 py-0.5" style={{ color: "var(--kino-muted)" }}>
                          +{dayEvents.length - 3}개 더
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 일정 추가/수정 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-xl shadow-xl w-full max-w-md mx-4 p-6"
            style={{ background: "var(--kino-white)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--kino-charcoal)" }}>
                {editingId ? "일정 수정" : "일정 추가"}
              </h2>
              <div className="flex items-center gap-2">
                {editingId && (
                  <button
                    onClick={() => { if (confirm("이 일정을 삭제하시겠습니까?")) { deleteMutation.mutate({ id: editingId }); setShowModal(false); } }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium"
                    style={{ border: "1px solid #FEE2E2", color: "#DC2626" }}
                  >
                    <Trash2 size={11} /> 삭제
                  </button>
                )}
                <button onClick={() => setShowModal(false)} style={{ color: "var(--kino-muted)" }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>제목 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="일정 제목"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>날짜 *</label>
                <input
                  type="date"
                  value={form.eventDate}
                  onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                  className="w-full px-3 py-2 rounded-md text-sm outline-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>시작 시간</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>종료 시간</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-sm outline-none"
                    style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>색상</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: opt.value,
                        outline: form.color === opt.value ? `2px solid ${opt.value}` : "none",
                        outlineOffset: "2px",
                      }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--kino-mid)" }}>메모 (선택)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="일정 상세 내용"
                  className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-charcoal)", background: "var(--kino-bg)" }}
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium"
                  style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-mid)" }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all active:scale-95"
                  style={{ background: "var(--kino-charcoal)", color: "white" }}
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
                  {editingId ? "수정" : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

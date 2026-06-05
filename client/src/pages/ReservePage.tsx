import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Building2, Car, Monitor, Coffee, Plus, Clock } from "lucide-react";

const RESOURCES = [
  { id: 1, type: "회의실", name: "대회의실 A", capacity: 20, floor: "5F", icon: Building2, available: true },
  { id: 2, type: "회의실", name: "소회의실 B", capacity: 8,  floor: "5F", icon: Building2, available: false },
  { id: 3, type: "회의실", name: "소회의실 C", capacity: 6,  floor: "3F", icon: Building2, available: true },
  { id: 4, type: "차량",   name: "법인차량 1호 (소나타)", capacity: 5, floor: "B1", icon: Car, available: true },
  { id: 5, type: "차량",   name: "법인차량 2호 (스타리아)", capacity: 11, floor: "B1", icon: Car, available: false },
  { id: 6, type: "장비",   name: "빔프로젝터 A", capacity: 1, floor: "창고", icon: Monitor, available: true },
  { id: 7, type: "공간",   name: "휴게실 예약", capacity: 10, floor: "4F", icon: Coffee, available: true },
];

const MY_RESERVES = [
  { id: 1, resource: "대회의실 A", date: "2026.06.06", time: "14:00 ~ 15:00", purpose: "Q3 기획 회의", status: "승인" },
  { id: 2, resource: "법인차량 1호", date: "2026.06.07", time: "09:00 ~ 18:00", purpose: "고객사 방문", status: "대기" },
];

export default function ReservePage() {
  const [activeType, setActiveType] = useState("전체");
  const types = ["전체", "회의실", "차량", "장비", "공간"];
  const filtered = activeType === "전체" ? RESOURCES : RESOURCES.filter(r => r.type === activeType);

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>예약</h1>
          <button onClick={() => toast("예약 신청 기능 준비 중")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-semibold text-white"
            style={{ background: "var(--kino-charcoal)" }}>
            <Plus size={14} /> 예약 신청
          </button>
        </div>

        {/* 내 예약 현황 */}
        <div className="portal-card mb-4">
          <div className="section-header">
            <span className="section-title flex items-center gap-1.5"><Clock size={14} style={{ color: "var(--kino-mid)" }} />내 예약 현황</span>
          </div>
          {MY_RESERVES.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-0" style={{ borderColor: "var(--kino-pale)" }}>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{r.resource}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{r.date} · {r.time} · {r.purpose}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-medium"
                style={{
                  background: r.status === "승인" ? "#F0FDF4" : "#FEF9C3",
                  color: r.status === "승인" ? "#16A34A" : "#92400E",
                }}>
                {r.status}
              </span>
              <button onClick={() => toast("예약 취소 기능 준비 중")} className="text-xs px-2 py-0.5 rounded" style={{ border: "1px solid var(--kino-pale)", color: "var(--kino-muted)" }}>취소</button>
            </div>
          ))}
        </div>

        {/* 자원 목록 */}
        <div className="portal-card">
          <div className="section-header">
            <span className="section-title">예약 가능 자원</span>
            <div className="flex gap-1">
              {types.map(t => (
                <button key={t} onClick={() => setActiveType(t)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                  style={{ background: activeType === t ? "var(--kino-charcoal)" : "transparent", color: activeType === t ? "white" : "var(--kino-muted)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {filtered.map(r => {
              const Icon = r.icon;
              return (
                <div key={r.id} className="portal-card p-3 cursor-pointer" onClick={() => toast(`${r.name} 예약 기능 준비 중`)}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded flex items-center justify-center" style={{ background: "var(--kino-bg)" }}>
                      <Icon size={18} style={{ color: "var(--kino-mid)" }} />
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: r.available ? "#F0FDF4" : "#FEF2F2", color: r.available ? "#16A34A" : "#DC2626" }}>
                      {r.available ? "예약가능" : "사용중"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{r.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>{r.floor} · 수용 {r.capacity}명</p>
                  {r.available && (
                    <button className="mt-2 w-full py-1.5 rounded text-xs font-semibold text-white transition-colors"
                      style={{ background: "var(--kino-charcoal)" }}
                      onClick={(e) => { e.stopPropagation(); toast(`${r.name} 예약 신청 준비 중`); }}>
                      예약하기
                    </button>
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

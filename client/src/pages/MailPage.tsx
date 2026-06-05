import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, Plus, Star, Trash2, Reply, Forward, Paperclip, Mail } from "lucide-react";

const MAILS = [
  { id: 1, from: "이서연 과장", subject: "[Q2 보고] 납품 완료 확인 요청", preview: "안녕하세요. Q2 납품 완료 건에 대한 확인을 부탁드립니다.", date: "10:32", read: false, starred: true, hasAttach: true },
  { id: 2, from: "박준서 본부장", subject: "하반기 사업계획 검토 회의 일정 안내", preview: "6월 10일 오전 10시에 대회의실에서 진행됩니다.", date: "09:15", read: false, starred: false, hasAttach: false },
  { id: 3, from: "HR팀", subject: "[안내] 6월 급여 명세서 발송", preview: "6월 급여 명세서가 시스템에 등록되었습니다.", date: "08:50", read: true, starred: false, hasAttach: true },
  { id: 4, from: "관리자", subject: "[공지] 정보보안 교육 이수 필수 안내", preview: "6월 30일까지 정보보안 교육을 이수하셔야 합니다.", date: "2026.06.03", read: true, starred: false, hasAttach: false },
  { id: 5, from: "강민서 팀장", subject: "고객사 A 미팅 일정 협의", preview: "다음 주 고객사 미팅 일정을 조율하고자 합니다.", date: "2026.06.02", read: true, starred: true, hasAttach: false },
];

export default function MailPage() {
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const filtered = MAILS.filter(m => !search || m.subject.includes(search) || m.from.includes(search));
  const mail = MAILS.find(m => m.id === selected);
  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex gap-4" style={{ height: "calc(100vh - 160px)", minHeight: "500px" }}>
          <div className="shrink-0 w-40 flex flex-col gap-1">
            <button onClick={() => toast("작성 기능 준비 중")} className="flex items-center gap-1.5 px-3 py-2 rounded text-sm font-semibold text-white mb-2" style={{ background: "var(--kino-charcoal)" }}><Plus size={14} /> 메일 작성</button>
            {["받은메일","임시보관","보낸메일","휴지통"].map(f => (
              <button key={f} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors hover:bg-gray-100" style={{ color: "var(--kino-mid)" }}>
                <Mail size={13} />{f}
                {f === "받은메일" && <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: "var(--kino-red)" }}>3</span>}
              </button>
            ))}
          </div>
          <div className="portal-card flex flex-col" style={{ width: "280px", flexShrink: 0, overflow: "hidden" }}>
            <div className="p-2 border-b" style={{ borderColor: "var(--kino-pale)" }}>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}>
                <Search size={12} style={{ color: "var(--kino-muted)" }} />
                <input type="text" placeholder="메일 검색" className="bg-transparent outline-none text-xs flex-1" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.map(m => (
                <div key={m.id} className="px-3 py-2.5 cursor-pointer border-b transition-colors" style={{ borderColor: "var(--kino-pale)", background: selected === m.id ? "var(--kino-bg)" : "transparent", borderLeft: selected === m.id ? "3px solid var(--kino-charcoal)" : "3px solid transparent" }} onClick={() => setSelected(m.id)}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold" style={{ color: m.read ? "var(--kino-muted)" : "var(--kino-charcoal)" }}>{m.from}</span>
                    <span className="text-xs" style={{ color: "var(--kino-light)" }}>{m.date}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: m.read ? "var(--kino-muted)" : "var(--kino-charcoal)", fontWeight: m.read ? 400 : 600 }}>{m.subject}</p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--kino-light)" }}>{m.preview}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {!m.read && <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--kino-charcoal)" }} />}
                    {m.hasAttach && <Paperclip size={10} style={{ color: "var(--kino-muted)" }} />}
                    {m.starred && <Star size={10} style={{ color: "#D97706", fill: "#D97706" }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="portal-card flex-1 flex flex-col overflow-hidden">
            {mail ? (
              <>
                <div className="p-4 border-b" style={{ borderColor: "var(--kino-pale)" }}>
                  <h2 className="text-base font-bold mb-1" style={{ color: "var(--kino-charcoal)" }}>{mail.subject}</h2>
                  <div className="flex items-center justify-between">
                    <p className="text-xs" style={{ color: "var(--kino-muted)" }}>보낸 사람: <strong style={{ color: "var(--kino-mid)" }}>{mail.from}</strong> · {mail.date}</p>
                    <div className="flex gap-1">
                      {[{ icon: <Reply size={13} />, label: "답장" },{ icon: <Forward size={13} />, label: "전달" },{ icon: <Trash2 size={13} />, label: "삭제" }].map(a => (
                        <button key={a.label} onClick={() => toast(`${a.label} 기능 준비 중`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-gray-100" style={{ color: "var(--kino-muted)" }}>{a.icon}{a.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto">
                  <p className="text-sm leading-relaxed" style={{ color: "var(--kino-mid)" }}>{mail.preview}</p>
                  <p className="text-sm mt-3" style={{ color: "var(--kino-light)" }}>(이 메일은 데모 데이터입니다. 실제 메일 기능은 추후 연동됩니다.)</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2" style={{ color: "var(--kino-light)" }}>
                <Mail size={36} />
                <p className="text-sm">메일을 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

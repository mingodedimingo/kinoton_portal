/**
 * AdminDashboard — 어드민 메인 대시보드
 * 출퇴근 현황 요약, 공지/게시판/인사발령/경조사 최근 항목 한눈에 보기
 */
import { useMemo } from "react";
import { Link } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import {
  ClipboardList, Megaphone, UserCheck, Heart, BookOpen,
  ChevronRight, Users, LogIn, LogOut, Loader2,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-lg p-4 flex items-start gap-3"
      style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}
    >
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
        style={{ background: color ?? "var(--kino-charcoal)" }}
      >
        <Icon size={16} color="white" />
      </div>
      <div>
        <p className="text-xs" style={{ color: "var(--kino-muted)" }}>{label}</p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: "var(--kino-charcoal)" }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "var(--kino-light)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, href, children }: {
  title: string;
  icon: React.ElementType;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg"
      style={{ background: "var(--kino-white)", border: "1px solid var(--kino-pale)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--kino-pale)" }}
      >
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--kino-charcoal)" }}>
          <Icon size={14} style={{ color: "var(--kino-mid)" }} />
          {title}
        </span>
        <Link href={href}>
          <span className="flex items-center gap-0.5 text-xs cursor-pointer" style={{ color: "var(--kino-muted)" }}>
            관리 <ChevronRight size={12} />
          </span>
        </Link>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function ItemRow({ label, sub, badge }: { label: string; sub?: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--kino-pale)" }}>
      {badge && (
        <span
          className="text-xs px-1.5 py-0.5 rounded shrink-0 font-medium"
          style={{ background: "var(--kino-pale)", color: "var(--kino-mid)" }}
        >
          {badge}
        </span>
      )}
      <span className="text-sm flex-1 truncate" style={{ color: "var(--kino-charcoal)" }}>{label}</span>
      {sub && <span className="text-xs shrink-0" style={{ color: "var(--kino-light)" }}>{sub}</span>}
    </div>
  );
}

export default function AdminDashboard() {
  const today = useMemo(() => new Date(), []);

  const { data: summary, isLoading: summaryLoading } = trpc.attendance.todaySummary.useQuery();
  const { data: noticesData } = trpc.notices.list.useQuery({ limit: 3 });
  const notices = noticesData?.items;
  const { data: hrData } = trpc.hrNotices.list.useQuery({ limit: 3 });
  const hrList = hrData?.items;
  const { data: condData } = trpc.condolences.list.useQuery({ limit: 3 });
  const condolenceList = condData?.items;
  const { data: boardData } = trpc.board.list.useQuery({ limit: 3 });
  const boardList = boardData?.items;

  const todayStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

  return (
    <AdminLayout title="대시보드">
      {/* 날짜 */}
      <p className="text-xs mb-4" style={{ color: "var(--kino-muted)" }}>
        {todayStr} 기준 현황
      </p>

      {/* 출퇴근 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {summaryLoading ? (
          <div className="col-span-3 flex justify-center py-6">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-muted)" }} />
          </div>
        ) : (
          <>
            <StatCard
              icon={LogIn}
              label="오늘 출근"
              value={summary?.totalCheckin ?? 0}
              sub="명"
              color="#1A1A1A"
            />
            <StatCard
              icon={Users}
              label="현재 재실"
              value={summary?.currentlyIn ?? 0}
              sub="명"
              color="#374151"
            />
            <StatCard
              icon={LogOut}
              label="오늘 퇴근"
              value={summary?.totalCheckout ?? 0}
              sub="명"
              color="#6B7280"
            />
          </>
        )}
      </div>

      {/* 섹션 카드 2열 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 공지사항 */}
        <SectionCard title="공지사항" icon={Megaphone} href="/admin/notices">
          {!notices || notices.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "var(--kino-light)" }}>등록된 공지가 없습니다</p>
          ) : (
            notices.map(n => (
              <ItemRow key={n.id} label={n.title} badge={n.tag}
                sub={new Date(n.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })} />
            ))
          )}
        </SectionCard>

        {/* 인사발령 */}
        <SectionCard title="인사발령" icon={UserCheck} href="/admin/hr">
          {!hrList || hrList.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "var(--kino-light)" }}>등록된 인사발령이 없습니다</p>
          ) : (
            hrList.map(h => (
              <ItemRow key={h.id} label={h.title} badge={h.type} sub={h.effectiveDate ?? ""} />
            ))
          )}
        </SectionCard>

        {/* 경조사 */}
        <SectionCard title="경조사" icon={Heart} href="/admin/condolences">
          {!condolenceList || condolenceList.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "var(--kino-light)" }}>등록된 경조사가 없습니다</p>
          ) : (
            condolenceList.map(c => (
              <ItemRow key={c.id} label={c.name} badge={c.type} sub={c.eventDate ?? ""} />
            ))
          )}
        </SectionCard>

        {/* 게시판 */}
        <SectionCard title="게시판" icon={BookOpen} href="/admin/board">
          {!boardList || boardList.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "var(--kino-light)" }}>등록된 게시글이 없습니다</p>
          ) : (
            boardList.map(b => (
              <ItemRow key={b.id} label={b.title} badge={b.category} sub={b.authorName} />
            ))
          )}
        </SectionCard>
      </div>
    </AdminLayout>
  );
}

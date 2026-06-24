/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * employees DB 기반으로 렌더링 (어드민에서 직원 정보 수정 시 자동 반영)
 * 본부_실 → 부서 → 직원 계층 구조
 */
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { Search, Phone, Mail, Users, Loader2, Building2, ChevronDown, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── CSV의 본부_실 → 부서 매핑 (프론트 하드코딩) ──────────────────
const DIVISION_MAP: Record<string, string> = {
  // 대표이사
  "대표이사": "대표이사",
  // 임원 (부서명이 본부/담당/실 이름인 경우)
  "미래전략사업본부": "임원",
  "경영지원본부": "임원",
  "Dx사업본부": "임원",
  "경영전략실": "임원",
  "Creative LAB": "임원",
  "Dx사업담당": "임원",
  "경영지원담당": "임원",
  "DE사업담당": "임원",
  "전략기획담당": "임원",
  "광고사업담당": "임원",
  // 미래전략사업본부
  "광고사업팀": "미래전략사업본부",
  "글로벌사업팀": "미래전략사업본부",
  "경영기획팀": "미래전략사업본부",
  "경영혁신TASK": "미래전략사업본부",
  // 경영지원본부
  "회계팀": "경영지원본부",
  "인사총무팀": "경영지원본부",
  // Dx사업본부
  "영업1팀": "Dx사업본부",
  "영업2팀": "Dx사업본부",
  "오디오사업팀": "Dx사업본부",
  // DE사업본부
  "DE영업총괄": "DE사업본부",
  "전시팀": "DE사업본부",
  "기술영업팀": "DE사업본부",
  "관리팀": "DE사업본부",
  "지원팀": "DE사업본부",
  // 기술총괄
  "기술총괄": "기술총괄",
  "기술1팀": "기술총괄",
  "기술2팀": "기술총괄",
  "기술3팀": "기술총괄",
  "시설팀": "기술총괄",
  "운영지원팀": "기술총괄",
  // Creative LAB
  "디자인팀": "Creative LAB",
  "디자인파트": "Creative LAB",
  "설계파트": "Creative LAB",
};

// 본부 표시 순서
const DIVISION_ORDER = [
  "대표이사",
  "임원",
  "미래전략사업본부",
  "경영지원본부",
  "Dx사업본부",
  "DE사업본부",
  "기술총괄",
  "Creative LAB",
];

// 본부별 색상
const DIVISION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "대표이사":      { bg: "#1A1A1A", text: "#FFFFFF", border: "#1A1A1A" },
  "임원":          { bg: "#374151", text: "#FFFFFF", border: "#374151" },
  "미래전략사업본부": { bg: "#1D4ED8", text: "#FFFFFF", border: "#1D4ED8" },
  "경영지원본부":  { bg: "#7C3AED", text: "#FFFFFF", border: "#7C3AED" },
  "Dx사업본부":    { bg: "#0369A1", text: "#FFFFFF", border: "#0369A1" },
  "DE사업본부":    { bg: "#047857", text: "#FFFFFF", border: "#047857" },
  "기술총괄":      { bg: "#B45309", text: "#FFFFFF", border: "#B45309" },
  "Creative LAB":  { bg: "#BE185D", text: "#FFFFFF", border: "#BE185D" },
};

// 직위별 배지 색상
function rankBadge(position: string): { bg: string; color: string } {
  if (["대표이사"].includes(position)) return { bg: "#1A1A1A", color: "#FFF" };
  if (["부사장"].includes(position)) return { bg: "#374151", color: "#FFF" };
  if (["상무"].includes(position)) return { bg: "#4B5563", color: "#FFF" };
  if (["담당"].includes(position)) return { bg: "#E85D04", color: "#FFF" };
  if (["팀장"].includes(position)) return { bg: "#2563EB", color: "#FFF" };
  if (["수석"].includes(position)) return { bg: "#7C3AED", color: "#FFF" };
  if (["책임"].includes(position)) return { bg: "#0369A1", color: "#FFF" };
  if (["선임"].includes(position)) return { bg: "#047857", color: "#FFF" };
  if (["사원", "주임"].includes(position)) return { bg: "#6B7280", color: "#FFF" };
  return { bg: "#9CA3AF", color: "#FFF" };
}

type Employee = {
  id: number;
  name: string;
  department: string;
  position: string;
  phone: string | null;
  ext: string | null;
  email: string | null;
  profileImage: string | null;
};

// ── 직원 카드 ────────────────────────────────────────────────────
function EmployeeCard({ emp }: { emp: Employee }) {
  const badge = rankBadge(emp.position);
  return (
    <div
      className="flex flex-col items-center p-3 rounded-lg text-center transition-all hover:shadow-md"
      style={{
        border: "1px solid #E5E7EB",
        background: "#FAFAFA",
        minWidth: "100px",
        maxWidth: "120px",
      }}
    >
      {emp.profileImage ? (
        <img
          src={emp.profileImage}
          alt={emp.name}
          className="w-10 h-10 rounded-full object-cover mb-1.5"
          style={{ border: "2px solid #E5E7EB" }}
        />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mb-1.5 shrink-0"
          style={{ background: badge.bg }}
        >
          {emp.name.charAt(0)}
        </div>
      )}
      <p className="text-xs font-semibold leading-tight" style={{ color: "#1F2937" }}>{emp.name}</p>
      <span
        className="mt-1 text-xs px-1.5 py-0.5 rounded font-medium"
        style={{ background: badge.bg, color: badge.color, fontSize: "0.6rem" }}
      >
        {emp.position}
      </span>
      {emp.ext && emp.ext !== "-" && (
        <p className="mt-1 text-xs" style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>
          ☎ {emp.ext}
        </p>
      )}
    </div>
  );
}

// ── 부서 섹션 ────────────────────────────────────────────────────
function DeptSection({ dept, members, divColor }: {
  dept: string;
  members: Employee[];
  divColor: { bg: string; text: string; border: string };
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-4">
      <button
        className="flex items-center gap-2 mb-2 w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold" style={{ color: "#374151" }}>{dept}</span>
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "#F3F4F6", color: "#6B7280" }}>
          {members.length}명
        </span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-2">
          {members.map(emp => <EmployeeCard key={emp.id} emp={emp} />)}
        </div>
      )}
    </div>
  );
}

// ── 본부 섹션 ────────────────────────────────────────────────────
function DivisionSection({ division, deptGroups }: {
  division: string;
  deptGroups: Array<{ dept: string; members: Employee[] }>;
}) {
  const [open, setOpen] = useState(true);
  const color = DIVISION_COLORS[division] ?? { bg: "#6B7280", text: "#FFF", border: "#6B7280" };
  const totalCount = deptGroups.reduce((s, g) => s + g.members.length, 0);

  return (
    <div
      className="mb-5 rounded-xl overflow-hidden"
      style={{ border: `1px solid ${color.border}22` }}
    >
      {/* 본부 헤더 */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: color.bg }}
        onClick={() => setOpen(!open)}
      >
        <Building2 size={16} style={{ color: color.text, opacity: 0.8 }} />
        <span className="text-sm font-bold" style={{ color: color.text }}>{division}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: "rgba(255,255,255,0.2)", color: color.text }}
        >
          {totalCount}명
        </span>
        <span className="ml-auto" style={{ color: color.text, opacity: 0.7 }}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {/* 부서 목록 */}
      {open && (
        <div className="px-4 pt-3 pb-2" style={{ background: "#FFFFFF" }}>
          {deptGroups.map(({ dept, members }) => (
            <DeptSection key={dept} dept={dept} members={members} divColor={color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function OrgChartPage() {
  const [view, setView] = useState<"org" | "list">("org");
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = trpc.employees.list.useQuery({ activeOnly: true });

  // 본부 → 부서 → 직원 계층 구조 생성
  const divisionGroups = useMemo(() => {
    // 1. 부서 → 본부 매핑
    const divMap = new Map<string, Map<string, Employee[]>>();

    employees.forEach((emp) => {
      const dept = emp.department || "기타";
      const division = DIVISION_MAP[dept] ?? "기타";

      if (!divMap.has(division)) divMap.set(division, new Map());
      const deptMap = divMap.get(division)!;
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(emp);
    });

    // 2. 정해진 순서로 정렬
    const result: Array<{ division: string; deptGroups: Array<{ dept: string; members: Employee[] }> }> = [];

    DIVISION_ORDER.forEach((div) => {
      if (divMap.has(div)) {
        const deptMap = divMap.get(div)!;
        const deptGroups = Array.from(deptMap.entries()).map(([dept, members]) => ({ dept, members }));
        result.push({ division: div, deptGroups });
        divMap.delete(div);
      }
    });

    // 나머지 본부
    divMap.forEach((deptMap, div) => {
      const deptGroups = Array.from(deptMap.entries()).map(([dept, members]) => ({ dept, members }));
      result.push({ division: div, deptGroups });
    });

    return result;
  }, [employees]);

  // 전화번호부 검색 필터
  const filtered = useMemo(() => {
    if (!search) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.position.toLowerCase().includes(q) ||
        (m.phone ?? "").includes(q) ||
        (m.ext ?? "").includes(q) ||
        (m.email ?? "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <PortalLayout>
      <div className="container py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#1F2937" }}>조직도 / 사내 전화번호부</h1>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              총 {employees.length}명 · {divisionGroups.length}개 본부/실
            </p>
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            {(["org", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v ? "#1F2937" : "transparent",
                  color: view === v ? "white" : "#6B7280",
                }}
              >
                {v === "org" ? "조직도" : "전화번호부"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: "#9CA3AF" }} />
          </div>
        ) : employees.length === 0 ? (
          <div className="portal-card p-8 text-center">
            <Users size={32} className="mx-auto mb-3" style={{ color: "#D1D5DB" }} />
            <p className="text-sm" style={{ color: "#9CA3AF" }}>등록된 직원이 없습니다.</p>
          </div>
        ) : view === "org" ? (
          /* ── 조직도 뷰 ── */
          <div>
            {divisionGroups.map(({ division, deptGroups }) => (
              <DivisionSection key={division} division={division} deptGroups={deptGroups} />
            ))}
          </div>
        ) : (
          /* ── 전화번호부 뷰 ── */
          <div className="portal-card">
            <div className="section-header">
              <span className="section-title">
                임직원 목록
                <span className="ml-1 text-xs font-normal" style={{ color: "#9CA3AF" }}>
                  {filtered.length}명
                </span>
              </span>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
                style={{ border: "1px solid #E5E7EB", background: "#F9FAFB" }}
              >
                <Search size={12} style={{ color: "#9CA3AF" }} />
                <input
                  type="text"
                  placeholder="이름, 부서, 직위, 번호 검색"
                  className="bg-transparent outline-none w-44 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* 테이블 헤더 */}
            <div
              className="grid text-xs font-semibold px-4 py-2"
              style={{
                gridTemplateColumns: "1.4fr 130px 70px 90px 160px 200px",
                background: "#F9FAFB",
                color: "#9CA3AF",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <span>이름</span>
              <span>부서</span>
              <span>직위</span>
              <span>내선</span>
              <span>휴대폰</span>
              <span>이메일</span>
            </div>

            {filtered.map((m) => {
              const badge = rankBadge(m.position);
              return (
                <div
                  key={m.id}
                  className="grid items-center px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors"
                  style={{
                    gridTemplateColumns: "1.4fr 130px 70px 90px 160px 200px",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span className="flex items-center gap-2">
                    {m.profileImage ? (
                      <img
                        src={m.profileImage}
                        alt={m.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: badge.bg }}
                      >
                        {m.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium" style={{ color: "#1F2937" }}>{m.name}</span>
                  </span>
                  <span className="text-xs" style={{ color: "#6B7280" }}>{m.department}</span>
                  <span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ background: badge.bg, color: badge.color, fontSize: "0.65rem" }}
                    >
                      {m.position}
                    </span>
                  </span>
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    {m.ext && m.ext !== "-" ? m.ext : "-"}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                    {m.phone && m.phone !== "-" ? (
                      <>
                        <Phone size={10} style={{ color: "#9CA3AF" }} />
                        {m.phone}
                      </>
                    ) : "-"}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                    {m.email ? (
                      <>
                        <Mail size={10} style={{ color: "#9CA3AF" }} />
                        <span className="truncate">{m.email}</span>
                      </>
                    ) : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

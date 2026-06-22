/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * employees DB 기반으로 렌더링 (어드민에서 직원 정보 수정 시 자동 반영)
 */
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { Search, Phone, ChevronDown, ChevronRight, Users, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── 직위별 배지 색상 ─────────────────────────────────────────────
function rankColor(position: string) {
  if (["대표이사", "부사장", "상무"].includes(position)) return "#1A1A1A";
  if (position === "담당") return "#E85D04";
  if (position === "팀장") return "#555";
  if (["수석", "책임"].includes(position)) return "#777";
  return "#999";
}

// ── 부서 그룹 컴포넌트 ────────────────────────────────────────────
function DeptGroup({
  dept,
  members,
}: {
  dept: string;
  members: Array<{
    id: number;
    name: string;
    department: string;
    position: string;
    phone: string | null;
    ext: string | null;
    email: string | null;
    profileImage: string | null;
  }>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-l ml-0" style={{ borderColor: "#E5E7EB" }}>
      {/* 부서 헤더 */}
      <div
        className="flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-gray-50 group"
        onClick={() => setOpen(!open)}
      >
        <span className="text-gray-400 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: "#374151" }}
        >
          <Users size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: "#1F2937" }}>{dept}</div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>{members.length}명</div>
        </div>
      </div>

      {/* 팀원 목록 */}
      {open && members.map((m) => (
        <div
          key={m.id}
          className="ml-14 flex items-center gap-3 py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
          style={{ borderBottom: "1px solid #F3F4F6" }}
        >
          {m.profileImage ? (
            <img
              src={m.profileImage}
              alt={m.name}
              className="w-6 h-6 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: rankColor(m.position) }}
            >
              {m.name.charAt(0)}
            </div>
          )}
          <span className="text-sm font-medium" style={{ color: "#374151" }}>{m.name}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded shrink-0"
            style={{ background: "#F3F4F6", color: "#6B7280" }}
          >{m.position}</span>
          {m.ext && m.ext !== "-" && (
            <span className="text-xs" style={{ color: "#9CA3AF" }}>내선 {m.ext}</span>
          )}
          {m.phone && m.phone !== "-" && (
            <span className="flex items-center gap-1 text-xs ml-auto" style={{ color: "#9CA3AF" }}>
              <Phone size={10} />{m.phone}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function OrgChartPage() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = trpc.employees.list.useQuery({ activeOnly: true });

  // 부서별 그룹핑
  const deptGroups = useMemo(() => {
    const map = new Map<string, typeof employees>();
    employees.forEach((emp) => {
      const dept = emp.department || "기타";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    });
    return Array.from(map.entries()).map(([dept, members]) => ({ dept, members }));
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
        (m.ext ?? "").includes(q)
    );
  }, [employees, search]);

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#1F2937" }}>조직도 / 사내 전화번호부</h1>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              총 {employees.length}명
            </p>
          </div>
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            {(["tree", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v ? "#1F2937" : "transparent",
                  color: view === v ? "white" : "#6B7280",
                }}
              >
                {v === "tree" ? "조직도" : "전화번호부"}
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
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              등록된 직원이 없습니다.
            </p>
            <p className="text-xs mt-1" style={{ color: "#D1D5DB" }}>
              어드민 페이지에서 직원을 등록하면 여기에 표시됩니다.
            </p>
          </div>
        ) : view === "tree" ? (
          <div className="portal-card p-4">
            {deptGroups.map(({ dept, members }) => (
              <DeptGroup key={dept} dept={dept} members={members} />
            ))}
          </div>
        ) : (
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
                  className="bg-transparent outline-none w-40 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div
              className="grid text-xs font-semibold px-4 py-2"
              style={{
                gridTemplateColumns: "1.2fr 130px 70px 90px 160px",
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
            </div>

            {filtered.map((m) => (
              <div
                key={m.id}
                className="grid items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors"
                style={{
                  gridTemplateColumns: "1.2fr 130px 70px 90px 160px",
                  borderBottom: "1px solid #E5E7EB",
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
                      style={{ background: rankColor(m.position) }}
                    >
                      {m.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium" style={{ color: "#1F2937" }}>{m.name}</span>
                </span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.department}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.position}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.ext ?? "-"}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                  <Phone size={11} />{m.phone ?? "-"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

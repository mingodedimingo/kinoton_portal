/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * employees DB 기반으로 렌더링 (어드민에서 직원 정보 수정 시 자동 반영)
 * 조직도: 수직 박스 트리 (위→아래), 전화번호부: 검색 가능 테이블
 */
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { Search, Phone, Mail, Users, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── 색상 팔레트 ──────────────────────────────────────────────────
const COLOR = {
  ceo:  "#1A1A1A",
  exec: "#E85D04",
  dept: "#555555",
  team: "#888888",
  lab:  "#6B7280",
  itc:  "#999999",
};

// ── 조직 트리 구조 (비상연락망 기준 고정) ─────────────────────────
interface OrgNode {
  id: string;
  label: string;
  color: string;
  children?: OrgNode[];
}

const ORG_TREE: OrgNode = {
  id: "ceo", label: "대표이사", color: COLOR.ceo,
  children: [
    {
      id: "mira", label: "미래전략사업본부", color: COLOR.exec,
      children: [
        {
          id: "strategy", label: "경영전략실", color: COLOR.dept,
          children: [
            {
              id: "adv-dept", label: "광고사업담당", color: COLOR.dept,
              children: [
                { id: "adv", label: "광고사업팀", color: COLOR.team },
              ],
            },
            { id: "global", label: "글로벌사업팀",  color: COLOR.team },
            { id: "biz",    label: "경영기획팀",    color: COLOR.team },
            { id: "innov",  label: "경영혁신TASK",  color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "mgmt", label: "경영지원본부", color: COLOR.exec,
      children: [
        {
          id: "mgmt-dept", label: "경영지원담당", color: COLOR.dept,
          children: [
            { id: "account", label: "회계팀",     color: COLOR.team },
            { id: "hr",      label: "인사총무팀", color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "dx", label: "Dx사업본부", color: COLOR.exec,
      children: [
        {
          id: "dx-dept", label: "Dx사업담당", color: COLOR.dept,
          children: [
            { id: "sales1", label: "영업1팀",      color: COLOR.team },
            { id: "sales2", label: "영업2팀",      color: COLOR.team },
            { id: "audio",  label: "오디오사업팀", color: COLOR.team },
            { id: "ops",    label: "운영지원팀",   color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "de", label: "DE사업본부", color: COLOR.exec,
      children: [
        {
          id: "de-dept", label: "DE사업담당", color: COLOR.dept,
          children: [
            { id: "exhibit",  label: "전시팀",     color: COLOR.team },
            { id: "techsale", label: "기술영업팀", color: COLOR.team },
          ],
        },
        {
          id: "strat-dept", label: "전략기획담당", color: COLOR.dept,
          children: [
            { id: "mgmt-team", label: "관리팀", color: COLOR.team },
            { id: "support",   label: "지원팀", color: COLOR.team },
          ],
        },
        {
          id: "de-sales", label: "DE영업총괄", color: COLOR.dept,
          children: [
            {
              id: "tech-total", label: "기술총괄", color: COLOR.dept,
              children: [
                { id: "tech1",    label: "기술1팀",    color: COLOR.team },
                { id: "tech2",    label: "기술2팀",    color: COLOR.team },
                { id: "tech3",    label: "기술3팀",    color: COLOR.team },
                { id: "facility", label: "시설팀",     color: COLOR.team },
                { id: "ops2",     label: "운영지원팀", color: COLOR.team },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "clab", label: "Creative LAB", color: COLOR.lab,
      children: [
        { id: "design",   label: "디자인팀",  color: COLOR.team },
        { id: "plan",     label: "설계파트",  color: COLOR.team },
        { id: "dsgn-pt",  label: "디자인파트",color: COLOR.team },
      ],
    },
    {
      id: "itc", label: "ITC", color: COLOR.itc,
    },
  ],
};

// ── 트리 노드에서 부서명 추출 (label → dept 매핑) ─────────────────
function collectDeptLabels(node: OrgNode): string[] {
  const labels: string[] = [node.label];
  if (node.children) {
    node.children.forEach(c => labels.push(...collectDeptLabels(c)));
  }
  return labels;
}

// ── 직원 타입 ────────────────────────────────────────────────────
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

// ── 직위별 배지 색상 ─────────────────────────────────────────────
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

// ── 직원 미니 카드 (트리 노드 아래 표시) ─────────────────────────
function MiniEmployeeCard({ emp }: { emp: Employee }) {
  const badge = rankBadge(emp.position);
  const [showContact, setShowContact] = useState(false);
  const hasContact = (emp.phone && emp.phone !== "-") || (emp.email && emp.email !== "-");
  return (
    <div
      className="flex flex-col items-center p-2 rounded text-center transition-all hover:shadow-sm"
      style={{
        border: showContact ? "1px solid #BAE6FD" : "1px solid #E5E7EB",
        background: showContact ? "#F0F9FF" : "#FAFAFA",
        minWidth: "72px",
        maxWidth: "90px",
        cursor: hasContact ? "pointer" : "default",
        fontSize: "0.6rem",
      }}
      onClick={() => hasContact && setShowContact(v => !v)}
    >
      {emp.profileImage ? (
        <img
          src={emp.profileImage}
          alt={emp.name}
          className="w-7 h-7 rounded-full object-cover mb-1 shrink-0"
          style={{ border: "1.5px solid #E5E7EB" }}
        />
      ) : (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white mb-1 shrink-0"
          style={{ background: badge.bg, fontSize: "0.65rem" }}
        >
          {emp.name.charAt(0)}
        </div>
      )}
      <p className="font-semibold leading-tight" style={{ color: "#1F2937" }}>{emp.name}</p>
      <span
        className="mt-0.5 px-1 py-0.5 rounded font-medium"
        style={{ background: badge.bg, color: badge.color, fontSize: "0.55rem" }}
      >
        {emp.position}
      </span>
      {emp.ext && emp.ext !== "-" && (
        <p className="mt-0.5" style={{ color: "#9CA3AF" }}>☎ {emp.ext}</p>
      )}
      {showContact && hasContact && (
        <div
          className="mt-1 w-full rounded p-1 text-left"
          style={{ background: "#E0F2FE", border: "1px solid #BAE6FD" }}
          onClick={e => e.stopPropagation()}
        >
          {emp.phone && emp.phone !== "-" && (
            <a href={`tel:${emp.phone}`} className="block hover:underline" style={{ color: "#0369A1" }}>
              📱 {emp.phone}
            </a>
          )}
          {emp.email && emp.email !== "-" && (
            <a href={`mailto:${emp.email}`} className="block hover:underline" style={{ color: "#0369A1", wordBreak: "break-all" }}>
              ✉ {emp.email}
            </a>
          )}
        </div>
      )}
      {hasContact && !showContact && (
        <p style={{ color: "#93C5FD", marginTop: "2px" }}>▼</p>
      )}
    </div>
  );
}

// ── 트리 박스 컴포넌트 ────────────────────────────────────────────
function OrgBox({ node, empMap }: { node: OrgNode; empMap: Map<string, Employee[]> }) {
  const hasChildren = node.children && node.children.length > 0;
  const members = empMap.get(node.label) ?? [];
  const [showMembers, setShowMembers] = useState(false);

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
      {/* 박스 */}
      <div
        className="rounded px-2.5 py-1.5 text-center text-white shrink-0 select-none"
        style={{
          background: node.color,
          minWidth: "80px",
          maxWidth: "120px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          cursor: members.length > 0 ? "pointer" : "default",
        }}
        onClick={() => members.length > 0 && setShowMembers(v => !v)}
        title={members.length > 0 ? `${members.length}명 · 클릭하여 보기` : undefined}
      >
        <div className="text-xs font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{node.label}</div>
        {members.length > 0 && (
          <div className="text-xs opacity-70 leading-tight mt-0.5" style={{ fontSize: "0.6rem" }}>
            {members.length}명 {showMembers ? "▲" : "▼"}
          </div>
        )}
      </div>

      {/* 직원 카드 팝업 */}
      {showMembers && members.length > 0 && (
        <div
          className="flex flex-wrap gap-1 justify-center mt-1 p-1.5 rounded"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", maxWidth: "320px" }}
        >
          {members.map(emp => (
            <MiniEmployeeCard key={emp.id} emp={emp} />
          ))}
        </div>
      )}

      {/* 아래 연결선 + 자식 */}
      {hasChildren && (
        <>
          {/* 수직선 */}
          <div style={{ width: "1px", height: "16px", background: "#CBD5E1" }} />

          {/* 수평 분기 + 자식들 */}
          <div className="relative flex items-start justify-center" style={{ width: "100%" }}>
            {node.children!.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: `calc(100% - 80px)`,
                  height: "1px",
                  background: "#CBD5E1",
                }}
              />
            )}
            <div className="flex items-start justify-center gap-3 flex-wrap">
              {node.children!.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div style={{ width: "1px", height: "16px", background: "#CBD5E1" }} />
                  <OrgBox node={child} empMap={empMap} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function OrgChartPage() {
  const [view, setView] = useState<"org" | "list">("org");
  const [search, setSearch] = useState("");

  const { data: employees = [], isLoading } = trpc.employees.list.useQuery({ activeOnly: true });

  // 부서명 → 직원 목록 맵 생성
  const empMap = useMemo(() => {
    const map = new Map<string, Employee[]>();
    employees.forEach((emp) => {
      const dept = emp.department || "기타";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    });
    return map;
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
              총 {employees.length}명 · 박스 클릭 시 소속 직원 표시
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
        ) : view === "org" ? (
          /* ── 조직도 트리 뷰 ── */
          <div className="portal-card p-6 overflow-x-auto">
            <div style={{ minWidth: "900px" }}>
              <OrgBox node={ORG_TREE} empMap={empMap} />
            </div>
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
                  className="bg-transparent outline-none w-40 text-xs"
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

            {employees.length === 0 ? (
              <div className="portal-card p-8 text-center">
                <Users size={32} className="mx-auto mb-3" style={{ color: "#D1D5DB" }} />
                <p className="text-sm" style={{ color: "#9CA3AF" }}>등록된 직원이 없습니다.</p>
              </div>
            ) : filtered.map((m) => {
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

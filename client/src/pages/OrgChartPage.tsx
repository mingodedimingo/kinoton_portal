/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * 비상연락망(2026.07) + 조직도상세 PDF 크로스체크 기준으로 전면 재수정
 * - 조직도: 수직 박스 트리 (위→아래)
 * - 직원 카드 클릭 시 중앙 모달 팝업 (배경 블러)
 * - 전화번호부: 검색 가능 테이블
 */
import { useState, useMemo } from "react";
import PortalLayout from "@/components/PortalLayout";
import { Search, Phone, Mail, Users, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── 색상 팔레트 ──────────────────────────────────────────────────
const COLOR = {
  ceo:   "#1A1A1A",
  exec:  "#E85D04",
  dept:  "#555555",
  team:  "#888888",
  lab:   "#6B7280",
  itc:   "#999999",
  invest:"#374151",
};

// ── 조직 트리 구조 (비상연락망 2026.07 + 조직도상세 PDF 기준) ──────
interface OrgNode {
  id: string;
  label: string;
  subLabel?: string; // 담당자/직함 표시
  color: string;
  children?: OrgNode[];
}

const ORG_TREE: OrgNode = {
  id: "ceo", label: "대표이사", subLabel: "배윤성", color: COLOR.ceo,
  children: [
    // ── 투자전략실 ──────────────────────────────────────────────
    {
      id: "invest", label: "투자전략실", subLabel: "부사장 고현환", color: COLOR.invest,
    },
    // ── 미래전략사업본부 ─────────────────────────────────────────
    {
      id: "mira", label: "미래전략사업본부", subLabel: "부사장 배우성", color: COLOR.exec,
      children: [
        {
          id: "strategy-dept", label: "권역망영업담당", subLabel: "담당 정도영", color: COLOR.dept,
          children: [
            { id: "adv",    label: "광고사업팀",  color: COLOR.team },
            { id: "global", label: "글로벌사업팀", color: COLOR.team },
          ],
        },
      ],
    },
    // ── 경영지원본부 ─────────────────────────────────────────────
    {
      id: "mgmt", label: "경영지원본부", subLabel: "상무 권현철", color: COLOR.exec,
      children: [
        {
          id: "mgmt-dept", label: "경영지원담당", subLabel: "담당 오봉희", color: COLOR.dept,
          children: [
            { id: "biz",     label: "경영기획팀",    color: COLOR.team },
            { id: "innov",   label: "경영혁신TASK",  color: COLOR.team },
            { id: "account", label: "회계팀",        color: COLOR.team },
            { id: "hr",      label: "인사총무팀",    color: COLOR.team },
          ],
        },
      ],
    },
    // ── Dx 사업본부 ──────────────────────────────────────────────
    {
      id: "dx", label: "Dx사업본부", subLabel: "부사장 신현준", color: COLOR.exec,
      children: [
        {
          id: "dx-dept", label: "Dx사업담당", subLabel: "담당 최재설", color: COLOR.dept,
          children: [
            { id: "sales1", label: "영업1팀",      color: COLOR.team },
            { id: "sales2", label: "영업2팀",      color: COLOR.team },
            { id: "audio",  label: "오디오사업팀", color: COLOR.team },
          ],
        },
      ],
    },
    // ── DE사업본부 ───────────────────────────────────────────────
    {
      id: "de", label: "DE사업본부", subLabel: "겸) 대표이사", color: COLOR.exec,
      children: [
        {
          id: "de-strat", label: "전략기획담당", subLabel: "담당 이미화", color: COLOR.dept,
          children: [
            { id: "mgmt-team", label: "관리팀", color: COLOR.team },
            { id: "support",   label: "지원팀", color: COLOR.team },
          ],
        },
        {
          id: "de-sales", label: "DE영업총괄", subLabel: "수석 길효철", color: COLOR.dept,
          children: [
            { id: "exhibit",  label: "전시팀",     color: COLOR.team },
            { id: "techsale", label: "기술영업팀", color: COLOR.team },
          ],
        },
      ],
    },
    // ── 기술총괄 ─────────────────────────────────────────────────
    {
      id: "tech-total", label: "기술총괄", subLabel: "수석 정현석", color: COLOR.dept,
      children: [
        { id: "tech1",    label: "기술1팀",    color: COLOR.team },
        { id: "tech2",    label: "기술2팀",    color: COLOR.team },
        { id: "tech3",    label: "기술3팀",    color: COLOR.team },
        { id: "facility", label: "시설팀",     color: COLOR.team },
        { id: "ops",      label: "운영지원팀", color: COLOR.team },
      ],
    },
    // ── Creative LAB ─────────────────────────────────────────────
    {
      id: "clab", label: "Creative LAB", subLabel: "상무 박태춘", color: COLOR.lab,
      children: [
        {
          id: "design-team", label: "디자인팀", subLabel: "팀장 김정희", color: COLOR.team,
          children: [
            { id: "plan",    label: "설계파트",   color: COLOR.team },
            { id: "dsgn-pt", label: "디자인파트", color: COLOR.team },
          ],
        },
      ],
    },
    // ── ITC ──────────────────────────────────────────────────────
    {
      id: "itc", label: "ITC", subLabel: "수석 김민", color: COLOR.itc,
    },
  ],
};

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
  if (["대표이사"].includes(position))           return { bg: "#1A1A1A", color: "#FFF" };
  if (["부사장"].includes(position))             return { bg: "#374151", color: "#FFF" };
  if (["상무"].includes(position))               return { bg: "#4B5563", color: "#FFF" };
  if (["담당"].includes(position))               return { bg: "#E85D04", color: "#FFF" };
  if (["팀장"].includes(position))               return { bg: "#2563EB", color: "#FFF" };
  if (["수석"].includes(position))               return { bg: "#7C3AED", color: "#FFF" };
  if (["책임"].includes(position))               return { bg: "#0369A1", color: "#FFF" };
  if (["선임"].includes(position))               return { bg: "#047857", color: "#FFF" };
  if (["사원", "주임"].includes(position))       return { bg: "#6B7280", color: "#FFF" };
  return { bg: "#9CA3AF", color: "#FFF" };
}

// ── 프로필 팝업 모달 ─────────────────────────────────────────────
function ProfileModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const badge = rankBadge(emp.position);
  return (
    <>
      {/* 배경 블러 딤 */}
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      {/* 모달 카드 */}
      <div
        className="fixed z-[201] left-1/2 top-1/2"
        style={{
          transform: "translate(-50%, -50%)",
          width: "min(380px, 90vw)",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        {/* 상단 헤더 배경 */}
        <div
          className="relative flex flex-col items-center pt-8 pb-5 px-6"
          style={{ background: badge.bg }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <X size={16} className="text-white" />
          </button>
          {emp.profileImage ? (
            <img
              src={emp.profileImage}
              alt={emp.name}
              className="w-20 h-20 rounded-full object-cover mb-3"
              style={{ border: "3px solid rgba(255,255,255,0.6)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-3"
              style={{ background: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.4)" }}
            >
              {emp.name.charAt(0)}
            </div>
          )}
          <h2 className="text-xl font-bold text-white leading-tight">{emp.name}</h2>
          <span
            className="mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.25)", color: "#fff" }}
          >
            {emp.position}
          </span>
        </div>

        {/* 상세 정보 */}
        <div className="px-6 py-5 flex flex-col gap-3">
          <InfoRow icon="🏢" label="부서" value={emp.department} />
          {emp.ext && emp.ext !== "-" && (
            <InfoRow icon="☎" label="내선번호" value={emp.ext} href={`tel:${emp.ext}`} />
          )}
          {emp.phone && emp.phone !== "-" && (
            <InfoRow icon="📱" label="휴대폰" value={emp.phone} href={`tel:${emp.phone}`} />
          )}
          {emp.email && emp.email !== "-" && (
            <InfoRow
              icon="✉"
              label="이메일"
              value={`${emp.email}@kinoton.co.kr`}
              href={`mailto:${emp.email}@kinoton.co.kr`}
            />
          )}
        </div>
      </div>
    </>
  );
}

function InfoRow({
  icon, label, value, href,
}: { icon: string; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: "#9CA3AF" }}>{label}</p>
        {href ? (
          <a
            href={href}
            className="text-sm font-semibold hover:underline truncate block"
            style={{ color: "#1F2937" }}
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-semibold truncate" style={{ color: "#1F2937" }}>{value}</p>
        )}
      </div>
    </div>
  );
}

// ── 직원 미니 카드 (트리 노드 아래 표시) ─────────────────────────
function MiniEmployeeCard({
  emp,
  onOpenModal,
}: {
  emp: Employee;
  onOpenModal: (emp: Employee) => void;
}) {
  const badge = rankBadge(emp.position);
  return (
    <div
      className="flex flex-col items-center p-2 rounded text-center transition-all hover:shadow-md hover:scale-105 cursor-pointer"
      style={{
        border: "1px solid #E5E7EB",
        background: "#FAFAFA",
        minWidth: "72px",
        maxWidth: "90px",
        fontSize: "0.6rem",
      }}
      onClick={() => onOpenModal(emp)}
      title={`${emp.name} - 클릭하여 상세 보기`}
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
    </div>
  );
}

// ── 트리 박스 컴포넌트 ────────────────────────────────────────────
function OrgBox({
  node,
  empMap,
  onOpenModal,
}: {
  node: OrgNode;
  empMap: Map<string, Employee[]>;
  onOpenModal: (emp: Employee) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const members = empMap.get(node.label) ?? [];
  const [showMembers, setShowMembers] = useState(false);

  return (
    <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
      {/* 박스 */}
      <div
        className="rounded px-2.5 py-1.5 text-center text-white shrink-0 select-none transition-all hover:opacity-90"
        style={{
          background: node.color,
          minWidth: "88px",
          maxWidth: "130px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
          cursor: members.length > 0 ? "pointer" : "default",
        }}
        onClick={() => members.length > 0 && setShowMembers(v => !v)}
        title={members.length > 0 ? `${members.length}명 · 클릭하여 보기` : undefined}
      >
        <div className="text-xs font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
          {node.label}
        </div>
        {node.subLabel && (
          <div className="leading-tight mt-0.5 opacity-80" style={{ fontSize: "0.58rem" }}>
            {node.subLabel}
          </div>
        )}
        {members.length > 0 && (
          <div className="opacity-60 leading-tight mt-0.5" style={{ fontSize: "0.58rem" }}>
            {members.length}명 {showMembers ? "▲" : "▼"}
          </div>
        )}
      </div>

      {/* 직원 카드 목록 (펼침) */}
      {showMembers && members.length > 0 && (
        <div
          className="flex flex-wrap gap-1 justify-center mt-1 p-1.5 rounded"
          style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", maxWidth: "340px" }}
        >
          {members.map(emp => (
            <MiniEmployeeCard key={emp.id} emp={emp} onOpenModal={onOpenModal} />
          ))}
        </div>
      )}

      {/* 아래 연결선 + 자식 */}
      {hasChildren && (
        <>
          <div style={{ width: "1px", height: "16px", background: "#CBD5E1" }} />
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
                  <OrgBox node={child} empMap={empMap} onOpenModal={onOpenModal} />
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
  const [modalEmp, setModalEmp] = useState<Employee | null>(null);

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
              총 {employees.length}명 · 박스 클릭 시 소속 직원 표시 · 직원 카드 클릭 시 상세 정보
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
            <div style={{ minWidth: "1000px" }}>
              <OrgBox node={ORG_TREE} empMap={empMap} onOpenModal={setModalEmp} />
            </div>
          </div>
        ) : (
          /* ── 전화번호부 뷰 ── */
          <div className="portal-card">
            <div className="section-header">
              <span className="section-title">
                임직원 목록
                <span
                  className="ml-1.5 text-xs font-normal"
                  style={{ color: "#9CA3AF" }}
                >
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
                  className="grid items-center px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{
                    gridTemplateColumns: "1.4fr 130px 70px 90px 160px 200px",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                  onClick={() => setModalEmp(m)}
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
                    {m.ext && m.ext !== "-" ? m.ext : "—"}
                  </span>
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    {m.phone && m.phone !== "-" ? (
                      <a
                        href={`tel:${m.phone}`}
                        className="hover:underline"
                        style={{ color: "#2563EB" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {m.phone}
                      </a>
                    ) : "—"}
                  </span>
                  <span className="text-xs truncate" style={{ color: "#6B7280" }}>
                    {m.email && m.email !== "-" ? (
                      <a
                        href={`mailto:${m.email}@kinoton.co.kr`}
                        className="hover:underline"
                        style={{ color: "#2563EB" }}
                        onClick={e => e.stopPropagation()}
                      >
                        {m.email}@kinoton.co.kr
                      </a>
                    ) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 프로필 팝업 모달 */}
      {modalEmp && (
        <ProfileModal emp={modalEmp} onClose={() => setModalEmp(null)} />
      )}
    </PortalLayout>
  );
}

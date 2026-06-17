/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * 형식: 트리 리스트 (들여쓰기 계층 구조)
 * 인원: 비상연락망 2026.06 기준 + 수정사항 14개 반영
 */
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronRight, Phone, User } from "lucide-react";

// ── 타입 ─────────────────────────────────────────────────────────
interface Member {
  name: string;
  title: string;
  phone?: string;
  ext?: string;
}

interface OrgNode {
  name: string;
  title: string;
  person: string;
  color?: string;
  members?: Member[];
  children?: OrgNode[];
}

// ── 조직 데이터 ───────────────────────────────────────────────────
const ORG_DATA: OrgNode = {
  name: "키노톤(주)", title: "대표이사", person: "배윤성",
  members: [{ name: "배윤성", title: "대표이사", phone: "010-3725-7806", ext: "1910" }],
  children: [

    // ── 미래전략사업본부 ──────────────────────────────────────────
    {
      name: "미래전략사업본부", title: "부사장", person: "배우성",
      members: [{ name: "배우성", title: "부사장", phone: "010-9216-7806", ext: "1911" }],
      children: [
        {
          name: "경영전략실", title: "상무", person: "권현철",
          members: [{ name: "권현철", title: "상무", phone: "010-8181-9650", ext: "1914" }],
          children: [
            {
              name: "광고사업담당", title: "담당", person: "정도영",
              members: [{ name: "정도영", title: "담당", phone: "010-3409-6335", ext: "1920" }],
              children: [
                {
                  name: "광고사업팀", title: "팀장", person: "제성헌",
                  members: [
                    { name: "제성헌", title: "팀장", phone: "010-4706-2452", ext: "1926" },
                    { name: "최원준", title: "책임", phone: "010-7377-0720", ext: "1927" },
                  ],
                },
              ],
            },
            {
              // 1. 신정운·박진우 → DE 전시팀으로 이동 / 2. 문대형 → 기술1팀으로 이동
              name: "글로벌사업팀", title: "팀장", person: "최우성",
              members: [
                { name: "최우성", title: "팀장", phone: "010-3665-6542", ext: "1929" },
                { name: "강민구", title: "책임", phone: "010-8970-4592", ext: "1930" },
              ],
            },
            {
              // 3. 문대훈 → 기술2팀으로 이동
              name: "경영기획팀", title: "팀장", person: "박찬훈",
              members: [
                { name: "박찬훈", title: "팀장", phone: "010-4027-0717", ext: "1925" },
                { name: "김진형", title: "책임", phone: "010-2699-5330", ext: "1935" },
                { name: "장민석", title: "책임", phone: "010-9927-9985", ext: "1936" },
                { name: "김민구", title: "선임", phone: "010-4334-3876", ext: "1928" },
              ],
            },
            {
              // 4. 이다니엘 → 기술2팀으로 이동
              name: "경영혁신TASK", title: "팀장", person: "김영진",
              members: [
                { name: "김영진", title: "팀장", phone: "010-2519-1934", ext: "1934" },
              ],
            },
          ],
        },
      ],
    },

    // ── 경영지원본부 ──────────────────────────────────────────────
    {
      name: "경영지원본부", title: "부사장", person: "고영환",
      members: [{ name: "고영환", title: "부사장", phone: "010-5789-0221", ext: "1912" }],
      children: [
        {
          name: "경영지원담당", title: "담당", person: "오봉희",
          members: [{ name: "오봉희", title: "담당", phone: "010-3714-8259", ext: "1917" }],
          children: [
            {
              // 5·6. 이승호·장호균 → 기술2팀으로 이동
              name: "회계팀", title: "팀장", person: "임지혜",
              members: [
                { name: "임지혜", title: "팀장", phone: "010-2220-2960", ext: "1902" },
                { name: "강나연", title: "책임", phone: "010-8757-9638", ext: "1903" },
                { name: "강해리", title: "선임", phone: "010-9573-0921", ext: "1905" },
                { name: "박채윤", title: "선임", phone: "010-2376-0499", ext: "1906" },
              ],
            },
            {
              name: "인사총무팀", title: "선임", person: "유진희",
              members: [
                { name: "유진희", title: "선임", phone: "010-4951-1747", ext: "1904" },
                { name: "이아현", title: "선임", phone: "010-3793-8842", ext: "1900" },
              ],
            },
          ],
        },
      ],
    },

    // ── Dx사업본부 ────────────────────────────────────────────────
    {
      name: "Dx사업본부", title: "부사장", person: "신현준",
      members: [{ name: "신현준", title: "부사장", phone: "010-3716-1738", ext: "1913" }],
      children: [
        {
          name: "Dx사업담당", title: "담당", person: "최재설",
          members: [{ name: "최재설", title: "담당", phone: "010-3724-1448", ext: "1916" }],
          children: [
            {
              // 7. 김계론 → 시설팀으로 이동
              name: "영업1팀", title: "팀장(공석)", person: "공석",
              members: [
                { name: "김종수", title: "책임", phone: "010-4735-4968", ext: "1940" },
                { name: "손명훈", title: "책임", phone: "010-9332-8817", ext: "1942" },
                { name: "서재덕", title: "책임", phone: "010-5558-2896", ext: "1951" },
                { name: "신민영", title: "선임", phone: "010-3381-0546", ext: "1941" },
              ],
            },
            {
              name: "영업2팀", title: "팀장", person: "윤승현",
              members: [
                { name: "윤승현", title: "팀장", phone: "010-2299-8590", ext: "1950" },
                { name: "하경철", title: "책임", phone: "010-9133-6288", ext: "1960" },
              ],
            },
            {
              name: "오디오사업팀", title: "책임", person: "이재원",
              members: [
                { name: "이재원", title: "책임", phone: "010-9914-1617", ext: "6252-5620" },
                { name: "김설아", title: "선임", phone: "010-7794-9784", ext: "6252-5623" },
              ],
            },
            // 8. 운영지원팀은 기술총괄 하위로 이동 (여기서 제거)
          ],
        },
      ],
    },

    // ── DE사업본부 ────────────────────────────────────────────────
    {
      name: "DE사업본부", title: "겸 대표이사", person: "배윤성",
      children: [
        {
          // 9. DE영업총괄 길효철 수석 → 김광섭 담당 밑에서 전시팀·기술영업팀 관리
          name: "DE사업담당", title: "담당", person: "김광섭",
          members: [{ name: "김광섭", title: "담당", phone: "010-9041-8668", ext: "1919" }],
          children: [
            {
              name: "DE영업총괄", title: "수석", person: "길효철",
              members: [{ name: "길효철", title: "수석", phone: "010-4543-8898", ext: "1921" }],
              children: [
                {
                  // 1. 신정운·박진우 이동 / 10. 김동민 책임 추가
                  name: "전시팀", title: "책임", person: "김동민",
                  members: [
                    { name: "김동민", title: "책임", phone: "010-8668-0222", ext: "1989" },
                    { name: "신정운", title: "책임", phone: "010-2066-5629", ext: "1974" },
                    { name: "박진우", title: "책임", phone: "010-9658-8030", ext: "1975" },
                  ],
                },
                {
                  name: "기술영업팀", title: "수석", person: "길효철",
                  members: [
                    { name: "길효철", title: "수석", phone: "010-4543-8898", ext: "1921" },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "전략기획담당", title: "담당", person: "이미화",
          members: [{ name: "이미화", title: "담당", phone: "010-3688-4998", ext: "1918" }],
          children: [
            {
              // 12. 관리팀: 민경진, 이지은, 한민, 이윤철
              name: "관리팀", title: "수석", person: "박상규",
              members: [
                { name: "박상규", title: "수석", phone: "010-8996-2417", ext: "-" },
                { name: "민경진", title: "책임", phone: "010-7441-3413", ext: "-" },
                { name: "이지은", title: "책임", phone: "010-7344-6405", ext: "1990" },
                { name: "한민",   title: "선임", phone: "010-9047-9747", ext: "1993" },
                { name: "이윤철", title: "선임", phone: "010-2050-1362", ext: "-" },
              ],
            },
            {
              // 12. 지원팀: 장령, 김민경
              name: "지원팀", title: "책임", person: "장령",
              members: [
                { name: "장령",   title: "책임", phone: "010-2294-0203", ext: "1991" },
                { name: "김민경", title: "선임", phone: "010-5361-4906", ext: "1992" },
              ],
            },
            {
              // 11. 이머시브미디어랩 (이름 변경) → 전략기획담당 이미화 밑, 박상규 수석 추가
              name: "이머시브미디어랩", title: "수석", person: "박상규",
              members: [
                { name: "박상규", title: "수석", phone: "010-8996-2417", ext: "-" },
                { name: "정현석", title: "수석", phone: "010-4441-4576", ext: "1980" },
              ],
            },
          ],
        },
        {
          // 13. 기술총괄 — 이미지 기준으로 정현석 수석 하위에 5개 팀
          name: "기술총괄", title: "수석", person: "정현석",
          members: [{ name: "정현석", title: "수석", phone: "010-4441-4576", ext: "1980" }],
          children: [
            {
              // 2. 문대형 이동 포함
              name: "기술1팀", title: "팀장", person: "유정식",
              members: [
                { name: "유정식", title: "팀장", phone: "010-6317-1211", ext: "1981" },
                { name: "이민구", title: "책임", phone: "010-5359-5239", ext: "1944" },
                { name: "송종현", title: "책임", phone: "010-7244-9694", ext: "1984" },
                { name: "문대형", title: "책임", phone: "010-3900-6996", ext: "1985" },
                { name: "김주훈", title: "선임", phone: "010-7359-9590", ext: "1986" },
                { name: "김희재", title: "선임", phone: "010-3112-0637", ext: "1988" },
              ],
            },
            {
              // 3·4·5·6. 문대훈·이다니엘·이승호·장호균 이동 포함
              name: "기술2팀", title: "팀장", person: "정철훈",
              members: [
                { name: "정철훈", title: "팀장", phone: "010-2804-5493", ext: "1982" },
                { name: "최용호", title: "책임", phone: "010-8796-4967", ext: "1946" },
                { name: "문대훈", title: "책임", phone: "010-9695-5082", ext: "1996" },
                { name: "이다니엘", title: "선임", phone: "010-3598-9723", ext: "1997" },
                { name: "이승호", title: "선임", phone: "010-8232-9102", ext: "1976" },
                { name: "장호균", title: "선임", phone: "010-3438-4337", ext: "1998" },
              ],
            },
            {
              name: "기술3팀", title: "팀장", person: "장춘봉",
              members: [
                { name: "장춘봉", title: "팀장", phone: "010-9449-0360", ext: "1947" },
                { name: "김기영", title: "책임", phone: "010-4353-0727", ext: "1945" },
                { name: "장모세", title: "선임", phone: "010-5177-4004", ext: "1987" },
              ],
            },
            {
              // 7. 김계론 시설팀으로 이동
              name: "시설팀", title: "팀장", person: "최문희",
              members: [
                { name: "최문희", title: "팀장", phone: "010-8958-6337", ext: "1983" },
                { name: "이상우", title: "책임", phone: "010-8789-1179", ext: "-" },
                { name: "이찬익", title: "책임", phone: "010-5432-9040", ext: "-" },
                { name: "김도경", title: "책임", phone: "010-5155-3903", ext: "-" },
                { name: "김계론", title: "사원",  phone: "010-7620-2822", ext: "-" },
              ],
            },
            {
              // 8. 운영지원팀 → 기술총괄 하위로 이동
              name: "운영지원팀", title: "팀장", person: "이병민",
              members: [
                { name: "이병민", title: "팀장", phone: "010-2000-5964", ext: "1943" },
                { name: "양대웅", title: "책임", phone: "010-4824-4724", ext: "1994" },
                { name: "조준현", title: "책임", phone: "010-7101-6409", ext: "1977" },
                { name: "김초원", title: "선임", phone: "010-3723-4377", ext: "1931" },
                { name: "이원진", title: "사원",  phone: "010-2220-5173", ext: "1995" },
                { name: "이승재", title: "사원",  phone: "010-5181-5546", ext: "1932" },
              ],
            },
          ],
        },
      ],
    },

    // ── Creative LAB ──────────────────────────────────────────────
    {
      name: "Creative LAB", title: "상무", person: "박태춘",
      members: [{ name: "박태춘", title: "상무", phone: "010-3349-3030", ext: "1915" }],
      children: [
        {
          name: "디자인팀", title: "팀장", person: "김정희",
          members: [
            { name: "김정희", title: "팀장", phone: "010-2330-8757", ext: "1961" },
          ],
        },
        {
          // 14. 설계파트: 한인희, 최수민, 유소연, 김승태, 김성민
          name: "설계파트", title: "책임", person: "한인희",
          members: [
            { name: "한인희", title: "책임", phone: "010-7226-8423", ext: "1962" },
            { name: "최수민", title: "책임", phone: "010-5504-5130", ext: "1963" },
            { name: "유소연", title: "선임", phone: "010-8842-0550", ext: "1964" },
            { name: "김승태", title: "선임", phone: "010-2733-5465", ext: "1965" },
            { name: "김성민", title: "사원",  phone: "010-4823-0579", ext: "1970" },
          ],
        },
        {
          // 14. 디자인파트: 최강, 유상균, 서연주, 고은솔
          name: "디자인파트", title: "책임", person: "최강",
          members: [
            { name: "최강",   title: "책임", phone: "010-8810-9538", ext: "1966" },
            { name: "유상균", title: "책임", phone: "010-6655-4806", ext: "1967" },
            { name: "서연주", title: "선임", phone: "010-5188-3853", ext: "1968" },
            { name: "고은솔", title: "선임", phone: "010-4150-0504", ext: "1969" },
          ],
        },
      ],
    },

    // ── ITC ───────────────────────────────────────────────────────
    {
      name: "ITC", title: "수석", person: "김민",
      members: [
        { name: "김민", title: "수석", phone: "010-9097-8156", ext: "한국" },
      ],
    },
  ],
};

// ── 직위별 배지 색상 ─────────────────────────────────────────────
function rankColor(title: string) {
  if (["대표이사", "부사장", "상무"].includes(title)) return "#1A1A1A";
  if (title === "담당") return "#E85D04";
  if (title === "팀장") return "#555";
  if (["수석", "책임"].includes(title)) return "#777";
  return "#999";
}

// ── OrgNode 컴포넌트 ─────────────────────────────────────────────
function OrgNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!node.children?.length;
  const hasMembers = !!node.members?.length;

  const avatarBg =
    depth === 0 ? "#1A1A1A"
    : depth === 1 ? "#E85D04"
    : depth === 2 ? "#555"
    : "#888";

  return (
    <div className={depth > 0 ? "ml-6 border-l" : ""} style={{ borderColor: "#E5E7EB" }}>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-gray-50 group"
        onClick={() => (hasChildren || hasMembers) && setOpen(!open)}
      >
        {(hasChildren || hasMembers) ? (
          <span className="text-gray-400 shrink-0">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : <span className="w-3.5 shrink-0" />}

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: avatarBg }}
        >
          {node.person.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "#1F2937" }}>{node.name}</span>
          </div>
          <div className="text-xs" style={{ color: "#9CA3AF" }}>{node.title} · {node.person}</div>
        </div>

        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
          style={{ color: "#9CA3AF" }}
          onClick={(e) => { e.stopPropagation(); toast(`${node.person} 정보 준비 중`); }}
        >
          <User size={13} />
        </button>
      </div>

      {open && (
        <>
          {hasMembers && node.members!.filter(m => m.name !== node.person).map((m) => (
            <div
              key={`${m.name}-${m.title}`}
              className="ml-14 flex items-center gap-3 py-1.5 px-3 rounded hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => toast(`${m.name} 프로필 준비 중`)}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: rankColor(m.title) }}
              >
                {m.name.charAt(0)}
              </div>
              <span className="text-sm font-medium" style={{ color: "#374151" }}>{m.name}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded shrink-0"
                style={{ background: "#F3F4F6", color: "#6B7280" }}
              >{m.title}</span>
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

          {hasChildren && node.children!.map((child) => (
            <OrgNode key={`${child.name}-${child.person}`} node={child} depth={depth + 1} />
          ))}
        </>
      )}
    </div>
  );
}

// ── 전화번호부용 플랫 목록 ────────────────────────────────────────
function flattenMembers(node: OrgNode, dept = ""): Array<{ name: string; dept: string; title: string; phone: string; ext: string }> {
  const result: Array<{ name: string; dept: string; title: string; phone: string; ext: string }> = [];
  const deptName = node.members ? node.name : dept;

  if (node.members) {
    node.members.forEach(m => {
      result.push({
        name: m.name,
        dept: deptName,
        title: m.title,
        phone: m.phone || "-",
        ext: m.ext || "-",
      });
    });
  }
  node.children?.forEach(child => {
    result.push(...flattenMembers(child, deptName));
  });
  return result;
}

const ALL_MEMBERS = (() => {
  const raw = flattenMembers(ORG_DATA);
  return raw.filter((m, i, arr) => arr.findIndex(x => x.name === m.name && x.dept === m.dept) === i);
})();

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function OrgChartPage() {
  const [view, setView] = useState<"tree" | "list">("tree");
  const [search, setSearch] = useState("");

  const filtered = ALL_MEMBERS.filter(m =>
    !search ||
    m.name.includes(search) ||
    m.dept.includes(search) ||
    m.title.includes(search) ||
    m.phone.includes(search)
  );

  return (
    <PortalLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold" style={{ color: "#1F2937" }}>조직도 / 사내 전화번호부</h1>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
              2026.06 기준 · 총 {ALL_MEMBERS.length}명
            </p>
          </div>
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            {(["tree", "list"] as const).map(v => (
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

        {view === "tree" ? (
          <div className="portal-card p-4">
            <OrgNode node={ORG_DATA} />
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
                  onChange={e => setSearch(e.target.value)}
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
              <span>이름</span><span>부서</span><span>직위</span><span>내선</span><span>휴대폰</span>
            </div>

            {filtered.map((m, idx) => (
              <div
                key={`${m.name}-${m.dept}-${idx}`}
                className="grid items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                style={{
                  gridTemplateColumns: "1.2fr 130px 70px 90px 160px",
                  borderBottom: "1px solid #E5E7EB",
                }}
                onClick={() => toast(`${m.name} 프로필 준비 중`)}
              >
                <span className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: rankColor(m.title) }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <span className="font-medium" style={{ color: "#1F2937" }}>{m.name}</span>
                </span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.dept}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.title}</span>
                <span className="text-xs" style={{ color: "#6B7280" }}>{m.ext}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "#6B7280" }}>
                  <Phone size={11} />{m.phone}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

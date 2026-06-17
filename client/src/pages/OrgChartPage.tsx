/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * 조직도: 이미지 기준 수직 박스 트리 (위→아래)
 * 인원: 비상연락망 2026.06 PDF 기준
 */
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, Phone, Mail } from "lucide-react";

// ── 색상 팔레트 ──────────────────────────────────────────────────
const COLOR = {
  ceo:    "#1A1A1A",   // 대표이사
  exec:   "#E85D04",   // 본부 (오렌지)
  dept:   "#555555",   // 담당/실
  team:   "#888888",   // 팀/파트
  itc:    "#999999",   // ITC
  lab:    "#6B7280",   // Creative LAB
};

// ── 조직 데이터 (비상연락망 PDF 기준) ────────────────────────────
// 구조: { id, label, sub, color, children }
const ORG: OrgNode = {
  id: "ceo", label: "대표이사", sub: "배윤성", color: COLOR.ceo,
  children: [
    {
      id: "mira", label: "미래전략사업본부", sub: "부사장 배우성", color: COLOR.exec,
      children: [
        {
          id: "strategy", label: "경영전략실", sub: "상무 권현철", color: COLOR.dept,
          children: [
            {
              id: "adv-dept", label: "광고사업담당", sub: "담당 정도영", color: COLOR.dept,
              children: [
                { id: "adv", label: "광고사업팀", sub: "팀장 제성헌", color: COLOR.team },
              ],
            },
            { id: "global", label: "글로벌사업팀", sub: "팀장 최우성", color: COLOR.team },
            { id: "biz",    label: "경영기획팀",   sub: "팀장 박찬훈", color: COLOR.team },
            { id: "innov",  label: "경영혁신TASK", sub: "팀장 김영진", color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "mgmt", label: "경영지원본부", sub: "부사장 고영환", color: COLOR.exec,
      children: [
        {
          id: "mgmt-dept", label: "경영지원담당", sub: "담당 오봉희", color: COLOR.dept,
          children: [
            { id: "account", label: "회계팀",     sub: "팀장 임지혜", color: COLOR.team },
            { id: "hr",      label: "인사총무팀", sub: "선임 유진희", color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "dx", label: "Dx사업본부", sub: "부사장 신현준", color: COLOR.exec,
      children: [
        {
          id: "dx-dept", label: "Dx사업담당", sub: "담당 최재설", color: COLOR.dept,
          children: [
            { id: "sales1", label: "영업1팀",      sub: "팀장 공석",   color: COLOR.team },
            { id: "sales2", label: "영업2팀",      sub: "팀장 윤승현", color: COLOR.team },
            { id: "audio",  label: "오디오사업팀", sub: "책임 이재원", color: COLOR.team },
            { id: "ops",    label: "운영지원팀",   sub: "팀장 이병민", color: COLOR.team },
          ],
        },
      ],
    },
    {
      id: "de", label: "DE사업본부", sub: "겸 대표이사", color: COLOR.exec,
      children: [
        {
          id: "de-dept", label: "DE사업담당", sub: "담당 김광섭", color: COLOR.dept,
          children: [
            { id: "exhibit",  label: "전시팀",           sub: "책임 김동민", color: COLOR.team },
            { id: "techsale", label: "기술영업팀",       sub: "겸수석 길효철", color: COLOR.team },
            { id: "immersive",label: "이머시브미디어팀", sub: "겸수석 정현석", color: COLOR.team },
          ],
        },
        {
          id: "strat-dept", label: "전략기획담당", sub: "담당 이미화", color: COLOR.dept,
          children: [
            { id: "mgmt-team", label: "관리팀", sub: "책임 박상규", color: COLOR.team },
            { id: "support",   label: "지원팀", sub: "책임 장령",   color: COLOR.team },
          ],
        },
        {
          id: "de-sales", label: "DE영업총괄", sub: "수석 길효철", color: COLOR.dept,
          children: [
            {
              id: "tech-total", label: "기술총괄", sub: "수석 정현석", color: COLOR.dept,
              children: [
                { id: "tech1",    label: "기술1팀",   sub: "팀장 유정식", color: COLOR.team },
                { id: "tech2",    label: "기술2팀",   sub: "팀장 정철훈", color: COLOR.team },
                { id: "tech3",    label: "기술3팀",   sub: "팀장 장춘봉", color: COLOR.team },
                { id: "facility", label: "시설팀",    sub: "팀장 최문희", color: COLOR.team },
                { id: "ops2",     label: "운영지원팀",sub: "팀장 이병민", color: COLOR.team },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "clab", label: "Creative LAB", sub: "상무 박태춘", color: COLOR.lab,
      children: [
        { id: "design",   label: "디자인팀",      sub: "팀장 김정희", color: COLOR.team },
        { id: "plan",     label: "설계파트",       sub: "책임 한인희", color: COLOR.team },
        { id: "dsgn-pt",  label: "디자인파트",     sub: "책임 최강",   color: COLOR.team },
        { id: "newmedia", label: "뉴미디어사업팀", sub: "T/O",         color: COLOR.team },
      ],
    },
    {
      id: "itc", label: "ITC", sub: "수석 김민", color: COLOR.itc,
    },
  ],
};

// ── 임직원 목록 (PDF 비상연락망 2026.06 기준) ─────────────────────
const MEMBERS = [
  // 임원
  { name: "배윤성",  dept: "대표이사",        title: "대표이사", phone: "010-3725-7806", email: "ysbae@kinoton.co.kr",          ext: "1910" },
  { name: "배우성",  dept: "미래전략사업본부", title: "부사장",   phone: "010-9216-7806", email: "edward@kinoton.co.kr",         ext: "1911" },
  { name: "고영환",  dept: "경영지원본부",     title: "부사장",   phone: "010-5789-0221", email: "youngwhan_koh@kinoton.co.kr",  ext: "1912" },
  { name: "신현준",  dept: "Dx사업본부",       title: "부사장",   phone: "010-3716-1738", email: "hjshin@kinoton.co.kr",         ext: "1913" },
  { name: "권현철",  dept: "경영전략실",       title: "상무",     phone: "010-8181-9650", email: "Kay.kwon@kinoton.co.kr",       ext: "1914" },
  { name: "박태춘",  dept: "Creative LAB",     title: "상무",     phone: "010-3349-3030", email: "dptc12@kinoton.co.kr",         ext: "1915" },
  // 담당
  { name: "최재설",  dept: "Dx사업담당",       title: "담당",     phone: "010-3724-1448", email: "jschoi@kinoton.co.kr",         ext: "1916" },
  { name: "오봉희",  dept: "경영지원담당",     title: "담당",     phone: "010-3714-8259", email: "bhoh@kinoton.co.kr",           ext: "1917" },
  { name: "이미화",  dept: "전략기획담당",     title: "담당",     phone: "010-3688-4998", email: "mhlee@kinoton.co.kr",          ext: "1918" },
  { name: "김광섭",  dept: "DE사업담당",       title: "담당",     phone: "010-9041-8668", email: "kskim@kinoton.co.kr",          ext: "1919" },
  { name: "정도영",  dept: "광고사업담당",     title: "담당",     phone: "010-3409-6335", email: "doyoung.jung@kinoton.co.kr",   ext: "1920" },
  // 광고사업팀
  { name: "제성헌",  dept: "광고사업팀",       title: "팀장",     phone: "010-4706-2452", email: "sunghun.je@kinoton.co.kr",     ext: "1926" },
  { name: "최원준",  dept: "광고사업팀",       title: "책임",     phone: "010-7377-0720", email: "wonjun.choi@kinoton.co.kr",    ext: "1927" },
  // 글로벌사업팀
  { name: "최우성",  dept: "글로벌사업팀",     title: "팀장",     phone: "010-3665-6542", email: "hcgil@kinoton.co.kr",          ext: "1929" },
  { name: "강민구",  dept: "글로벌사업팀",     title: "책임",     phone: "010-8970-4592", email: "mingu.kang@kinoton.co.kr",     ext: "1930" },
  { name: "신정운",  dept: "글로벌사업팀",     title: "책임",     phone: "010-2066-5629", email: "jeongwoon.shin@kinoton.co.kr", ext: "1974" },
  { name: "박진우",  dept: "글로벌사업팀",     title: "책임",     phone: "010-9658-8030", email: "jinwoo.park@kinoton.co.kr",    ext: "1975" },
  { name: "문대형",  dept: "글로벌사업팀",     title: "책임",     phone: "010-3900-6996", email: "daehyeong.moon@kinoton.co.kr", ext: "1985" },
  // 경영기획팀
  { name: "박찬훈",  dept: "경영기획팀",       title: "팀장",     phone: "010-4027-0717", email: "chanhoon.park@kinoton.co.kr",  ext: "1925" },
  { name: "김진형",  dept: "경영기획팀",       title: "책임",     phone: "010-2699-5330", email: "jinhyung.kim@kinoton.co.kr",   ext: "1935" },
  { name: "장민석",  dept: "경영기획팀",       title: "책임",     phone: "010-9927-9985", email: "minseok.jang@kinoton.co.kr",   ext: "1936" },
  { name: "김민구",  dept: "경영기획팀",       title: "선임",     phone: "010-4334-3876", email: "mingu.kim@kinoton.co.kr",      ext: "1928" },
  { name: "문대훈",  dept: "경영기획팀",       title: "책임",     phone: "010-9695-5082", email: "daehun.mun@kinoton.co.kr",    ext: "1996" },
  // 경영혁신TASK
  { name: "김영진",  dept: "경영혁신TASK",     title: "팀장",     phone: "010-2519-1934", email: "youngjin.kim@kinoton.co.kr",   ext: "1934" },
  { name: "이다니엘",dept: "경영혁신TASK",     title: "선임",     phone: "010-3598-9723", email: "daniel.lee@kinoton.co.kr",     ext: "1997" },
  // 회계팀
  { name: "임지혜",  dept: "회계팀",           title: "팀장",     phone: "010-2220-2960", email: "jhim@kinoton.co.kr",           ext: "1902" },
  { name: "강나연",  dept: "회계팀",           title: "책임",     phone: "010-8757-9638", email: "nayeon.kang@kinoton.co.kr",    ext: "1903" },
  { name: "강해리",  dept: "회계팀",           title: "선임",     phone: "010-9573-0921", email: "haeri.kang@kinoton.co.kr",     ext: "1905" },
  { name: "박채윤",  dept: "회계팀",           title: "선임",     phone: "010-2376-0499", email: "chaeyoon.park@kinoton.co.kr",  ext: "1906" },
  { name: "이승호",  dept: "회계팀",           title: "선임",     phone: "010-8232-9102", email: "seungho.lee@kinoton.co.kr",    ext: "1976" },
  { name: "장호균",  dept: "회계팀",           title: "선임",     phone: "010-3438-4337", email: "hokyun.jang@kinoton.co.kr",    ext: "1998" },
  // 인사총무팀
  { name: "유진희",  dept: "인사총무팀",       title: "선임",     phone: "010-4951-1747", email: "jinhee.yoo@kinoton.co.kr",     ext: "1904" },
  { name: "이아현",  dept: "인사총무팀",       title: "선임",     phone: "010-3793-8842", email: "ahhyun.lee@kinoton.co.kr",     ext: "1900" },
  // 영업1팀
  { name: "김종수",  dept: "영업1팀",          title: "책임",     phone: "010-4735-4968", email: "jskim@kinoton.co.kr",          ext: "1940" },
  { name: "손명훈",  dept: "영업1팀",          title: "책임",     phone: "010-9332-8817", email: "mhson@kinoton.co.kr",          ext: "1942" },
  { name: "서재덕",  dept: "영업1팀",          title: "책임",     phone: "010-5558-2896", email: "jdseo@kinoton.co.kr",          ext: "1951" },
  { name: "신민영",  dept: "영업1팀",          title: "선임",     phone: "010-3381-0546", email: "minyoung.shin@kinoton.co.kr",  ext: "1941" },
  { name: "김계론",  dept: "영업1팀",          title: "사원",     phone: "010-7620-2822", email: "gyeron.kim@kinoton.co.kr",     ext: "-" },
  // 영업2팀
  { name: "윤승현",  dept: "영업2팀",          title: "팀장",     phone: "010-2299-8590", email: "seunghyun.yoon@kinoton.co.kr", ext: "1950" },
  { name: "하경철",  dept: "영업2팀",          title: "책임",     phone: "010-9133-6288", email: "kcha@kinoton.co.kr",           ext: "1960" },
  // 오디오사업팀
  { name: "이재원",  dept: "오디오사업팀",     title: "책임",     phone: "010-9914-1617", email: "jaewon.lee@kinoton.co.kr",     ext: "6252-5620" },
  { name: "김설아",  dept: "오디오사업팀",     title: "선임",     phone: "010-7794-9784", email: "seola.kim@kinoton.co.kr",      ext: "6252-5623" },
  // 운영지원팀
  { name: "이병민",  dept: "운영지원팀",       title: "팀장",     phone: "010-2000-5964", email: "bmlee@kinoton.co.kr",          ext: "1943" },
  { name: "양대웅",  dept: "운영지원팀",       title: "책임",     phone: "010-4824-4724", email: "daewoong.yang@kinoton.co.kr",  ext: "1994" },
  { name: "조준현",  dept: "운영지원팀",       title: "책임",     phone: "010-7101-6409", email: "joonhyun.cho@kinoton.co.kr",   ext: "1977" },
  { name: "김초원",  dept: "운영지원팀",       title: "선임",     phone: "010-3723-4377", email: "cwkim@kinoton.co.kr",          ext: "1931" },
  { name: "이원진",  dept: "운영지원팀",       title: "사원",     phone: "010-2220-5173", email: "wonjin.lee@kinoton.co.kr",     ext: "1995" },
  { name: "이승재",  dept: "운영지원팀",       title: "사원",     phone: "010-5181-5546", email: "seungjae.lee@kinoton.co.kr",   ext: "1932" },
  // 전시팀
  { name: "김동민",  dept: "전시팀",           title: "책임",     phone: "010-8668-0222", email: "dongmin.kim@kinoton.co.kr",    ext: "1989" },
  // 기술영업팀
  { name: "길효철",  dept: "기술영업팀",       title: "수석",     phone: "010-4543-8898", email: "hcgil@kinoton.co.kr",          ext: "1921" },
  // 관리팀
  { name: "박상규",  dept: "관리팀",           title: "책임",     phone: "010-8996-2417", email: "ad@kinoton.co.kr",             ext: "-" },
  { name: "민경진",  dept: "관리팀",           title: "책임",     phone: "010-7441-3413", email: "kyeongjin.min@kinoton.co.kr",  ext: "-" },
  { name: "이지은",  dept: "관리팀",           title: "책임",     phone: "010-7344-6405", email: "jieun.lee@kinoton.co.kr",      ext: "1990" },
  { name: "이윤철",  dept: "관리팀",           title: "선임",     phone: "010-2050-1362", email: "yuncheol.lee@kinoton.co.kr",   ext: "-" },
  { name: "김예랑",  dept: "관리팀",           title: "선임",     phone: "-",             email: "mkkim@kinoton.co.kr",          ext: "-" },
  // 지원팀
  { name: "장령",    dept: "지원팀",           title: "책임",     phone: "010-2294-0203", email: "rchang@kinoton.co.kr",         ext: "1991" },
  { name: "김민경",  dept: "지원팀",           title: "선임",     phone: "010-5361-4906", email: "mkkim@kinoton.co.kr",          ext: "1992" },
  { name: "한민",    dept: "지원팀",           title: "선임",     phone: "010-9047-9747", email: "min.han@kinoton.co.kr",        ext: "1993" },
  { name: "이상우",  dept: "지원팀",           title: "책임",     phone: "010-8789-1179", email: "swlee@kinoton.co.kr",          ext: "-" },
  { name: "이찬익",  dept: "지원팀",           title: "책임",     phone: "010-5432-9040", email: "cilee@kinoton.co.kr",          ext: "-" },
  { name: "김도경",  dept: "지원팀",           title: "책임",     phone: "010-5155-3903", email: "dokyoung.kim@kinoton.co.kr",   ext: "-" },
  // 기술총괄
  { name: "정현석",  dept: "기술총괄",         title: "수석",     phone: "010-4441-4576", email: "manus@kinoton.co.kr",          ext: "1980" },
  // 기술1팀
  { name: "유정식",  dept: "기술1팀",          title: "팀장",     phone: "010-6317-1211", email: "jsyu@kinoton.co.kr",           ext: "1981" },
  { name: "이민구",  dept: "기술1팀",          title: "책임",     phone: "010-5359-5239", email: "mklee@kinoton.co.kr",          ext: "1944" },
  { name: "송종현",  dept: "기술1팀",          title: "책임",     phone: "010-7244-9694", email: "chonghyun.song@kinoton.co.kr", ext: "1984" },
  { name: "문대형",  dept: "기술1팀",          title: "책임",     phone: "010-3900-6996", email: "daehyeong.moon@kinoton.co.kr", ext: "1985" },
  { name: "김주훈",  dept: "기술1팀",          title: "선임",     phone: "010-7359-9590", email: "juhoon.kim@kinoton.co.kr",     ext: "1986" },
  { name: "김희재",  dept: "기술1팀",          title: "선임",     phone: "010-3112-0637", email: "heejae.kim@kinoton.co.kr",     ext: "1988" },
  // 기술2팀
  { name: "정철훈",  dept: "기술2팀",          title: "팀장",     phone: "010-2804-5493", email: "jeong84@kinoton.co.kr",        ext: "1982" },
  { name: "최용호",  dept: "기술2팀",          title: "책임",     phone: "010-8796-4967", email: "yongho.choi@kinoton.co.kr",    ext: "1946" },
  { name: "장모세",  dept: "기술2팀",          title: "선임",     phone: "010-5177-4004", email: "mose.jang@kinoton.co.kr",      ext: "1987" },
  { name: "장호균",  dept: "기술2팀",          title: "선임",     phone: "010-3438-4337", email: "hokyun.jang@kinoton.co.kr",    ext: "1998" },
  // 기술3팀
  { name: "장춘봉",  dept: "기술3팀",          title: "팀장",     phone: "010-9449-0360", email: "cbjang@kinoton.co.kr",         ext: "1947" },
  { name: "김기영",  dept: "기술3팀",          title: "책임",     phone: "010-4353-0727", email: "kiyoung.kim@kinoton.co.kr",    ext: "1945" },
  // 시설팀
  { name: "최문희",  dept: "시설팀",           title: "팀장",     phone: "010-8958-6337", email: "mhchoi@kinoton.co.kr",         ext: "1983" },
  // Creative LAB
  { name: "김정희",  dept: "디자인팀",         title: "팀장",     phone: "010-2330-8757", email: "jhkim@kinoton.co.kr",          ext: "1961" },
  { name: "한인희",  dept: "설계파트",         title: "책임",     phone: "010-7226-8423", email: "ihhan@kinoton.co.kr",          ext: "1962" },
  { name: "최수민",  dept: "설계파트",         title: "책임",     phone: "010-5504-5130", email: "smchoe@kinoton.co.kr",         ext: "1963" },
  { name: "유소연",  dept: "설계파트",         title: "선임",     phone: "010-8842-0550", email: "soyeon.yu@kinoton.co.kr",      ext: "1964" },
  { name: "김승태",  dept: "설계파트",         title: "선임",     phone: "010-2733-5465", email: "seungtae.kim@kinoton.co.kr",   ext: "1965" },
  { name: "김성민",  dept: "설계파트",         title: "사원",     phone: "010-4823-0579", email: "sungmin.kim@kinoton.co.kr",    ext: "1970" },
  { name: "최강",    dept: "디자인파트",       title: "책임",     phone: "010-8810-9538", email: "kang.choi@kinoton.co.kr",      ext: "1966" },
  { name: "유상균",  dept: "디자인파트",       title: "책임",     phone: "010-6655-4806", email: "skyoo@kinoton.co.kr",          ext: "1967" },
  { name: "서연주",  dept: "디자인파트",       title: "선임",     phone: "010-5188-3853", email: "yjseo@kinoton.co.kr",          ext: "1968" },
  { name: "고은솔",  dept: "디자인파트",       title: "선임",     phone: "010-4150-0504", email: "eunsol.kho@kinoton.co.kr",     ext: "1969" },
  // ITC
  { name: "김민",    dept: "ITC",              title: "수석",     phone: "010-9097-8156", email: "minkim@kinoton.co.kr",         ext: "한국" },
];

const UNIQUE_MEMBERS = MEMBERS.filter((m, i, arr) =>
  arr.findIndex(x => x.name === m.name && x.dept === m.dept) === i
);

// ── 타입 ─────────────────────────────────────────────────────────
interface OrgNode {
  id: string;
  label: string;
  sub: string;
  color: string;
  children?: OrgNode[];
}

// ── 박스 컴포넌트 ─────────────────────────────────────────────────
function OrgBox({ node }: { node: OrgNode }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 0 }}>
      {/* 박스 */}
      <div
        className="rounded px-3 py-1.5 text-center text-white shrink-0 cursor-default"
        style={{
          background: node.color,
          minWidth: "88px",
          maxWidth: "120px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
        }}
      >
        <div className="text-xs font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{node.label}</div>
        <div className="text-xs opacity-80 leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{node.sub}</div>
      </div>

      {/* 아래 연결선 + 자식 */}
      {hasChildren && (
        <>
          {/* 수직선 (박스 → 수평 분기선) */}
          <div style={{ width: "1px", height: "16px", background: "#CBD5E1" }} />

          {/* 수평 분기선 */}
          <div className="relative flex items-start justify-center" style={{ width: "100%" }}>
            {/* 수평선 */}
            {node.children!.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: `calc(100% - 96px)`,
                  height: "1px",
                  background: "#CBD5E1",
                }}
              />
            )}

            {/* 자식들 */}
            <div className="flex items-start justify-center gap-3 flex-wrap">
              {node.children!.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* 자식 위 수직선 */}
                  <div style={{ width: "1px", height: "16px", background: "#CBD5E1" }} />
                  <OrgBox node={child} />
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
  const [view, setView] = useState<"tree" | "list">("tree");
  const [search, setSearch] = useState("");

  const filtered = UNIQUE_MEMBERS.filter(m =>
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
            <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>조직도 / 사내 전화번호부</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
              2026.06 기준 · 총 {UNIQUE_MEMBERS.length}명
            </p>
          </div>
          <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--kino-pale)" }}>
            {(["tree", "list"] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v ? "var(--kino-charcoal)" : "transparent",
                  color: view === v ? "white" : "var(--kino-mid)",
                }}
              >
                {v === "tree" ? "조직도" : "전화번호부"}
              </button>
            ))}
          </div>
        </div>

        {/* 조직도 트리 */}
        {view === "tree" ? (
          <div className="portal-card p-6 overflow-x-auto">
            <div style={{ minWidth: "900px" }}>
              <OrgBox node={ORG} />
            </div>
          </div>
        ) : (
          /* 전화번호부 */
          <div className="portal-card">
            <div className="section-header">
              <span className="section-title">
                임직원 목록
                <span className="ml-1 text-xs font-normal" style={{ color: "var(--kino-muted)" }}>
                  {filtered.length}명
                </span>
              </span>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs"
                style={{ border: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}
              >
                <Search size={12} style={{ color: "var(--kino-muted)" }} />
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
                gridTemplateColumns: "1.2fr 120px 70px 90px 150px 1fr",
                background: "var(--kino-bg)",
                color: "var(--kino-muted)",
                borderBottom: "1px solid var(--kino-pale)",
              }}
            >
              <span>이름</span><span>부서</span><span>직위</span><span>내선</span><span>휴대폰</span><span>이메일</span>
            </div>

            {filtered.map((m, idx) => (
              <div
                key={`${m.name}-${m.dept}-${idx}`}
                className="grid items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                style={{
                  gridTemplateColumns: "1.2fr 120px 70px 90px 150px 1fr",
                  borderBottom: "1px solid var(--kino-pale)",
                }}
                onClick={() => toast(`${m.name} 프로필 준비 중`)}
              >
                <span className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "var(--kino-charcoal)" }}
                  >
                    {m.name.charAt(0)}
                  </div>
                  <span className="font-medium" style={{ color: "var(--kino-charcoal)" }}>{m.name}</span>
                </span>
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>{m.dept}</span>
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>{m.title}</span>
                <span className="text-xs" style={{ color: "var(--kino-mid)" }}>{m.ext}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--kino-mid)" }}>
                  <Phone size={11} />{m.phone}
                </span>
                <span className="flex items-center gap-1 text-xs truncate" style={{ color: "var(--kino-mid)" }}>
                  <Mail size={11} />{m.email}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

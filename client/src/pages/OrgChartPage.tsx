/**
 * OrgChartPage — 조직도 & 사내 전화번호부
 * 데이터 출처: 회사 조직도 이미지 + 비상연락망 2026.06 PDF 기준
 *
 * 조직 구조 (이미지 기준):
 * 대표이사 배윤성
 * ├ 미래전략사업본부 (부사장 배우성)
 * │  └ 경영전략실 (상무 권현철)
 * │     ├ 광고사업담당 (담당 정도영)
 * │     │  └ 광고사업팀: 제성헌팀장, 최원준, 조현우
 * │     ├ 글로벌사업팀: 최우성팀장, 강민구, 신정운, 박진우, 문대형
 * │     ├ 경영기획팀: 박찬훈팀장, 김진형, 장민석, 김민구, T/O
 * │     └ 경영혁신TASK: 김영진팀장, T/O
 * ├ 경영지원본부 (부사장 고영환)
 * │  └ 경영지원담당 (담당 오봉희)
 * │     ├ 회계팀: 임지혜팀장(겸회계팀장), 강나연, 강해리, 박채윤, 이승호, 장호균
 * │     └ 인사총무팀: 유진희선임, 이아현, T/O
 * ├ Dx사업본부 (부사장 신현준)
 * │  └ Dx사업담당 (담당 최재설)
 * │     ├ 영업1팀: 공석팀장, 김종수, 손명훈, 서재덕, 신민영, 김계론
 * │     ├ 영업2팀: 윤승현팀장, 하경철
 * │     ├ 오디오사업팀: 이재원책임, 김설아
 * │     └ 운영지원팀: 이병민팀장, 양대웅, 조준현, 김초원, 이원진, 이승재
 * ├ DE사업본부 (겸 대표이사)
 * │  ├ DE사업담당 (담당 김광섭)
 * │  │  ├ 전시팀: 김동민책임, 신정운, 박진우
 * │  │  ├ 기술영업팀: 겸수석, 겸수석
 * │  │  └ 이머시브미디어팀
 * │  ├ 전략기획담당 (담당 이미화)
 * │  │  ├ 관리팀: 박상규, 민경진, 이지은, 이윤철, 김예랑
 * │  │  └ 지원팀: 장령, 김민경, 이상우, 이찬익, 김도경
 * │  └ DE영업총괄 (수석 길효철)
 * │     ├ 기술총괄 (수석 정현석)
 * │     │  ├ 기술1팀: 유정식팀장, 이민구, 송종현, 문대형, 김주훈, 김희재
 * │     │  ├ 기술2팀: 정철훈팀장, 최용호, 이다니엘, 장모세, 장호균, T/O
 * │     │  ├ 기술3팀: 장춘봉팀장, 김기영
 * │     │  ├ 시설팀: 최문희팀장, 이상우, 이찬익, 김도경, T/O
 * │     │  └ 운영지원팀: 이병민팀장, 양대웅, 조준현, 김초원, 이원진, 이승재
 * └ Creative LAB (상무 박태춘)
 *    ├ 디자인팀: 김정희팀장
 *    ├ 설계파트: 한인희, 최수민, 유소연, 김승태, 김성민
 *    ├ 디자인파트: 최강, 유상균, 서연주, 고은솔
 *    └ 뉴미디어사업팀: T/O, T/O
 * ITC: 수석 김민
 */
import { useState } from "react";
import PortalLayout from "@/components/PortalLayout";
import { toast } from "sonner";
import { Search, ChevronDown, ChevronRight, Phone, Mail, User } from "lucide-react";

// ── 실제 조직 구조 (조직도 이미지 기준) ─────────────────────────
const ORG_DATA = {
  name: "키노톤(주)", title: "대표이사", person: "배윤성",
  children: [
    {
      name: "미래전략사업본부", title: "부사장", person: "배우성",
      children: [
        {
          name: "경영전략실", title: "상무", person: "권현철",
          children: [
            {
              name: "광고사업담당", title: "담당", person: "정도영",
              children: [
                { name: "광고사업팀", title: "팀장", person: "제성헌", members: 3 },
              ],
            },
            { name: "글로벌사업팀", title: "팀장", person: "최우성",  members: 5 },
            { name: "경영기획팀",   title: "팀장", person: "박찬훈",  members: 5 },
            { name: "경영혁신TASK", title: "팀장", person: "김영진",  members: 2 },
          ],
        },
      ],
    },
    {
      name: "경영지원본부", title: "부사장", person: "고영환",
      children: [
        {
          name: "경영지원담당", title: "담당", person: "오봉희",
          children: [
            { name: "회계팀",     title: "팀장", person: "임지혜", members: 6 },
            { name: "인사총무팀", title: "선임", person: "유진희", members: 3 },
          ],
        },
      ],
    },
    {
      name: "Dx사업본부", title: "부사장", person: "신현준",
      children: [
        {
          name: "Dx사업담당", title: "담당", person: "최재설",
          children: [
            { name: "영업1팀",      title: "팀장", person: "공석",   members: 5 },
            { name: "영업2팀",      title: "팀장", person: "윤승현", members: 2 },
            { name: "오디오사업팀", title: "책임", person: "이재원", members: 2 },
            { name: "운영지원팀",   title: "팀장", person: "이병민", members: 6 },
          ],
        },
      ],
    },
    {
      name: "DE사업본부", title: "겸 대표이사", person: "배윤성",
      children: [
        {
          name: "DE사업담당", title: "담당", person: "김광섭",
          children: [
            { name: "전시팀",         title: "책임", person: "김동민", members: 3 },
            { name: "기술영업팀",     title: "겸수석", person: "길효철", members: 2 },
            { name: "이머시브미디어팀", title: "겸수석", person: "정현석", members: 1 },
          ],
        },
        {
          name: "전략기획담당", title: "담당", person: "이미화",
          children: [
            { name: "관리팀", title: "책임", person: "박상규", members: 5 },
            { name: "지원팀", title: "책임", person: "장령",   members: 5 },
          ],
        },
        {
          name: "DE영업총괄", title: "수석", person: "길효철",
          children: [
            {
              name: "기술총괄", title: "수석", person: "정현석",
              children: [
                { name: "기술1팀",   title: "팀장", person: "유정식", members: 6 },
                { name: "기술2팀",   title: "팀장", person: "정철훈", members: 5 },
                { name: "기술3팀",   title: "팀장", person: "장춘봉", members: 2 },
                { name: "시설팀",    title: "팀장", person: "최문희", members: 4 },
                { name: "운영지원팀",title: "팀장", person: "이병민", members: 6 },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "Creative LAB", title: "상무", person: "박태춘",
      children: [
        { name: "디자인팀",      title: "팀장", person: "김정희", members: 1 },
        { name: "설계파트",      title: "책임", person: "한인희", members: 5 },
        { name: "디자인파트",    title: "책임", person: "최강",   members: 4 },
        { name: "뉴미디어사업팀",title: "T/O",  person: "T/O",   members: 2 },
      ],
    },
    {
      name: "ITC", title: "수석", person: "김민", members: 1,
    },
  ],
};

// ── 실제 임직원 목록 (PDF 비상연락망 2026.06 기준) ───────────────
const MEMBERS = [
  // 임원
  { name: "배윤성", dept: "대표이사",       title: "대표이사", phone: "010-3725-7806", email: "ysbae@kinoton.co.kr",         ext: "1910" },
  { name: "배우성", dept: "미래전략사업본부",title: "부사장",   phone: "010-9216-7806", email: "edward@kinoton.co.kr",        ext: "1911" },
  { name: "고영환", dept: "경영지원본부",    title: "부사장",   phone: "010-5789-0221", email: "youngwhan_koh@kinoton.co.kr", ext: "1912" },
  { name: "신현준", dept: "Dx사업본부",      title: "부사장",   phone: "010-3716-1738", email: "hjshin@kinoton.co.kr",        ext: "1913" },
  { name: "권현철", dept: "경영전략실",      title: "상무",     phone: "010-8181-9650", email: "Kay.kwon@kinoton.co.kr",      ext: "1914" },
  { name: "박태춘", dept: "Creative LAB",    title: "상무",     phone: "010-3349-3030", email: "dptc12@kinoton.co.kr",        ext: "1915" },
  // 담당
  { name: "최재설", dept: "Dx사업담당",      title: "담당",     phone: "010-3724-1448", email: "jschoi@kinoton.co.kr",        ext: "1916" },
  { name: "오봉희", dept: "경영지원담당",    title: "담당",     phone: "010-3714-8259", email: "bhoh@kinoton.co.kr",          ext: "1917" },
  { name: "이미화", dept: "전략기획담당",    title: "담당",     phone: "010-3688-4998", email: "mhlee@kinoton.co.kr",         ext: "1918" },
  { name: "김광섭", dept: "DE사업담당",      title: "담당",     phone: "010-9041-8668", email: "kskim@kinoton.co.kr",         ext: "1919" },
  { name: "정도영", dept: "광고사업담당",    title: "담당",     phone: "010-3409-6335", email: "doyoung.jung@kinoton.co.kr",  ext: "1920" },
  // 광고사업팀
  { name: "제성헌", dept: "광고사업팀",      title: "팀장",     phone: "010-4706-2452", email: "sunghun.je@kinoton.co.kr",    ext: "1926" },
  { name: "최원준", dept: "광고사업팀",      title: "책임",     phone: "010-7377-0720", email: "wonjun.choi@kinoton.co.kr",   ext: "1927" },
  // 글로벌사업팀
  { name: "최우성", dept: "글로벌사업팀",    title: "팀장",     phone: "010-3665-6542", email: "hcgil@kinoton.co.kr",         ext: "1929" },
  { name: "강민구", dept: "글로벌사업팀",    title: "책임",     phone: "010-8970-4592", email: "mingu.kang@kinoton.co.kr",    ext: "1930" },
  { name: "신정운", dept: "글로벌사업팀",    title: "책임",     phone: "010-2066-5629", email: "jeongwoon.shin@kinoton.co.kr",ext: "1974" },
  { name: "박진우", dept: "글로벌사업팀",    title: "책임",     phone: "010-9658-8030", email: "jinwoo.park@kinoton.co.kr",   ext: "1975" },
  { name: "문대형", dept: "글로벌사업팀",    title: "책임",     phone: "010-3900-6996", email: "daehyeong.moon@kinoton.co.kr",ext: "1985" },
  // 경영기획팀
  { name: "박찬훈", dept: "경영기획팀",      title: "팀장",     phone: "010-4027-0717", email: "chanhoon.park@kinoton.co.kr", ext: "1925" },
  { name: "김진형", dept: "경영기획팀",      title: "책임",     phone: "010-2699-5330", email: "jinhyung.kim@kinoton.co.kr",  ext: "1935" },
  { name: "장민석", dept: "경영기획팀",      title: "책임",     phone: "010-9927-9985", email: "minseok.jang@kinoton.co.kr",  ext: "1936" },
  { name: "김민구", dept: "경영기획팀",      title: "선임",     phone: "010-4334-3876", email: "mingu.kim@kinoton.co.kr",     ext: "1928" },
  { name: "문대훈", dept: "경영기획팀",      title: "책임",     phone: "010-9695-5082", email: "daehun.mun@kinoton.co.kr",   ext: "1996" },
  // 경영혁신TASK
  { name: "김영진", dept: "경영혁신TASK",    title: "팀장",     phone: "010-2519-1934", email: "youngjin.kim@kinoton.co.kr",  ext: "1934" },
  { name: "이다니엘",dept: "경영혁신TASK",   title: "선임",     phone: "010-3598-9723", email: "daniel.lee@kinoton.co.kr",    ext: "1997" },
  // 회계팀
  { name: "임지혜", dept: "회계팀",          title: "팀장",     phone: "010-2220-2960", email: "jhim@kinoton.co.kr",          ext: "1902" },
  { name: "강나연", dept: "회계팀",          title: "책임",     phone: "010-8757-9638", email: "nayeon.kang@kinoton.co.kr",   ext: "1903" },
  { name: "강해리", dept: "회계팀",          title: "선임",     phone: "010-9573-0921", email: "haeri.kang@kinoton.co.kr",    ext: "1905" },
  { name: "박채윤", dept: "회계팀",          title: "선임",     phone: "010-2376-0499", email: "chaeyoon.park@kinoton.co.kr", ext: "1906" },
  { name: "이승호", dept: "회계팀",          title: "선임",     phone: "010-8232-9102", email: "seungho.lee@kinoton.co.kr",   ext: "1976" },
  { name: "장호균", dept: "회계팀",          title: "선임",     phone: "010-3438-4337", email: "hokyun.jang@kinoton.co.kr",   ext: "1998" },
  // 인사총무팀
  { name: "유진희", dept: "인사총무팀",      title: "선임",     phone: "010-4951-1747", email: "jinhee.yoo@kinoton.co.kr",    ext: "1904" },
  { name: "이아현", dept: "인사총무팀",      title: "선임",     phone: "010-3793-8842", email: "ahhyun.lee@kinoton.co.kr",    ext: "1900" },
  // 영업1팀
  { name: "김종수", dept: "영업1팀",         title: "책임",     phone: "010-4735-4968", email: "jskim@kinoton.co.kr",         ext: "1940" },
  { name: "손명훈", dept: "영업1팀",         title: "책임",     phone: "010-9332-8817", email: "mhson@kinoton.co.kr",         ext: "1942" },
  { name: "서재덕", dept: "영업1팀",         title: "책임",     phone: "010-5558-2896", email: "jdseo@kinoton.co.kr",         ext: "1951" },
  { name: "신민영", dept: "영업1팀",         title: "선임",     phone: "010-3381-0546", email: "minyoung.shin@kinoton.co.kr", ext: "1941" },
  { name: "김계론", dept: "영업1팀",         title: "사원",     phone: "010-7620-2822", email: "gyeron.kim@kinoton.co.kr",    ext: "-" },
  // 영업2팀
  { name: "윤승현", dept: "영업2팀",         title: "팀장",     phone: "010-2299-8590", email: "seunghyun.yoon@kinoton.co.kr",ext: "1950" },
  { name: "하경철", dept: "영업2팀",         title: "책임",     phone: "010-9133-6288", email: "kcha@kinoton.co.kr",          ext: "1960" },
  // 오디오사업팀
  { name: "이재원", dept: "오디오사업팀",    title: "책임",     phone: "010-9914-1617", email: "jaewon.lee@kinoton.co.kr",    ext: "6252-5620" },
  { name: "김설아", dept: "오디오사업팀",    title: "선임",     phone: "010-7794-9784", email: "seola.kim@kinoton.co.kr",     ext: "6252-5623" },
  // 운영지원팀
  { name: "이병민", dept: "운영지원팀",      title: "팀장",     phone: "010-2000-5964", email: "bmlee@kinoton.co.kr",         ext: "1943" },
  { name: "양대웅", dept: "운영지원팀",      title: "책임",     phone: "010-4824-4724", email: "daewoong.yang@kinoton.co.kr", ext: "1994" },
  { name: "조준현", dept: "운영지원팀",      title: "책임",     phone: "010-7101-6409", email: "joonhyun.cho@kinoton.co.kr",  ext: "1977" },
  { name: "김초원", dept: "운영지원팀",      title: "선임",     phone: "010-3723-4377", email: "cwkim@kinoton.co.kr",         ext: "1931" },
  { name: "이원진", dept: "운영지원팀",      title: "사원",     phone: "010-2220-5173", email: "wonjin.lee@kinoton.co.kr",    ext: "1995" },
  { name: "이승재", dept: "운영지원팀",      title: "사원",     phone: "010-5181-5546", email: "seungjae.lee@kinoton.co.kr",  ext: "1932" },
  // 전시팀 (DE사업본부)
  { name: "김동민", dept: "전시팀",          title: "책임",     phone: "010-8668-0222", email: "dongmin.kim@kinoton.co.kr",   ext: "1989" },
  { name: "신정운", dept: "전시팀",          title: "책임",     phone: "010-2066-5629", email: "jeongwoon.shin@kinoton.co.kr",ext: "1974" },
  { name: "박진우", dept: "전시팀",          title: "책임",     phone: "010-9658-8030", email: "jinwoo.park@kinoton.co.kr",   ext: "1975" },
  // 관리팀 (DE사업본부)
  { name: "박상규", dept: "관리팀",          title: "책임",     phone: "010-7441-3413", email: "kyeongjin.min@kinoton.co.kr", ext: "-" },
  { name: "민경진", dept: "관리팀",          title: "책임",     phone: "010-7441-3413", email: "kyeongjin.min@kinoton.co.kr", ext: "-" },
  { name: "이지은", dept: "관리팀",          title: "책임",     phone: "010-7344-6405", email: "jieun.lee@kinoton.co.kr",     ext: "1990" },
  { name: "이윤철", dept: "관리팀",          title: "선임",     phone: "010-2050-1362", email: "yuncheol.lee@kinoton.co.kr",  ext: "-" },
  { name: "김예랑", dept: "관리팀",          title: "선임",     phone: "-",             email: "mkkim@kinoton.co.kr",         ext: "-" },
  // 지원팀 (DE사업본부)
  { name: "장령",   dept: "지원팀",          title: "책임",     phone: "010-2294-0203", email: "rchang@kinoton.co.kr",        ext: "1991" },
  { name: "김민경", dept: "지원팀",          title: "선임",     phone: "010-5361-4906", email: "mkkim@kinoton.co.kr",         ext: "1992" },
  { name: "한민",   dept: "지원팀",          title: "선임",     phone: "010-9047-9747", email: "min.han@kinoton.co.kr",       ext: "1993" },
  { name: "이상우", dept: "지원팀",          title: "책임",     phone: "010-8789-1179", email: "swlee@kinoton.co.kr",         ext: "-" },
  { name: "이찬익", dept: "지원팀",          title: "책임",     phone: "010-5432-9040", email: "cilee@kinoton.co.kr",         ext: "-" },
  { name: "김도경", dept: "지원팀",          title: "책임",     phone: "010-5155-3903", email: "dokyoung.kim@kinoton.co.kr",  ext: "-" },
  // 기술총괄 / 기술1팀
  { name: "정현석", dept: "기술총괄",        title: "수석",     phone: "010-4441-4576", email: "manus@kinoton.co.kr",         ext: "1980" },
  { name: "길효철", dept: "DE영업총괄",      title: "수석",     phone: "010-4543-8898", email: "hcgil@kinoton.co.kr",         ext: "1921" },
  { name: "유정식", dept: "기술1팀",         title: "팀장",     phone: "010-6317-1211", email: "jsyu@kinoton.co.kr",          ext: "1981" },
  { name: "이민구", dept: "기술1팀",         title: "책임",     phone: "010-5359-5239", email: "mklee@kinoton.co.kr",         ext: "1944" },
  { name: "송종현", dept: "기술1팀",         title: "책임",     phone: "010-7244-9694", email: "chonghyun.song@kinoton.co.kr",ext: "1984" },
  { name: "문대형", dept: "기술1팀",         title: "책임",     phone: "010-3900-6996", email: "daehyeong.moon@kinoton.co.kr",ext: "1985" },
  { name: "김주훈", dept: "기술1팀",         title: "선임",     phone: "010-7359-9590", email: "juhoon.kim@kinoton.co.kr",    ext: "1986" },
  { name: "김희재", dept: "기술1팀",         title: "선임",     phone: "010-3112-0637", email: "heejae.kim@kinoton.co.kr",    ext: "1988" },
  // 기술2팀
  { name: "정철훈", dept: "기술2팀",         title: "팀장",     phone: "010-2804-5493", email: "jeong84@kinoton.co.kr",       ext: "1982" },
  { name: "최용호", dept: "기술2팀",         title: "책임",     phone: "010-8796-4967", email: "yongho.choi@kinoton.co.kr",   ext: "1946" },
  { name: "장모세", dept: "기술2팀",         title: "선임",     phone: "010-5177-4004", email: "mose.jang@kinoton.co.kr",     ext: "1987" },
  { name: "장호균", dept: "기술2팀",         title: "선임",     phone: "010-3438-4337", email: "hokyun.jang@kinoton.co.kr",   ext: "1998" },
  { name: "김기영", dept: "기술3팀",         title: "책임",     phone: "010-4353-0727", email: "kiyoung.kim@kinoton.co.kr",   ext: "1945" },
  // 기술3팀
  { name: "장춘봉", dept: "기술3팀",         title: "팀장",     phone: "010-9449-0360", email: "cbjang@kinoton.co.kr",        ext: "1947" },
  // 시설팀
  { name: "최문희", dept: "시설팀",          title: "팀장",     phone: "010-8958-6337", email: "mhchoi@kinoton.co.kr",        ext: "1983" },
  // Creative LAB - 디자인팀
  { name: "김정희", dept: "디자인팀",        title: "팀장",     phone: "010-2330-8757", email: "jhkim@kinoton.co.kr",         ext: "1961" },
  // 설계파트
  { name: "한인희", dept: "설계파트",        title: "책임",     phone: "010-7226-8423", email: "ihhan@kinoton.co.kr",         ext: "1962" },
  { name: "최수민", dept: "설계파트",        title: "책임",     phone: "010-5504-5130", email: "smchoe@kinoton.co.kr",        ext: "1963" },
  { name: "유소연", dept: "설계파트",        title: "선임",     phone: "010-8842-0550", email: "soyeon.yu@kinoton.co.kr",     ext: "1964" },
  { name: "김승태", dept: "설계파트",        title: "선임",     phone: "010-2733-5465", email: "seungtae.kim@kinoton.co.kr",  ext: "1965" },
  { name: "김성민", dept: "설계파트",        title: "사원",     phone: "010-4823-0579", email: "sungmin.kim@kinoton.co.kr",   ext: "1970" },
  // 디자인파트
  { name: "최강",   dept: "디자인파트",      title: "책임",     phone: "010-8810-9538", email: "kang.choi@kinoton.co.kr",     ext: "1966" },
  { name: "유상균", dept: "디자인파트",      title: "책임",     phone: "010-6655-4806", email: "skyoo@kinoton.co.kr",         ext: "1967" },
  { name: "서연주", dept: "디자인파트",      title: "선임",     phone: "010-5188-3853", email: "yjseo@kinoton.co.kr",         ext: "1968" },
  { name: "고은솔", dept: "디자인파트",      title: "선임",     phone: "010-4150-0504", email: "eunsol.kho@kinoton.co.kr",    ext: "1969" },
  // ITC
  { name: "김민",   dept: "ITC",             title: "수석",     phone: "010-9097-8156", email: "minkim@kinoton.co.kr",        ext: "한국" },
];

// 중복 제거 (이름+부서 기준)
const UNIQUE_MEMBERS = MEMBERS.filter((m, idx, arr) =>
  arr.findIndex(x => x.name === m.name && x.dept === m.dept) === idx
);

// ── OrgNode 컴포넌트 ─────────────────────────────────────────────
function OrgNode({ node, depth = 0 }: { node: any; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const bgColor = depth === 0 ? "#1A1A1A"
    : depth === 1 ? "#E85D04"   // 본부: 오렌지 (조직도 이미지 색상)
    : depth === 2 ? "#555"
    : "#888";

  return (
    <div className={depth > 0 ? "ml-6 border-l" : ""} style={{ borderColor: "var(--kino-pale)" }}>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded cursor-pointer transition-colors hover:bg-gray-50 group"
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          <span style={{ color: "var(--kino-muted)" }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : <span className="w-3.5" />}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: bgColor }}
        >
          {node.person?.charAt(0) || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>{node.name}</span>
            {node.members && (
              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--kino-pale)", color: "var(--kino-muted)" }}>
                {node.members}명
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: "var(--kino-muted)" }}>{node.title} · {node.person}</div>
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
          style={{ color: "var(--kino-muted)" }}
          onClick={(e) => { e.stopPropagation(); toast(`${node.person} 정보 준비 중`); }}
        >
          <User size={13} />
        </button>
      </div>
      {open && hasChildren && node.children.map((child: any) => (
        <OrgNode key={`${child.name}-${child.person}`} node={child} depth={depth + 1} />
      ))}
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
          <div className="portal-card p-4">
            <OrgNode node={ORG_DATA} />
          </div>
        ) : (
          /* 전화번호부 목록 */
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

            {/* 테이블 헤더 */}
            <div
              className="grid text-xs font-semibold px-4 py-2"
              style={{
                gridTemplateColumns: "1.2fr 120px 70px 90px 150px 1fr",
                background: "var(--kino-bg)",
                color: "var(--kino-muted)",
                borderBottom: "1px solid var(--kino-pale)",
              }}
            >
              <span>이름</span>
              <span>부서</span>
              <span>직위</span>
              <span>내선</span>
              <span>휴대폰</span>
              <span>이메일</span>
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

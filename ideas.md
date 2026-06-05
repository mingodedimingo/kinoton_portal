# 키노톤 사내 포탈 디자인 아이디어

## 분석 요약
- 키노톤: Media & Art Space Creator — LED, 프로젝터, 오디오 기반 디지털 미디어 공간 설계
- 브랜드 색상: 다크 배경(#0A0A0A), 화이트 텍스트, 모노크롬 계열
- 참고 레퍼런스: 상무님 구상안(상단 원형 메뉴 + 공지/게시판/인사발령/경조사 + 우측 프로필/달력), 현대퓨쳐넷(상단 GNB + 대시보드 위젯), 중앙그룹(상단 탭 + 공지/인사발령/경조사)
- 현재 ERP: 이카운트(재고/회계/일정), 제작 중 ERP: 출퇴근/일정/전자결재/조직도

---

<response>
<text>
## 아이디어 1: "Precision Dark" — 테크 인더스트리얼 다크 테마

**Design Movement**: Industrial Tech / Dark Dashboard Aesthetic
**Core Principles**:
1. 다크 배경 위 형광 포인트 컬러로 정보 계층 구분
2. 모노스페이스 + 산세리프 혼용으로 기술적 정밀함 표현
3. 미세한 그리드 패턴 배경으로 공간감 부여
4. 카드 경계를 얇은 라인으로만 처리 (그림자 최소화)

**Color Philosophy**: 딥 네이비(#0D1117) 배경 + 키노톤 블루(#1E6FFF) 액센트 + 연두 포인트(#00D4AA) — 기술 기업의 정밀함과 신뢰감
**Layout Paradigm**: 좌측 아이콘 사이드바 + 상단 검색바 + 메인 대시보드 위젯 그리드 (비대칭 3열)
**Signature Elements**: 점선 그리드 배경, 데이터 바 시각화, 네온 포인트 배지
**Interaction Philosophy**: 호버 시 카드 테두리 발광 효과, 클릭 시 미세 진동 피드백
**Animation**: 카드 진입 시 아래에서 위로 페이드인(200ms), 사이드바 아이콘 호버 시 툴팁 슬라이드
**Typography System**: Pretendard Bold(헤딩) + Pretendard Regular(본문) + JetBrains Mono(숫자/코드)
</text>
<probability>0.07</probability>
</response>

<response>
<text>
## 아이디어 2: "Clean Slate" — 모던 라이트 엔터프라이즈 포탈 (채택)

**Design Movement**: Modern Enterprise / Scandinavian Minimalism
**Core Principles**:
1. 화이트/라이트 그레이 배경으로 가독성 최우선
2. 키노톤 브랜드 블루(#1B4FD8)를 주요 인터랙션 포인트에 일관 적용
3. 카드 기반 위젯 레이아웃으로 정보 모듈화
4. 상단 GNB + 우측 개인화 패널의 전통적 포탈 구조

**Color Philosophy**: 순백(#FFFFFF) + 라이트 그레이(#F5F6FA) + 키노톤 블루(#1B4FD8) + 다크 텍스트(#1A1A2E) — 업무 집중도를 높이는 깨끗한 환경
**Layout Paradigm**: 상단 헤더(로고+검색+GNB) + 좌측 프로필/달력 패널 + 중앙 2열 위젯 영역 + 우측 퀵링크 (상무님 구상안 기반)
**Signature Elements**: 블루 액센트 라인, 원형 아바타 배지, 탭 기반 게시판 필터
**Interaction Philosophy**: 호버 시 카드 elevation 상승(shadow 증가), 탭 전환 시 슬라이드 언더라인
**Animation**: 페이지 로드 시 카드 순차 페이드인(stagger 60ms), 달력 월 전환 슬라이드
**Typography System**: Pretendard SemiBold(섹션 헤딩) + Pretendard Regular(본문) — 한국어 최적화
</text>
<probability>0.08</probability>
</response>

<response>
<text>
## 아이디어 3: "Spatial Blue" — 공간감 있는 딥블루 포탈

**Design Movement**: Spatial Computing / Glassmorphism Enterprise
**Core Principles**:
1. 딥블루 그라디언트 배경 위 반투명 글래스 카드
2. 블러 + 보더 조합으로 레이어 깊이감 표현
3. 키노톤의 '공간 창조' 브랜드 정체성을 UI에 반영
4. 부드러운 곡선과 넓은 여백으로 프리미엄 감성

**Color Philosophy**: 딥블루(#0A1628) 배경 + 글래스 카드(rgba(255,255,255,0.08)) + 스카이블루 액센트(#4A9EFF) — 키노톤의 미디어 공간 감성
**Layout Paradigm**: 전체 화면 그라디언트 배경 + 플로팅 카드 위젯 + 상단 반투명 네비게이션
**Signature Elements**: 글래스모피즘 카드, 그라디언트 버튼, 별빛 파티클 배경
**Interaction Philosophy**: 카드 호버 시 글로우 효과, 버튼 클릭 시 리플 애니메이션
**Animation**: 배경 그라디언트 천천히 이동(30s loop), 카드 진입 시 블러에서 선명해지는 효과
**Typography System**: Pretendard ExtraBold(헤딩) + Pretendard Light(서브텍스트) — 대비감 극대화
</text>
<probability>0.06</probability>
</response>

---

## 선택: 아이디어 2 "Clean Slate" 채택

상무님 구상안을 충실히 반영하면서도 실무 사용성을 극대화하는 방향으로,
키노톤 블루(#1B4FD8)를 브랜드 포인트로 활용한 모던 라이트 엔터프라이즈 포탈을 구현합니다.

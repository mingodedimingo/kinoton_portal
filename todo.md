# Kinoton Portal TODO

## 완료된 작업
- [x] 프로젝트 초기화 (React 19 + Tailwind 4 + shadcn/ui)
- [x] 모노크롬 디자인 시스템 구축
- [x] 메인 대시보드 (Home.tsx) 구현
- [x] PortalLayout.tsx (공통 헤더/GNB) 구현
- [x] FullMenuOverlay.tsx (전체메뉴 슬라이드 패널) 구현
- [x] 서브 페이지 구현 (Mail, Approve, Board, OrgChart, Calendar, Reserve, Work)
- [x] 로고 3종 업로드 및 적용
- [x] 증명사진(김민구) 업로드 완료
- [x] 조직도 비상연락망 2026.06 기준 실데이터 반영
- [x] 백엔드 + DB 업그레이드 완료 (web-db-user)
- [x] 출퇴근 DB 스키마 (attendance_logs) 추가 및 pnpm db:push 완료
- [x] 출퇴근 API 엔드포인트 구성 (server/routers.ts)
- [x] 홈 페이지 출퇴근 버튼 tRPC API 연동
- [x] 관리자 출퇴근 현황 페이지 구현 (/admin/attendance)

## 어드민 페이지 구축

### Phase 1: DB 스키마 확장
- [x] notices 테이블 추가 (공지사항)
- [x] hr_notices 테이블 추가 (인사발령)
- [x] condolences 테이블 추가 (경조사)
- [x] board_posts 테이블 추가 (게시판 - 전체 직원 업로드)
- [x] pnpm db:push 실행

### Phase 2: 어드민 접속 권한
- [x] 어드민 비밀번호 환경변수 설정 (ADMIN_PASSWORD)
- [x] server/routers.ts에 admin.login, admin.verify 엔드포인트 추가
- [x] AdminAuthGuard 컴포넌트 구현 (localStorage 토큰 검증)
- [x] /admin/login 로그인 페이지 구현

### Phase 3: 어드민 레이아웃 & 대시보드
- [x] AdminLayout.tsx 구현 (사이드바 + 헤더)
- [x] /admin 대시보드 페이지 구현 (출퇴근 요약, 공지 수, 게시글 수 등)

### Phase 4: 어드민 세부 관리 페이지
- [x] /admin/attendance - 출퇴근 관리 (AdminLayout으로 이전)
- [x] /admin/notices - 공지사항 관리 (목록/작성/수정/삭제)
- [x] /admin/hr - 인사발령 관리 (목록/작성/수정/삭제)
- [x] /admin/condolences - 경조사 관리 (목록/작성/수정/삭제)

### Phase 5: 게시판 전체 직원 업로드
- [x] /board 페이지에 게시글 작성 버튼 추가
- [x] 게시글 작성 모달/폼 구현 (제목, 내용, 카테고리)
- [x] board.create tRPC 엔드포인트 추가
- [x] board.list, board.delete 엔드포인트 추가
- [x] /admin/board - 어드민 게시판 관리 페이지

### Phase 6: 홈 페이지 DB 연동
- [x] 공지사항 DB 연동 (notices 테이블)
- [x] 인사발령 DB 연동 (hr_notices 테이블)
- [x] 경조사 DB 연동 (condolences 테이블)
- [x] 게시판 DB 연동 (board_posts 테이블)
- [x] App.tsx 어드민 라우트 전체 등록

## 근태 관리 시스템 자체 구축

### Phase 1: DB 스키마 확장
- [x] employees 테이블 (직원 정보: 이름, 부서, 직위, 입사일, 이메일)
- [x] leave_balances 테이블 (연차 부여: 직원별 연도별 총 연차, 사용 연차)
- [x] leave_requests 테이블 (연차 신청: 신청자, 기간, 종류, 상태, 반차여부, 사유)
- [x] pnpm db:push 실행

### Phase 2: 백엔드 API
- [x] employees CRUD (어드민용)
- [x] leave.request - 연차 신청
- [x] leave.myRequests - 내 신청 이력 조회
- [x] leave.approve / leave.reject - 어드민 승인/반려
- [x] leave.balance - 잔여 연차 조회 (자동 계산)
- [x] attendance.exportCSV - 이카운트용 CSV 내보내기

### Phase 3: 홈 페이지 출퇴근 개선
- [x] 직원 선택 드롭다운 (또는 이름 입력)
- [x] 연차 신청 바로가기 버튼
- [x] 잔여 연차 실시간 표시 (DB 연동)

### Phase 4: 직원용 연차 신청 페이지 (/leave)
- [x] 연차 신청 폼 (날짜, 종류: 연차/반차/반반차, 사유)
- [x] 내 연차 현황 (총 연차, 사용, 잔여)
- [x] 신청 이력 (승인/대기/반려 상태 표시)

### Phase 5: 어드민 근태 관리 강화
- [x] /admin/employees - 직원 등록/수정/삭제, 연차 부여
- [x] /admin/leave - 연차 신청 목록, 승인/반려 처리
- [x] /admin/attendance 근태 보고서 강화 (월별 집계, 지각/조퇴)
- [x] CSV 내보내기 (이카운트 업로드용)

## 3차 개선 작업

- [ ] 어드민 연차 관리 페이지 승인/반려 버튼 UI 명확화 (대기중 탭 강조)
- [ ] 홈 연차 현황에 대기중 신청 건수 표시
- [ ] 마이페이지 구현 (/mypage)
- [ ] 조직도 페이지 활성화 (/org)
- [ ] 일정 페이지 활성화 (/calendar)
- [ ] 전자결재 페이지 활성화 (/approve)
- [ ] 프로필 페이지 복원 - 헤더 프로필 클릭 시 드롭다운 또는 페이지

## 보안 강화
- [x] 모든 페이지 로그인 필수화 (비로그인 시 로그인 페이지로 리다이렉트)
- [x] 개인정보처리방침 페이지 추가 (/privacy)

## 백엔드 보안 강화 1단계
- [x] 모든 API publicProcedure → protectedProcedure 교체 (로그인 필수)
- [x] 어드민 토큰을 실제 JWT 서명 방식으로 교체 (adminProcedure 활용 + Manus OAuth)
- [x] 이미지 업로드 엔드포인트(/api/upload-image) 인증 추가
- [x] 게시판 삭제 권한을 작성자 계정 기반으로 변경

## 백엔드 보안 강화 2단계 (우선순위 순)

- [x] [높음] 모든 API publicProcedure → protectedProcedure 교체 (로그인 필수)
- [x] [높음] 어드민 전용 API에 adminProcedure 적용
- [x] [높음] 이미지 업로드 엔드포인트(/api/upload-image) 인증 추가
- [x] [높음] 게시판 삭제 권한을 작성자 계정(openId) 기반으로 변경
- [x] [낮음] 공지사항/게시판 페이지네이션 추가
- [x] [낮음] 조직도 DB 연동 (하드코딩 → employees DB 기반)

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

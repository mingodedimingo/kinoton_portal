# Kinoton Portal — 키노톤 사내 포탈

> **배포 URL**: https://kinotonport-a8dtzhdp.manus.space  
> **GitHub**: https://github.com/mingodedimingo/kinoton_portal  
> **스택**: React 19 + Tailwind CSS 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL(TiDB)  
> **플랫폼**: Manus WebDev (Autoscale 호스팅)

---

## 프로젝트 개요

키노톤(Kinoton) 임직원 전용 사내 인트라넷 포탈입니다. 직원 로그인, 공지사항, 게시판, 인사발령, 경조사, 조직도, 연차/출퇴근 관리 등 사내 업무 허브 기능을 제공합니다.

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, Tailwind CSS 4, TipTap (리치 에디터), shadcn/ui, Wouter (라우팅) |
| 백엔드 | Express 4, tRPC 11, Drizzle ORM |
| 데이터베이스 | MySQL / TiDB (Manus 관리형) |
| 인증 | 자체 JWT (직원), 쿠키 기반 어드민 세션 |
| 파일 저장 | S3 기반 Manus Storage (`/manus-storage/` 경로) |
| 이메일 | Nodemailer (SMTP) |
| 배포 | Manus WebDev Autoscale |

---

## 로컬 개발 환경 설정

```bash
# 1. 레포지터리 클론
git clone https://github.com/mingodedimingo/kinoton_portal.git
cd kinoton_portal

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정 (.env 파일 생성)
# Manus 플랫폼에서 자동 주입되는 환경 변수들이 필요합니다.
# 로컬 개발 시 아래 변수를 .env에 설정하세요:
# DATABASE_URL=...
# JWT_SECRET=...
# ADMIN_PASSWORD=...
# BUILT_IN_FORGE_API_URL=...
# BUILT_IN_FORGE_API_KEY=...

# 4. DB 스키마 마이그레이션
pnpm db:push

# 5. 개발 서버 실행
pnpm dev
# → http://localhost:3000
```

---

## 프로젝트 구조

```
kinoton-portal/
├── client/
│   └── src/
│       ├── pages/                      # 포탈 페이지
│       │   ├── Home.tsx                # 메인 대시보드
│       │   ├── LoginPage.tsx           # 직원 로그인
│       │   ├── BoardPage.tsx           # 게시판 목록/작성
│       │   ├── BoardDetailPage.tsx     # 게시글 상세/수정
│       │   ├── NoticesPage.tsx         # 공지사항 목록
│       │   ├── NoticeDetailPage.tsx    # 공지사항 상세
│       │   ├── HrPage.tsx              # 인사발령 목록
│       │   ├── HrDetailPage.tsx        # 인사발령 상세
│       │   ├── CondolencesPage.tsx     # 경조사 목록
│       │   ├── CondolenceDetailPage.tsx
│       │   ├── OrgChartPage.tsx        # 조직도 + 전화번호부
│       │   ├── CalendarPage.tsx        # 일정 캘린더
│       │   ├── MyPage.tsx              # 마이페이지
│       │   ├── LeavePage.tsx           # 연차 신청
│       │   ├── AttendanceAdminPage.tsx # 출퇴근 관리
│       │   └── admin/                  # 어드민 패널
│       │       ├── AdminLoginPage.tsx
│       │       ├── AdminDashboard.tsx
│       │       ├── AdminEmployeesPage.tsx
│       │       ├── AdminBoardPage.tsx
│       │       ├── AdminNoticesPage.tsx
│       │       ├── AdminHrPage.tsx
│       │       ├── AdminCondolencesPage.tsx
│       │       ├── AdminLeavePage.tsx
│       │       └── AdminAttendancePage.tsx
│       └── components/
│           ├── PortalLayout.tsx        # GNB + 사이드바 레이아웃
│           ├── AdminLayout.tsx         # 어드민 레이아웃
│           ├── RichEditor.tsx          # TipTap 리치 텍스트 에디터
│           ├── FileUploader.tsx        # 파일 첨부 업로더
│           └── FullMenuOverlay.tsx     # 전체메뉴 슬라이드 패널
├── server/
│   ├── _core/
│   │   ├── index.ts                    # Express 서버 진입점 (파일 업로드 엔드포인트 포함)
│   │   ├── context.ts                  # tRPC 컨텍스트 (인증 처리)
│   │   ├── sdk.ts                      # JWT 세션 검증 헬퍼
│   │   └── storageProxy.ts             # /manus-storage/ 프록시
│   ├── routers.ts                      # tRPC 라우터 (전체 API)
│   ├── db.ts                           # DB 쿼리 헬퍼
│   └── storage.ts                      # S3 storagePut 헬퍼
└── drizzle/
    └── schema.ts                       # DB 스키마 정의
```

---

## 인증 구조

### 포탈 직원 인증
- **로그인**: `POST /api/auth/employee-login` (이메일/비밀번호, 대소문자 무관)
- **세션**: `app_session_id` 쿠키 (자체 JWT, `sdk.verifySession`으로 로컬 검증)
- **기본 비밀번호**: `kino1920**`

### 어드민 인증
- **로그인**: `POST /api/admin/login` (ID/PW)
- **세션**: `kino_admin` 쿠키 (포탈 직원 세션과 **완전 독립**)
- **접근 경로**: `/admin`
- **어드민 ID**: `admin` / **비밀번호**: 환경변수 `ADMIN_PASSWORD`

> **중요**: 어드민 로그인/로그아웃이 포탈 직원 세션에 영향을 주지 않도록 완전 분리되어 있습니다. `context.ts`에서 `isAdminSession` 플래그로 구분합니다.

---

## DB 스키마 (주요 테이블)

| 테이블 | 설명 |
|--------|------|
| `employees` | 직원 정보 (이름, 부서, 직위, 이메일, 비밀번호 해시 등) |
| `notices` | 공지사항 (태그, 제목, 내용, 카테고리) |
| `hr_notices` | 인사발령 (입사/퇴직/발령/승진, 첨부파일) |
| `condolences` | 경조사 (결혼/출산/부고/기타, 첨부파일) |
| `board_posts` | 게시판 (카테고리, 제목, 리치텍스트 내용, 첨부파일) |
| `leave_balances` | 연차 부여 현황 (직원별/연도별) |
| `leave_requests` | 연차 신청 (상태: 대기/승인/반려) |
| `attendance_logs` | 출퇴근 기록 (체크인/체크아웃, 근무 유형) |
| `calendar_events` | 일정 (날짜, 시간, 색상) |
| `password_reset_tokens` | 비밀번호 재설정 인증 코드 |

---

## 주요 API 엔드포인트

### REST (Express)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/api/auth/employee-login` | 직원 로그인 |
| `POST` | `/api/auth/employee-logout` | 직원 로그아웃 |
| `POST` | `/api/upload-file` | 범용 파일 업로드 (인증 필요) |
| `POST` | `/api/upload-image` | 이미지 업로드 (하위 호환) |
| `POST` | `/api/admin/login` | 어드민 로그인 |
| `POST` | `/api/admin/logout` | 어드민 로그아웃 |
| `GET`  | `/api/admin/check` | 어드민 세션 확인 |

### tRPC (`/api/trpc`)

주요 라우터: `employees`, `notices`, `board`, `hr`, `condolences`, `leave`, `attendance`, `calendar`

---

## 파일 업로드 구조

- **업로드 흐름**: 클라이언트 → `POST /api/upload-file` → `storagePut(key, buffer, mimeType)` → S3
- **반환 URL**: `${origin}/manus-storage/${key}` 형태의 절대 URL (배포 도메인 기준)
- **서빙**: `/manus-storage/` 경로가 S3 presigned URL로 307 리다이렉트
- **에디터 이미지**: TipTap RichEditor에서 파일 선택 / 드래그&드롭 / 클립보드 붙여넣기 지원

> **주의**: `storagePut`이 반환하는 `url`은 내부 Cloud Run 주소(`http://ak72mgqzs2-...run.app/...`)이므로 사용하지 말고, 반드시 `key`를 사용하여 `${origin}/manus-storage/${key}` 형태로 URL을 직접 구성해야 합니다. (`server/_core/index.ts` 참고)

---

## 완료된 기능

### 포탈 (직원용)
- [x] 직원 로그인/로그아웃 (이메일/비밀번호, 대소문자 무관)
- [x] 메인 대시보드 (공지사항, 게시판, 인사발령, 경조사, 퀵메뉴, 달력)
- [x] 공지사항 목록/상세
- [x] 게시판 목록/작성/상세/수정/삭제 (리치 에디터, 이미지 삽입, 파일 첨부)
- [x] 인사발령 목록/상세
- [x] 경조사 목록/상세
- [x] 조직도 (트리 구조) + 전화번호부 (이름/부서/직위/번호 검색)
- [x] 일정 캘린더 (월별 보기, 일정 추가/삭제)
- [x] 연차 신청 및 현황 조회
- [x] 출퇴근 체크인/체크아웃
- [x] 마이페이지 (프로필 조회)
- [x] 전체메뉴 슬라이드 패널
- [x] GNB (메일, 전자결재, 게시판, 조직도, ERP, 영업시스템, 전체메뉴)
- [x] PC/모바일 반응형 레이아웃

### 어드민 패널 (`/admin`)
- [x] 어드민 로그인 (포탈 세션과 완전 독립)
- [x] 직원 관리 (목록, 추가, 수정, 삭제, 비밀번호 초기화)
- [x] 공지사항 관리 (CRUD, 리치 에디터)
- [x] 게시판 관리 (CRUD)
- [x] 인사발령 관리 (CRUD, 파일 첨부)
- [x] 경조사 관리 (CRUD, 파일 첨부)
- [x] 연차 관리 (신청 목록, 승인/반려)
- [x] 출퇴근 관리

### 해결된 버그
- [x] 어드민/포탈 세션 완전 분리 (`isAdminSession` 플래그 방식)
- [x] 게시판 삭제 권한 버그 (`board.delete`를 `publicProcedure`로 변경, `isAdminSession` 체크)
- [x] 직원 이메일 로그인 대소문자 무관 처리 (`LOWER()` 함수 적용)
- [x] 이미지 업로드 URL 버그 — `storagePut` 반환 내부 URL 대신 `key` 기반 절대 URL 생성

---

## 미완료 / 향후 개발 예정

### 우선순위 높음
- [ ] **직원 비밀번호 변경** — 마이페이지에서 직원이 직접 현재 비밀번호 확인 후 변경
- [ ] **게시글 이미지 라이트박스** — 게시글 상세 페이지에서 이미지 클릭 시 전체화면 확대
- [ ] **공지사항 작성 권한** — 현재 어드민만 가능, 특정 직원(팀장급)도 작성 가능하도록

### 우선순위 중간
- [ ] **메일 기능** — 현재 외부 링크(wmail.ecount.com)로 연결, 내부 메일함 구현 또는 연동
- [ ] **전자결재** — 결재 문서 작성/승인/반려 워크플로우
- [ ] **ERP 연동** — 현재 외부 링크, 내부 연동 또는 임베드
- [ ] **알림 기능** — 공지사항/결재 요청 등 실시간 알림 (웹소켓 또는 폴링)
- [ ] **게시글 댓글** — 게시판 댓글 작성/삭제
- [ ] **파일 다운로드 카운트** — 첨부파일 다운로드 횟수 추적

### 우선순위 낮음
- [ ] **다크모드** — 테마 전환 기능
- [ ] **모바일 앱** — PWA 또는 네이티브 앱 전환
- [ ] **검색 기능 강화** — 현재 GNB 검색창이 UI만 있음, 실제 전체 검색 구현
- [ ] **출퇴근 통계** — 월별/주별 출퇴근 통계 차트
- [ ] **조직도 편집** — 어드민에서 조직도 구조 직접 편집

---

## 환경 변수 (Manus 플랫폼 자동 주입)

| 변수명 | 설명 |
|--------|------|
| `DATABASE_URL` | MySQL/TiDB 연결 문자열 |
| `JWT_SECRET` | 세션 쿠키 서명 키 |
| `ADMIN_PASSWORD` | 어드민 패널 비밀번호 |
| `BUILT_IN_FORGE_API_URL` | Manus 내장 API URL (S3 스토리지 등) |
| `BUILT_IN_FORGE_API_KEY` | Manus 내장 API 인증 키 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | 이메일 발송 설정 |
| `VITE_APP_TITLE` | 앱 타이틀 |
| `VITE_APP_LOGO` | 앱 로고 URL |

---

## 새 세션에서 개발 이어나가기

Manus 플랫폼에서 새 세션을 시작할 때 아래 정보를 전달하세요.

**프로젝트 기본 정보**

| 항목 | 값 |
|------|-----|
| 샌드박스 경로 | `/home/ubuntu/kinoton-portal` |
| 배포 URL | `https://kinotonport-a8dtzhdp.manus.space` |
| GitHub | `https://github.com/mingodedimingo/kinoton_portal` |
| 기본 비밀번호 | `kino1920**` |
| 어드민 경로 | `/admin` |
| 어드민 ID | `admin` |

**개발 완료 후 배포 절차**

```
1. webdev_save_checkpoint 로 체크포인트 저장
2. GitHub에 푸시: git push github main
3. Manus UI의 Publish 버튼으로 배포
```

---

## 커밋 히스토리 요약

| 단계 | 주요 작업 |
|------|-----------|
| 초기 구축 | 프로젝트 부트스트랩, 기본 레이아웃, 메인 대시보드 |
| UI 완성 | GNB, 퀵메뉴, 전체메뉴 오버레이, PC/모바일 반응형 |
| 조직도 | 트리 구조 조직도, 전화번호부, 실제 임직원 데이터 반영 |
| 어드민 패널 | 직원/공지/게시판/인사발령/경조사/연차/출퇴근 CRUD |
| 인증 분리 | 어드민 세션과 포탈 직원 세션 완전 분리 (`isAdminSession`) |
| 리치 에디터 | TipTap 에디터 이미지 업로드 (파일/드래그&드롭/클립보드) |
| 버그 수정 | 이미지 URL 버그, 삭제 권한 버그, 이메일 대소문자 버그 |

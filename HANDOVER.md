# 키노톤 포탈 — Claude 이전 가이드

> 이 문서는 Manus에서 Claude(또는 다른 AI)로 개발을 이전할 때 필요한 모든 정보를 담고 있습니다.

---

## 1. 프로젝트 개요

**키노톤(Kinoton) 사내 포탈** — 직원용 인트라넷 웹 애플리케이션

| 항목 | 내용 |
|------|------|
| 배포 URL | https://kinotonport-a8dtzhdp.manus.space |
| GitHub | https://github.com/mingodedimingo/kinoton_portal |
| 스택 | React 19 + Tailwind 4 + Express 4 + tRPC 11 + TipTap + Drizzle ORM + MySQL(TiDB) |
| 인증 | Manus OAuth (직원 세션: `app_session_id` 쿠키) + 어드민 쿠키(`kino_admin`) |
| 스토리지 | Manus 내장 S3, `storagePut()` 헬퍼 사용, `/manus-storage/{key}` 경로로 서빙 |
| CDN | Cloudflare (주의: 대용량 JSON 페이로드 WAF 차단 있음) |

---

## 2. ⚠️ 이미지 업로드 — 반드시 규칙 문서를 먼저 읽을 것

### 👉 [`docs/이미지_업로드_규칙.md`](./docs/이미지_업로드_규칙.md) 를 먼저 읽으세요.

게시판 이미지가 "깨진 아이콘"으로만 보이는 버그가 **여러 번 재발**했습니다. 매번
다른 "근본 원인"을 고쳤지만, 같은 함정(절대 URL / presigned URL / base64)에 다시
빠지면 또 깨집니다. **업로드/스토리지 코드를 건드리기 전에 위 규칙 문서를 반드시 읽고,
끝에 있는 체크리스트를 통과시키세요.**

**한 문장 규칙**: 업로드 엔드포인트는 `storagePut()`이 반환하는 상대경로
`/manus-storage/{key}` **만** 반환·저장한다. 절대 URL·presigned URL·base64를
클라이언트에 주거나 DB에 저장하지 않는다. 실제 서빙은 `storageProxy`가
서버에서 파일을 파이프한다.

**현재 상태**: 해결됨. 회귀 방지용 계약 테스트(`server/upload.contract.test.ts`)가
`pnpm test`에서 위반을 잡습니다.

**배포 후 테스트 방법**:
```bash
curl -s -X POST "https://kinotonport-a8dtzhdp.manus.space/api/upload-image" \
  -F "image=@테스트이미지.jpg" \
  -w "\nHTTP_STATUS: %{http_code}\n"
# 기대 결과: {"url":"/manus-storage/portal-files/...","key":"..."}  HTTP_STATUS: 200
#  ↑ url은 반드시 "/manus-storage/"로 시작해야 함. "http"로 시작하면 잘못된 것.
```

---

## 3. 프로젝트 구조

```
kinoton-portal/
├── client/
│   ├── src/
│   │   ├── App.tsx                    # 라우팅 (wouter 사용)
│   │   ├── main.tsx                   # tRPC + QueryClient 프로바이더
│   │   ├── index.css                  # 전역 스타일 (CSS 변수: --kino-*)
│   │   ├── const.ts                   # getLoginUrl() 등 상수
│   │   ├── _core/hooks/useAuth.ts     # 인증 훅
│   │   ├── components/
│   │   │   ├── RichEditor.tsx         # TipTap 리치 에디터 (이미지 업로드 포함)
│   │   │   ├── FileUploader.tsx       # 범용 파일 업로드 컴포넌트
│   │   │   ├── PortalLayout.tsx       # 포탈 레이아웃 (GNB 포함)
│   │   │   ├── AdminLayout.tsx        # 어드민 레이아웃
│   │   │   └── ui/                    # shadcn/ui 컴포넌트들
│   │   ├── hooks/
│   │   │   └── useAdminAuth.ts        # 어드민 인증 훅
│   │   └── pages/
│   │       ├── Home.tsx               # 메인 대시보드
│   │       ├── BoardPage.tsx          # 게시판 목록
│   │       ├── BoardDetailPage.tsx    # 게시판 상세/작성/수정
│   │       ├── NoticesPage.tsx        # 공지사항 목록
│   │       ├── NoticeDetailPage.tsx   # 공지사항 상세/작성/수정
│   │       ├── HrPage.tsx             # 인사발령
│   │       ├── CondolencesPage.tsx    # 경조사
│   │       ├── MyPage.tsx             # 마이페이지
│   │       ├── CalendarPage.tsx       # 일정 관리
│   │       ├── LeavePage.tsx          # 연차 관리
│   │       └── admin/                 # 어드민 패널 페이지들
├── server/
│   ├── _core/
│   │   ├── index.ts                   # Express 서버 진입점 (업로드 엔드포인트 포함)
│   │   ├── context.ts                 # tRPC 컨텍스트 (isAdminSession 플래그)
│   │   ├── trpc.ts                    # publicProcedure, protectedProcedure, adminProcedure
│   │   ├── oauth.ts                   # Manus OAuth 콜백 처리
│   │   └── storageProxy.ts            # /manus-storage/* 프록시
│   ├── routers.ts                     # 모든 tRPC 프로시저 (board, notice, hr, condolence 등)
│   ├── db.ts                          # DB 쿼리 헬퍼
│   └── storage.ts                     # storagePut() 헬퍼
├── drizzle/
│   └── schema.ts                      # DB 스키마 (10개 테이블)
└── shared/
    └── types.ts                       # 공유 타입
```

---

## 4. DB 스키마 요약

```typescript
// drizzle/schema.ts 주요 테이블
employees          // 직원 정보 (id, name, department, position, email, profileImageUrl, role)
board_posts        // 게시판 (id, title, content, category, authorId, attachments, views)
notices            // 공지사항 (id, title, content, category, authorId, attachments, isPinned)
hr_notices         // 인사발령 (id, type, employeeName, fromPosition, toPosition, effectiveDate)
condolences        // 경조사 (id, type, employeeName, department, eventDate, description)
attendance         // 출퇴근 (id, employeeId, date, checkIn, checkOut, status)
leave_requests     // 연차 신청 (id, employeeId, startDate, endDate, type, status)
schedules          // 일정 (id, employeeId, title, startDate, endDate, allDay)
```

---

## 5. 인증 구조

### 직원 포탈 세션
- Manus OAuth 로그인 → `app_session_id` 쿠키 발급
- `sdk.verifySession(cookies.app_session_id)` 로 JWT 로컬 검증 (OAuth 서버 호출 없음)
- tRPC `protectedProcedure`에서 `ctx.user` 사용

### 어드민 세션
- `/api/admin/login` (ID/PW) → `kino_admin=kino_admin_v1` 쿠키 발급
- `context.ts`에서 `isAdminSession` 플래그로 전달
- tRPC `adminProcedure`에서 `ctx.isAdminSession` 체크

### 두 세션은 완전 독립
- 포탈 로그인해도 어드민 기능 불가
- 어드민 로그인해도 포탈 직원 정보 조회 가능 (isAdminSession=true이면 허용)

---

## 6. 이미지/파일 업로드 방식

### REST 엔드포인트 (현재 사용)
```
POST /api/upload-image   (multer, field: "image")  → 이미지 전용
POST /api/upload-file    (multer, field: "file")   → 범용 파일
```
- 인증 불필요 (공개 엔드포인트)
- multipart/form-data 방식
- 응답: `{ url: "/manus-storage/{key}", key, name, size, mimeType }`

### 스토리지 서빙
- `/manus-storage/{key}` → `server/_core/storageProxy.ts`가 S3 presigned URL로 리다이렉트

---

## 7. 빌드 명령어

```bash
# 서버 빌드
npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# 프론트엔드 빌드
npx vite build

# 개발 서버 (HMR)
pnpm dev

# DB 스키마 마이그레이션
pnpm db:push

# 테스트
pnpm test
```

---

## 8. 환경 변수 (자동 주입됨, 수동 설정 불필요)

| 변수명 | 용도 |
|--------|------|
| `DATABASE_URL` | MySQL/TiDB 연결 문자열 |
| `JWT_SECRET` | 세션 쿠키 서명 |
| `BUILT_IN_FORGE_API_URL` | Manus 내장 API URL |
| `BUILT_IN_FORGE_API_KEY` | Manus 내장 API 키 (서버용) |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus 내장 API 키 (프론트용) |
| `ADMIN_PASSWORD` | 어드민 로그인 비밀번호 |
| `OAUTH_SERVER_URL` | Manus OAuth 서버 URL |
| `VITE_APP_ID` | Manus OAuth 앱 ID |

---

## 9. 알려진 이슈 및 TODO

### 미해결 버그
- [ ] **이미지 업로드 배포 미완료**: 코드는 수정됐으나 Publish 버튼 클릭 필요

### 향후 개선 사항 (ideas.md 참고)
- [ ] 전자결재 기능 구현
- [ ] 메일 연동
- [ ] 모바일 앱 최적화
- [ ] 알림 시스템 (공지사항 새 글 알림)
- [ ] 파일 첨부 다운로드 기능 완성

---

## 10. 주요 파일 빠른 참조

| 파일 | 역할 |
|------|------|
| `server/_core/index.ts` | Express 서버, 업로드 엔드포인트, 어드민 로그인 |
| `server/routers.ts` | 모든 tRPC 프로시저 (1000줄+) |
| `server/_core/context.ts` | tRPC 컨텍스트 생성 (user, isAdminSession) |
| `client/src/components/RichEditor.tsx` | TipTap 에디터 + 이미지 업로드 |
| `client/src/App.tsx` | 라우팅 설정 |
| `drizzle/schema.ts` | DB 테이블 정의 |
| `client/src/index.css` | CSS 변수 (`--kino-*`) 및 전역 스타일 |

---

## 11. 디자인 시스템

CSS 변수 (`client/src/index.css`):
```css
--kino-charcoal: #1A1A2E   /* 주요 텍스트, 버튼 */
--kino-mid: #4A4A6A         /* 보조 텍스트 */
--kino-muted: #8A8AAA       /* 비활성 텍스트 */
--kino-pale: #E8E8F0        /* 구분선, 테두리 */
--kino-bg: #F5F5FA          /* 배경 */
--kino-white: #FFFFFF
--kino-red: #E53E3E          /* 강조, 배지 */
```

---

*마지막 업데이트: 2026-06-29 | GitHub 커밋: 1a39657*

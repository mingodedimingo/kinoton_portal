/**
 * categories.ts — 카테고리 키-라벨 매핑 중앙 관리
 *
 * 카테고리 라벨을 변경할 때 이 파일 한 곳만 수정하면 됩니다.
 * (공지사항 탭, 어드민 select, 상세 페이지 edit 폼 등 모든 곳에 자동 반영)
 */

/** 공지사항 카테고리 키 타입 */
export type NoticeCategory = "all" | "company" | "dept";

/** 공지사항 카테고리 키 → 표시 라벨 매핑 */
export const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  all: "전체",
  company: "회사",
  dept: "대표이사",
};

/** 공지사항 카테고리 키 배열 (탭/select 렌더링용) */
export const NOTICE_CATEGORY_KEYS = Object.keys(NOTICE_CATEGORY_LABELS) as NoticeCategory[];

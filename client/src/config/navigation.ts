/**
 * navigation.ts — 외부 시스템 링크 URL 중앙 관리
 *
 * 외부 URL이 변경될 때 이 파일 한 곳만 수정하면 됩니다.
 * (GNB, 퀵메뉴, 전체메뉴 오버레이, 메일 페이지 등 모든 곳에 자동 반영)
 */

/** 외부 시스템 URL 모음 */
export const EXTERNAL_URLS = {
  /** 이카운트 웹메일 */
  MAIL: "https://wmail.ecount.com/",
  /** 이카운트 전자결재 */
  APPROVE: "https://login.ecount.com/Login/",
  /** 키노톤 ERP */
  ERP: "https://erp.kinoton.co.kr/",
  /** 키노톤 영업시스템 */
  SALES: "https://sales.kinoton.co.kr/",
  /** 키노톤 홈페이지 */
  HOMEPAGE: "https://kinoton.co.kr/",
} as const;

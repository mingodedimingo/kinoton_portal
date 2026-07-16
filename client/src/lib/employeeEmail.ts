const KINOTON_EMAIL_DOMAIN = "kinoton.co.kr";

/**
 * 직원 이메일은 API에 전체 주소로 저장된 값과 아이디만 저장된 레거시 값이
 * 모두 존재할 수 있으므로, 화면에 표시하기 전에 한 번만 도메인을 보완한다.
 */
export function formatEmployeeEmail(email: string | null | undefined): string | null {
  const value = email?.trim();
  if (!value || value === "-") return null;

  return value.includes("@") ? value : `${value}@${KINOTON_EMAIL_DOMAIN}`;
}

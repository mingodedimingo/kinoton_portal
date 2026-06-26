/**
 * useAdminAuth — 어드민 인증 상태 관리 훅
 * kino_admin 쿠키 하나로만 인증 관리 (포탈 app_session_id와 완전 독립)
 * - 어드민 로그인 → /api/admin/login → kino_admin 쿠키 발급
 * - 어드민 로그아웃 → /api/admin/logout → kino_admin 쿠키만 삭제 (포탈 세션 유지)
 * - 포탈 직원 세션(app_session_id)과 절대 간섭하지 않음
 */
import { useCallback, useEffect, useState } from "react";
export function useAdminAuth() {
  const [adminTokenValid, setAdminTokenValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  // 어드민 토큰 유효성 서버 확인 (/api/admin/check는 kino_admin 쿠키만 체크)
  useEffect(() => {
    let cancelled = false;
    const checkAdminToken = async () => {
      try {
        const res = await fetch("/api/admin/check", { credentials: "include" });
        if (!cancelled) {
          setAdminTokenValid(res.ok);
        }
      } catch {
        if (!cancelled) setAdminTokenValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    checkAdminToken();
    return () => { cancelled = true; };
  }, []);
  const logout = useCallback(async () => {
    // kino_admin 쿠키만 삭제 — 포탈 app_session_id는 절대 건드리지 않음
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/admin/login";
  }, []);
  return {
    token: adminTokenValid ? "admin" : "",
    isAuthenticated: adminTokenValid === true,
    isChecking: checking,
    login: (_token: string) => {},
    logout,
    user: null, // 어드민은 별도 user 객체 불필요
  };
}

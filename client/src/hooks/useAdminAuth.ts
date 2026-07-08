/**
 * useAdminAuth — 어드민 인증 상태 관리 후크
 * kino_admin 쿠키 또는 포탈 직원 세션(role=admin)으로 인증
 * - /api/admin/check 응답에서 name 필드를 받아 현재 로그인한 관리자 이름 반환
 */
import { useCallback, useEffect, useState } from "react";
export function useAdminAuth() {
  const [adminTokenValid, setAdminTokenValid] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState<string>("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkAdminToken = async () => {
      try {
        const res = await fetch("/api/admin/check", { credentials: "include" });
        if (!cancelled) {
          setAdminTokenValid(res.ok);
          if (res.ok) {
            try {
              const data = await res.json();
              // portal_session 방식: name 필드 있음
              // kino_admin 방식: name 없음 → "관리자"로 fallback
              setAdminName(data.name || "관리자");
            } catch {
              setAdminName("관리자");
            }
          }
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
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/admin/login";
  }, []);

  return {
    token: adminTokenValid ? "admin" : "",
    isAuthenticated: adminTokenValid === true,
    isChecking: checking,
    login: (_token: string) => {},
    logout,
    adminName, // 현재 로그인한 관리자 이름
    user: null,
  };
}

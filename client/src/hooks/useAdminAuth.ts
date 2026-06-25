/**
 * useAdminAuth — 어드민 인증 상태 관리 훅
 * 1. /api/admin/login 으로 admin/admin1920 로그인 → adminToken 쿠키 발급
 * 2. role=admin 유저도 접근 가능 (기존 OAuth 방식 병행)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useState } from "react";

export function useAdminAuth() {
  const { user, loading: authLoading, isAuthenticated, logout: authLogout } = useAuth();
  const [adminTokenValid, setAdminTokenValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // 어드민 토큰 유효성 서버 확인
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

  const isChecking = authLoading || checking;

  // role=admin 유저 OR 어드민 토큰 보유자
  const isOAuthAdmin = isAuthenticated && user?.role === "admin";
  const isAdminAuthenticated = isOAuthAdmin || adminTokenValid === true;

  const logout = useCallback(async () => {
    // 어드민 토큰 삭제
    try { await fetch("/api/admin/logout", { method: "POST", credentials: "include" }); } catch {}
    // OAuth 세션도 로그아웃
    if (isAuthenticated) await authLogout();
    window.location.href = "/admin/login";
  }, [isAuthenticated, authLogout]);

  return {
    token: adminTokenValid ? "admin" : "",
    isAuthenticated: isAdminAuthenticated,
    isChecking,
    login: (_token: string) => {},
    logout,
    user,
  };
}

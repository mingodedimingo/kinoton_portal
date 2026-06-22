/**
 * useAdminAuth — 어드민 인증 상태 관리 훅
 * Manus OAuth 세션 기반으로 role=admin 체크
 * (기존 localStorage/토큰 방식 제거)
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export function useAdminAuth() {
  const { user, loading, isAuthenticated, logout: authLogout } = useAuth();

  const isAdmin = isAuthenticated && user?.role === "admin";
  const isChecking = loading;

  const logout = useCallback(async () => {
    await authLogout();
    window.location.href = "/";
  }, [authLogout]);

  return {
    token: "",          // 레거시 호환용 (사용 안 함)
    isAuthenticated: isAdmin,
    isChecking,
    login: (_token: string) => {},  // 레거시 호환용 (사용 안 함)
    logout,
    user,
  };
}

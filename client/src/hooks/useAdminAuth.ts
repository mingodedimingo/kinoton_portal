/**
 * useAdminAuth — 어드민 인증 상태 관리 훅
 * localStorage에 토큰을 저장하고, 서버에서 유효성 검증
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const ADMIN_TOKEN_KEY = "kinoton_admin_token";

export function useAdminAuth() {
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 토큰 유효성 서버 검증
  const { data: verifyResult, isLoading: isVerifying } = trpc.admin.verify.useQuery(
    { token: token ?? "" },
    {
      enabled: !!token,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!token) {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }
    if (!isVerifying) {
      const valid = verifyResult?.valid ?? false;
      setIsAuthenticated(valid);
      if (!valid) {
        // 유효하지 않은 토큰 제거
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken(null);
      }
      setIsChecking(false);
    }
  }, [token, isVerifying, verifyResult]);

  const login = useCallback((newToken: string) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
    setToken(newToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken(null);
    setIsAuthenticated(false);
  }, []);

  return {
    token: token ?? "",
    isAuthenticated,
    isChecking: isChecking || (!!token && isVerifying),
    login,
    logout,
  };
}

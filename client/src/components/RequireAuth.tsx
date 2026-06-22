/**
 * RequireAuth.tsx
 * 로그인하지 않은 사용자를 Manus 로그인 페이지로 리다이렉트합니다.
 * 어드민 페이지는 별도의 AdminAuthGuard를 사용하므로 이 컴포넌트는 일반 페이지에만 적용합니다.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--kino-bg)" }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: "var(--kino-charcoal)" }} />
          <p className="text-sm" style={{ color: "var(--kino-muted)" }}>로그인 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // useAuth의 redirectOnUnauthenticated가 리다이렉트 처리하므로 빈 화면 반환
    return null;
  }

  return <>{children}</>;
}

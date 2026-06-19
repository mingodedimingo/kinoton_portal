/**
 * AdminLoginPage — 어드민 로그인 페이지
 * 비밀번호 입력 후 서버 검증 → localStorage 토큰 저장
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const onLoginSuccess = () => { window.location.href = "/admin"; };
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const { login } = useAdminAuth();

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess: (data) => {
      login(data.token);
      onLoginSuccess?.();
    },
    onError: (err) => {
      setErrorMsg(err.message || "로그인에 실패했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!password.trim()) {
      setErrorMsg("비밀번호를 입력해주세요.");
      return;
    }
    loginMutation.mutate({ password });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--kino-bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-lg"
        style={{
          background: "var(--kino-white)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid var(--kino-pale)",
        }}
      >
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/manus-storage/kinoton_logo_bk_d7634f1a.png"
            alt="Kinoton"
            style={{ height: "32px", width: "auto", marginBottom: "1.5rem" }}
          />
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ background: "var(--kino-charcoal)" }}
          >
            <Lock size={20} color="white" />
          </div>
          <h1 className="text-lg font-bold" style={{ color: "var(--kino-charcoal)" }}>
            관리자 로그인
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>
            어드민 비밀번호를 입력해주세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="비밀번호"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg("");
              }}
              autoFocus
              className="w-full px-4 py-3 pr-10 rounded-md text-sm outline-none transition-all"
              style={{
                border: errorMsg
                  ? "1.5px solid var(--kino-red)"
                  : "1.5px solid var(--kino-pale)",
                color: "var(--kino-charcoal)",
                background: "var(--kino-bg)",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--kino-muted)" }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {errorMsg && (
            <p className="text-xs" style={{ color: "var(--kino-red)" }}>
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 rounded-md text-sm font-bold transition-all active:scale-95"
            style={{
              background: loginMutation.isPending ? "var(--kino-light)" : "var(--kino-charcoal)",
              color: "white",
            }}
          >
            {loginMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                확인 중...
              </span>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--kino-light)" }}>
          © 2026 Kinoton Inc.
        </p>
      </div>
    </div>
  );
}

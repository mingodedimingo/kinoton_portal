/**
 * LoginPage — 직원 이메일+비밀번호 로그인
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const loginMutation = trpc.auth.employeeLogin.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (e) => {
      toast.error(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    loginMutation.mutate({ email: email.trim(), password });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--kino-bg)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "var(--kino-white)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        {/* 로고 영역 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "var(--kino-charcoal)" }}
          >
            <span className="text-white font-black text-lg tracking-tight">K</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--kino-charcoal)" }}>
            키노톤 사내 포탈
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>
            등록된 직원 계정으로 로그인하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="text-xs font-semibold block mb-1.5"
              style={{ color: "var(--kino-mid)" }}
            >
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="mingu.kim@kinoton.co.kr"
              autoComplete="email"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                border: "1.5px solid var(--kino-pale)",
                color: "var(--kino-charcoal)",
                background: "var(--kino-bg)",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
              onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
            />
          </div>

          <div>
            <label
              className="text-xs font-semibold block mb-1.5"
              style={{ color: "var(--kino-mid)" }}
            >
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all pr-10"
                style={{
                  border: "1.5px solid var(--kino-pale)",
                  color: "var(--kino-charcoal)",
                  background: "var(--kino-bg)",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--kino-muted)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "var(--kino-charcoal)", color: "white", marginTop: "0.25rem" }}
          >
            {loginMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            로그인
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--kino-light)" }}>
          계정 문의: 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}

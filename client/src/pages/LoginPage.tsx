/**
 * LoginPage — 직원 이메일+비밀번호 로그인 + 비밀번호 찾기
 * 흐름: 로그인 → (비밀번호 찾기 클릭) → 이메일 입력 → 코드 확인 → 새 비밀번호 설정 → 로그인
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SAVED_EMAIL_KEY = "kino_saved_email";

type ResetStep = "email" | "code" | "newPassword";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "reset">("login");

  // ── 로그인 상태 ──────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);

  // ── 비밀번호 찾기 상태 ───────────────────────────────────────
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);

  const requestReset = trpc.auth.requestPasswordReset.useMutation();
  const resetPassword = trpc.auth.resetPassword.useMutation();

  // ── 저장된 이메일 불러오기 ───────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setSaveEmail(true);
    }
  }, []);

  // ── 로그인 핸들러 ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/employee-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
      } else {
        // 이메일 저장 처리
        if (saveEmail) {
          localStorage.setItem(SAVED_EMAIL_KEY, email.trim());
        } else {
          localStorage.removeItem(SAVED_EMAIL_KEY);
        }
        window.location.href = "/";
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ── 비밀번호 찾기: 이메일 발송 ──────────────────────────────
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    try {
      await requestReset.mutateAsync({ email: resetEmail.trim() });
      toast.success("인증 코드를 이메일로 발송했습니다. 10분 내에 입력해주세요.");
      setResetStep("code");
    } catch {
      toast.error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // ── 비밀번호 찾기: 코드 확인 ────────────────────────────────
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length !== 6) {
      toast.error("6자리 인증 코드를 입력해주세요.");
      return;
    }
    setResetStep("newPassword");
  };

  // ── 비밀번호 찾기: 새 비밀번호 설정 ────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      await resetPassword.mutateAsync({
        email: resetEmail.trim(),
        code: resetCode,
        newPassword,
      });
      toast.success("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.");
      // 로그인 화면으로 돌아가기
      setMode("login");
      setEmail(resetEmail);
      setPassword("");
      setResetStep("email");
      setResetEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "비밀번호 재설정에 실패했습니다.");
    }
  };

  const inputStyle = {
    border: "1.5px solid var(--kino-pale)",
    color: "var(--kino-charcoal)",
    background: "var(--kino-bg)",
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
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663697530344/JiOEsaAjyNOzfJKQ.png"
            alt="Kinoton"
            className="mb-4"
            style={{ height: "48px", width: "auto", objectFit: "contain" }}
          />
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--kino-charcoal)" }}>
            키노톤 사내 포탈
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--kino-muted)" }}>
            {mode === "login" ? "등록된 직원 계정으로 로그인하세요" : "비밀번호 재설정"}
          </p>
        </div>

        {/* ── 로그인 폼 ── */}
        {mode === "login" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mingu.kim@kinoton.co.kr"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
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
                  style={inputStyle}
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

            {/* 이메일(ID) 저장 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer select-none" style={{ marginTop: "-0.25rem" }}>
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={e => setSaveEmail(e.target.checked)}
                className="w-3.5 h-3.5 rounded cursor-pointer"
                style={{ accentColor: "var(--kino-charcoal)" }}
              />
              <span className="text-xs" style={{ color: "var(--kino-muted)" }}>이메일(ID) 저장</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "var(--kino-charcoal)", color: "white", marginTop: "0.25rem" }}
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              로그인
            </button>

            <button
              type="button"
              onClick={() => { setMode("reset"); setResetStep("email"); }}
              className="text-xs text-center mt-1 hover:underline"
              style={{ color: "var(--kino-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </form>
        )}

        {/* ── 비밀번호 찾기: 이메일 입력 ── */}
        {mode === "reset" && resetStep === "email" && (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: "var(--kino-mid)" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5">
                <Mail size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>이메일 인증</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
              등록된 이메일 주소를 입력하면 인증 코드를 발송합니다.
            </p>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
                이메일
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="mingu.kim@kinoton.co.kr"
                autoComplete="email"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
              />
            </div>
            <button
              type="submit"
              disabled={requestReset.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              {requestReset.isPending && <Loader2 size={14} className="animate-spin" />}
              인증 코드 발송
            </button>
          </form>
        )}

        {/* ── 비밀번호 찾기: 코드 입력 ── */}
        {mode === "reset" && resetStep === "code" && (
          <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setResetStep("email")}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: "var(--kino-mid)" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5">
                <KeyRound size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>인증 코드 입력</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
              <strong>{resetEmail}</strong>로 발송된 6자리 코드를 입력하세요. (10분 유효)
            </p>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
                인증 코드
              </label>
              <input
                type="text"
                value={resetCode}
                onChange={e => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all text-center tracking-[0.4em] font-bold"
                style={{ ...inputStyle, fontSize: "1.25rem" }}
                onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              확인
            </button>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={requestReset.isPending}
              className="text-xs text-center hover:underline"
              style={{ color: "var(--kino-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              코드를 받지 못하셨나요? 재발송
            </button>
          </form>
        )}

        {/* ── 비밀번호 찾기: 새 비밀번호 설정 ── */}
        {mode === "reset" && resetStep === "newPassword" && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setResetStep("code")}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: "var(--kino-mid)" }}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex items-center gap-1.5">
                <Lock size={14} style={{ color: "var(--kino-mid)" }} />
                <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>새 비밀번호 설정</span>
              </div>
            </div>
            <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
              새 비밀번호를 입력하세요. (6자 이상)
            </p>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all pr-10"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                  onBlur={e => (e.target.style.borderColor = "var(--kino-pale)")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--kino-muted)" }}
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--kino-mid)" }}>
                비밀번호 확인
              </label>
              <input
                type={showNewPw ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  ...inputStyle,
                  borderColor: confirmPassword && confirmPassword !== newPassword ? "#ef4444" : undefined,
                }}
                onFocus={e => (e.target.style.borderColor = "var(--kino-charcoal)")}
                onBlur={e => (e.target.style.borderColor = confirmPassword !== newPassword ? "#ef4444" : "var(--kino-pale)")}
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="text-xs mt-1" style={{ color: "#ef4444" }}>비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={resetPassword.isPending}
              className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              {resetPassword.isPending && <Loader2 size={14} className="animate-spin" />}
              비밀번호 변경
            </button>
          </form>
        )}

        <p className="text-center text-xs mt-6" style={{ color: "var(--kino-light)" }}>
          계정 문의: 관리자에게 연락하세요
        </p>
      </div>
    </div>
  );
}

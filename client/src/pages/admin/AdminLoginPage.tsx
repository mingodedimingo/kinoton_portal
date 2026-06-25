/**
 * AdminLoginPage — 어드민 로그인 페이지
 * ID: admin / PW: admin1920 방식으로 로그인
 */
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !password.trim()) {
      toast.error("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: id.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
      } else {
        window.location.href = "/admin";
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0F0F0F" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "#1A1A1A", boxShadow: "0 4px 32px rgba(0,0,0,0.5)", border: "1px solid #2A2A2A" }}
      >
        {/* 로고 영역 */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/manus-storage/kinoton_logo_wh_fda912cf.png"
            alt="Kinoton"
            style={{ height: "28px", width: "auto", marginBottom: "1.5rem" }}
          />
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
            style={{ background: "#2A2A2A" }}
          >
            <ShieldCheck size={22} color="#E5E7EB" />
          </div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "#F9FAFB" }}>
            관리자 로그인
          </h1>
          <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
            관리자 계정으로 로그인하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#9CA3AF" }}>
              아이디
            </label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                border: "1.5px solid #2A2A2A",
                color: "#F9FAFB",
                background: "#111111",
              }}
              onFocus={e => (e.target.style.borderColor = "#6B7280")}
              onBlur={e => (e.target.style.borderColor = "#2A2A2A")}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: "#9CA3AF" }}>
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
                  border: "1.5px solid #2A2A2A",
                  color: "#F9FAFB",
                  background: "#111111",
                }}
                onFocus={e => (e.target.style.borderColor = "#6B7280")}
                onBlur={e => (e.target.style.borderColor = "#2A2A2A")}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#6B7280" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "#F9FAFB", color: "#111111", marginTop: "0.25rem" }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            로그인
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#374151" }}>
          © 2026 Kinoton Inc.
        </p>
      </div>
    </div>
  );
}

/**
 * AdminLoginPage — 어드민 로그인 안내 페이지
 * 기존 비밀번호 방식 제거 → Manus OAuth 로그인 후 role=admin 확인 방식으로 교체
 * 이 페이지는 직접 접근 시에만 표시됨 (AdminLayout에서 미인증 시 Manus 로그인으로 리다이렉트)
 */
import { Lock } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function AdminLoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--kino-bg)" }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-lg text-center"
        style={{
          background: "var(--kino-white)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid var(--kino-pale)",
        }}
      >
        {/* 로고 */}
        <img
          src="/manus-storage/kinoton_logo_bk_d7634f1a.png"
          alt="Kinoton"
          style={{ height: "32px", width: "auto", margin: "0 auto 1.5rem" }}
        />
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "var(--kino-charcoal)" }}
        >
          <Lock size={20} color="white" />
        </div>
        <h1 className="text-lg font-bold mb-2" style={{ color: "var(--kino-charcoal)" }}>
          관리자 페이지
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--kino-muted)" }}>
          관리자 권한이 있는 계정으로 로그인하세요.
        </p>
        <button
          onClick={() => { window.location.href = getLoginUrl(); }}
          className="w-full py-3 rounded-md text-sm font-bold transition-all active:scale-95"
          style={{ background: "var(--kino-charcoal)", color: "white" }}
        >
          Manus 계정으로 로그인
        </button>
        <p className="text-center text-xs mt-6" style={{ color: "var(--kino-light)" }}>
          © 2026 Kinoton Inc.
        </p>
      </div>
    </div>
  );
}

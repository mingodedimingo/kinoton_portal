import { Link } from "wouter";
import PortalLayout from "@/components/PortalLayout";

export default function NotFound() {
  return (
    <PortalLayout>
      <div className="container py-20 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-7xl font-black" style={{ color: "var(--kino-pale)" }}>404</p>
        <h1 className="text-xl font-bold" style={{ color: "var(--kino-charcoal)" }}>페이지를 찾을 수 없습니다</h1>
        <p className="text-sm" style={{ color: "var(--kino-muted)" }}>요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
        <Link href="/">
          <button
            className="mt-2 px-5 py-2 rounded text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: "var(--kino-charcoal)" }}
          >
            홈으로 돌아가기
          </button>
        </Link>
      </div>
    </PortalLayout>
  );
}

/**
 * MailPage — 이카운트 웹메일 iframe 임베드
 * 상단 GNB(PortalLayout) 유지, 하단 전체 영역에 wmail.ecount.com 표시
 * iframe 차단 시 안내 메시지 + 새 탭 열기 버튼 표시
 */
import { useState, useRef } from "react";
import { ExternalLink, RefreshCw, AlertCircle, Mail } from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import { EXTERNAL_URLS } from "@/config/navigation";

const MAIL_URL = EXTERNAL_URLS.MAIL;

export default function MailPage() {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleLoad = () => {
    // cross-origin 이므로 contentDocument 접근은 보안 오류 발생 → 정상 로드로 간주
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc && doc.URL === "about:blank") {
        setBlocked(true);
      }
    } catch {
      // cross-origin 정상 케이스 — 차단 아님
    }
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setBlocked(true);
  };

  const handleRefresh = () => {
    setLoading(true);
    setBlocked(false);
    if (iframeRef.current) {
      iframeRef.current.src = MAIL_URL;
    }
  };

  return (
    <PortalLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
        {/* 서브 헤더 */}
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{
            background: "var(--kino-white)",
            borderBottom: "1px solid var(--kino-pale)",
            height: "44px",
          }}
        >
          <div className="flex items-center gap-2">
            <Mail size={15} style={{ color: "var(--kino-charcoal)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--kino-charcoal)" }}>
              메일
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: "var(--kino-bg)", color: "var(--kino-muted)" }}
            >
              wmail.ecount.com
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors hover:bg-gray-100"
              style={{ color: "var(--kino-mid)" }}
            >
              <RefreshCw size={13} />
              새로고침
            </button>
            <a
              href={MAIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{ background: "var(--kino-charcoal)", color: "white" }}
            >
              <ExternalLink size={13} />
              새 탭으로 열기
            </a>
          </div>
        </div>

        {/* iframe 영역 */}
        <div className="flex-1 relative overflow-hidden">
          {/* 로딩 스피너 */}
          {loading && !blocked && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10"
              style={{ background: "var(--kino-bg)" }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin mb-3"
                style={{
                  borderColor: "var(--kino-pale)",
                  borderTopColor: "var(--kino-charcoal)",
                }}
              />
              <p className="text-sm" style={{ color: "var(--kino-muted)" }}>
                이카운트 웹메일 불러오는 중...
              </p>
            </div>
          )}

          {/* 차단 안내 */}
          {blocked && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4"
              style={{ background: "var(--kino-bg)" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--kino-pale)" }}
              >
                <AlertCircle size={28} style={{ color: "var(--kino-mid)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--kino-charcoal)" }}>
                  메일을 포탈 내에서 열 수 없습니다
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--kino-muted)" }}>
                  이카운트 서버 보안 정책으로 인해 iframe 표시가 차단되었습니다.
                  <br />
                  아래 버튼을 클릭해 새 탭에서 웹메일을 이용해 주세요.
                </p>
              </div>
              <a
                href={MAIL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "var(--kino-charcoal)", color: "white" }}
              >
                <ExternalLink size={15} />
                이카운트 웹메일 열기
              </a>
            </div>
          )}

          {/* iframe */}
          <iframe
            ref={iframeRef}
            src={MAIL_URL}
            title="이카운트 웹메일"
            onLoad={handleLoad}
            onError={handleError}
            className="w-full h-full border-0"
            style={{ display: blocked ? "none" : "block" }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          />
        </div>
      </div>
    </PortalLayout>
  );
}

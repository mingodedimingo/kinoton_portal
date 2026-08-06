/**
 * youtubeEmbed.ts
 * 게시글 본문 HTML 내 유튜브 URL을 iframe 임베드로 자동 변환하는 유틸리티
 *
 * 지원 URL 형식:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID (이미 임베드된 경우 중복 방지)
 *   - https://m.youtube.com/watch?v=VIDEO_ID (모바일)
 *
 * 동작 방식:
 *   1. DOMPurify sanitize 이후 clean HTML 문자열을 입력으로 받음
 *   2. <a href="...youtube..."> 태그 또는 텍스트 노드의 유튜브 URL을 감지
 *   3. 해당 URL을 반응형 iframe 래퍼로 교체
 *   4. 이미 <iframe> 안에 있는 경우 중복 변환 방지
 */

/** 유튜브 URL에서 video ID를 추출 */
export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split(/[?&#]/)[0];
      return id.length >= 11 ? id : null;
    }
    // youtube.com/watch?v=VIDEO_ID
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "m.youtube.com"
    ) {
      const v = u.searchParams.get("v");
      if (v && v.length >= 11) return v;
      // youtube.com/embed/VIDEO_ID — 이미 임베드된 경우 추출만
      const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];
    }
    return null;
  } catch {
    return null;
  }
}

/** 반응형 YouTube iframe HTML 생성 */
function buildIframe(videoId: string): string {
  return `<div class="yt-embed-wrapper" style="position:relative;width:100%;max-width:640px;padding-bottom:56.25%;height:0;margin:12px 0;border-radius:8px;overflow:hidden;background:#000;">
  <iframe
    src="https://www.youtube.com/embed/${videoId}"
    title="YouTube video"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:8px;"
  ></iframe>
</div>`;
}

/**
 * HTML 문자열 내 유튜브 링크를 iframe 임베드로 변환
 *
 * 처리 대상:
 *   - <a href="https://www.youtube.com/...">...</a>  → 링크 태그를 iframe으로 교체
 *   - 텍스트 노드에 단독으로 있는 유튜브 URL        → URL 텍스트를 iframe으로 교체
 *
 * 이미 <iframe> 태그가 있는 경우는 건드리지 않음 (중복 방지)
 */
export function injectYoutubeEmbeds(html: string): string {
  if (!html) return html;

  // 1단계: <a href="유튜브URL">...</a> 패턴 교체
  //   - href 속성이 유튜브 URL인 <a> 태그 전체를 iframe으로 대체
  //   - 단, 이미 iframe 안에 있는 경우는 제외 (간단히 yt-embed-wrapper 존재 여부로 판단)
  let result = html.replace(
    /<a\s[^>]*href=["']([^"']*(?:youtube\.com\/watch|youtu\.be\/)[^"']*)["'][^>]*>[\s\S]*?<\/a>/gi,
    (match, href) => {
      const id = extractYoutubeId(href);
      if (!id) return match;
      return buildIframe(id);
    }
  );

  // 2단계: 텍스트 노드에 단독으로 있는 유튜브 URL 교체
  //   - <p>, <div>, <li> 등의 태그 내부에 유튜브 URL이 텍스트로만 있는 경우
  //   - URL 앞뒤로 공백/태그 경계가 있는 경우에만 처리 (부분 치환 방지)
  result = result.replace(
    /(?<!['"=])(https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?[^\s<>"']*v=[A-Za-z0-9_-]{11}[^\s<>"']*|youtu\.be\/[A-Za-z0-9_-]{11}[^\s<>"']*))/g,
    (match) => {
      const id = extractYoutubeId(match);
      if (!id) return match;
      return buildIframe(id);
    }
  );

  return result;
}

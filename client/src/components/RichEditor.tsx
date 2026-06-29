/**
 * RichEditor.tsx — TipTap 기반 리치 텍스트 에디터
 * 이미지 업로드: multipart/form-data 방식 (Cloudflare WAF 우회, 인증 불필요)
 *
 * [수정 내역]
 * 1. TipTap 자체 paste/drop 이벤트와 충돌 방지
 *    → editorProps.handleDrop / handlePaste 로 이벤트 처리 이관
 * 2. isDragOver 오버레이 위치 버그 수정
 *    → wrapper div에 position: relative 추가
 * 3. TipTap Image extension에 allowBase64: false → true 유지하되
 *    업로드 성공 시에만 src 삽입하도록 보장
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback, useRef, useState } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List as ListIcon, ListOrdered,
  Table as TableIcon, ImageIcon, Link as LinkIcon,
  Undo, Redo, Upload,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/**
 * multipart/form-data 방식으로 이미지 업로드
 * - Base64 방식 대신 FormData 사용 → Cloudflare WAF 403 차단 없음
 * - /api/upload-image 엔드포인트는 인증 없이 사용 가능
 */
async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const resp = await fetch("/api/upload-image", {
    method: "POST",
    credentials: "include",
    body: formData,
    // Content-Type 헤더를 직접 설정하지 않음 → 브라우저가 boundary 포함한 multipart 헤더 자동 설정
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`이미지 업로드 실패 (${resp.status}): ${errText.slice(0, 100)}`);
  }

  const data = await resp.json() as { url: string };
  if (!data.url) throw new Error("서버에서 URL을 반환하지 않았습니다.");
  return data.url;
}

export default function RichEditor({ value, onChange, placeholder = "내용을 입력하세요...", minHeight = 300 }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // useRef로 handleFiles를 참조해 editor 의존성 순환 방지
  const handleFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ inline: true, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        style: `min-height: ${minHeight}px; outline: none; padding: 0.75rem; font-size: 0.875rem; line-height: 1.7;`,
      },
      // ✅ 핵심 수정 1: TipTap 내부에서 paste 이벤트를 가로채어 처리
      // 기존: wrapper div의 onPaste → TipTap 내부 paste와 충돌
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItems = items.filter(item => item.type.startsWith("image/"));
        if (imageItems.length === 0) return false; // 이미지 없으면 기본 동작 허용

        event.preventDefault();
        const files = imageItems
          .map(item => item.getAsFile())
          .filter((f): f is File => f !== null);
        handleFilesRef.current(files);
        return true; // 이벤트 처리 완료, TipTap 기본 동작 차단
      },
      // ✅ 핵심 수정 2: TipTap 내부에서 drop 이벤트를 가로채어 처리
      // 기존: wrapper div의 onDrop → TipTap 내부 drop과 충돌
      handleDrop: (_view, event, _slice, moved) => {
        if (moved) return false; // 에디터 내부 노드 이동은 기본 동작 허용
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFiles = files.filter(f => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        setIsDragOver(false);
        handleFilesRef.current(imageFiles);
        return true; // 이벤트 처리 완료
      },
    },
  });

  // 외부 value 변경 시 동기화 (초기 로드)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 이미지 파일 업로드 후 에디터에 삽입 */
  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (!imageFiles.length || !editor) return;

    setUploading(true);
    try {
      for (const file of imageFiles) {
        const url = await uploadImageFile(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [editor]);

  // handleFiles를 ref에 동기화 (editor 의존성 순환 없이 editorProps에서 사용 가능)
  useEffect(() => {
    handleFilesRef.current = handleFiles;
  }, [handleFiles]);

  // 파일 선택 버튼으로 이미지 업로드
  const handleImageFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    await handleFiles(files);
  }, [handleFiles]);

  // URL 입력으로 이미지 삽입
  const insertImageByUrl = useCallback(() => {
    const url = prompt("이미지 URL을 입력하세요:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = prompt("링크 URL을 입력하세요:", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const btnBase = "p-1.5 rounded transition-colors text-xs font-medium";
  const btnActive = "bg-gray-200";
  const btnInactive = "hover:bg-gray-100";

  const ToolBtn = ({
    onClick, active, title, children, disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`${btnBase} ${active ? btnActive : btnInactive} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      style={{ color: active ? "var(--kino-charcoal)" : "var(--kino-mid)" }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span className="inline-block w-px h-5 mx-1" style={{ background: "var(--kino-pale)" }} />
  );

  return (
    // ✅ 핵심 수정 3: position: relative 추가 → 드래그 오버레이가 정확한 위치에 표시됨
    <div
      style={{
        position: "relative", // ← 추가됨
        border: `1px solid ${isDragOver ? "#2563EB" : "var(--kino-pale)"}`,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        background: "white",
        transition: "border-color 0.15s",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={(e) => {
        // ✅ 수정 4: 자식 요소로 드래그 이동 시 isDragOver가 false로 튀는 현상 방지
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false);
        }
      }}
      // onDrop은 editorProps.handleDrop에서 처리하므로 여기서는 제거
      // (wrapper div의 onDrop이 있으면 TipTap과 이중 처리됨)
    >
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleImageFileSelect}
      />

      {/* ── 툴바 ── */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-2 py-1.5"
        style={{ borderBottom: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}
      >
        {/* 실행 취소/다시 실행 */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="실행 취소 (Ctrl+Z)">
          <Undo size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="다시 실행 (Ctrl+Y)">
          <Redo size={14} />
        </ToolBtn>

        <Divider />

        {/* 서식 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="굵게 (Ctrl+B)">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="기울임 (Ctrl+I)">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="밑줄 (Ctrl+U)">
          <UnderlineIcon size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="취소선">
          <Strikethrough size={14} />
        </ToolBtn>

        <Divider />

        {/* 제목 */}
        {([1, 2, 3] as const).map((level) => (
          <ToolBtn
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive("heading", { level })}
            title={`제목 ${level}`}
          >
            <span style={{ fontSize: "11px", fontWeight: 700 }}>H{level}</span>
          </ToolBtn>
        ))}

        <Divider />

        {/* 정렬 */}
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="왼쪽 정렬">
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="가운데 정렬">
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="오른쪽 정렬">
          <AlignRight size={14} />
        </ToolBtn>

        <Divider />

        {/* 목록 */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="글머리 기호 목록">
          <ListIcon size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="번호 목록">
          <ListOrdered size={14} />
        </ToolBtn>

        <Divider />

        {/* 표 */}
        <ToolBtn onClick={insertTable} title="표 삽입 (3×3)">
          <TableIcon size={14} />
        </ToolBtn>
        {editor.isActive("table") && (
          <>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} title="열 추가" className={`${btnBase} ${btnInactive} text-xs`} style={{ color: "var(--kino-mid)", fontSize: "10px" }}>열+</button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} title="행 추가" className={`${btnBase} ${btnInactive} text-xs`} style={{ color: "var(--kino-mid)", fontSize: "10px" }}>행+</button>
            <button type="button" onClick={() => editor.chain().focus().deleteColumn().run()} title="열 삭제" className={`${btnBase} ${btnInactive} text-xs`} style={{ color: "#DC2626", fontSize: "10px" }}>열-</button>
            <button type="button" onClick={() => editor.chain().focus().deleteRow().run()} title="행 삭제" className={`${btnBase} ${btnInactive} text-xs`} style={{ color: "#DC2626", fontSize: "10px" }}>행-</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} title="표 삭제" className={`${btnBase} ${btnInactive} text-xs`} style={{ color: "#DC2626", fontSize: "10px" }}>표삭제</button>
          </>
        )}

        <Divider />

        {/* 이미지 업로드 (파일 선택) */}
        <ToolBtn
          onClick={() => fileInputRef.current?.click()}
          title="이미지 파일 업로드 (드래그&드롭, 클립보드 붙여넣기도 지원)"
          disabled={uploading}
        >
          {uploading ? (
            <span style={{ fontSize: "10px" }}>업로드중...</span>
          ) : (
            <Upload size={14} />
          )}
        </ToolBtn>

        {/* 이미지 URL 삽입 */}
        <ToolBtn onClick={insertImageByUrl} title="이미지 URL로 삽입">
          <ImageIcon size={14} />
        </ToolBtn>

        {/* 링크 */}
        <ToolBtn onClick={setLink} active={editor.isActive("link")} title="링크 삽입">
          <LinkIcon size={14} />
        </ToolBtn>
      </div>

      {/* 드래그 오버 안내 */}
      {isDragOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(37,99,235,0.08)",
            border: "2px dashed #2563EB",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 10,
            fontSize: "0.875rem",
            color: "#2563EB",
            fontWeight: 500,
          }}
        >
          이미지를 여기에 놓으세요
        </div>
      )}

      {/* ── 에디터 본문 ── */}
      <div style={{ position: "relative" }}>
        <EditorContent editor={editor} />
        {/* 업로드 중 오버레이 */}
        {uploading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.875rem",
              color: "var(--kino-mid)",
              fontWeight: 500,
            }}
          >
            이미지 업로드 중...
          </div>
        )}
      </div>

      {/* 도움말 */}
      <div style={{ padding: "4px 12px", fontSize: "11px", color: "var(--kino-muted)", borderTop: "1px solid var(--kino-pale)", background: "var(--kino-bg)" }}>
        💡 이미지를 드래그&드롭하거나, 클립보드에서 붙여넣기(Ctrl+V)하거나, ↑ 버튼으로 파일을 선택할 수 있습니다.
      </div>
    </div>
  );
}

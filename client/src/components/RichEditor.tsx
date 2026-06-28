/**
 * RichEditor.tsx — TipTap 기반 리치 텍스트 에디터
 * 이미지 업로드: tRPC mutation 기반 (Base64 인코딩) - 인증 쿠키 문제 없음
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
import { trpc } from "@/lib/trpc";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

/** File → Base64 data URL 변환 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsDataURL(file);
  });
}

export default function RichEditor({ value, onChange, placeholder = "내용을 입력하세요...", minHeight = 300 }: RichEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // tRPC 이미지 업로드 mutation
  const uploadImageMutation = trpc.upload.image.useMutation();

  /** 파일 → tRPC로 업로드 → URL 반환 */
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const base64 = await fileToBase64(file);
    const result = await uploadImageMutation.mutateAsync({
      base64,
      mimeType: file.type || "image/jpeg",
      filename: file.name || "image.jpg",
    });
    return result.url;
  }, [uploadImageMutation]);

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
      Image.configure({ inline: true, allowBase64: true }),
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
    },
  });

  // 외부 value 변경 시 동기화 (초기 로드)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 클립보드 붙여넣기 핸들러
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!editor) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();

    const files = imageItems.map(item => item.getAsFile()).filter((f): f is File => f !== null);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [editor, uploadFile]);

  // 드래그&드롭 핸들러
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!editor) return;

    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;

    setUploading(true);
    try {
      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })?.pos
        ?? editor.state.doc.content.size;

      const urls = await Promise.all(files.map(file => uploadFile(file)));
      const { schema } = editor.state;
      let tr = editor.state.tr;
      let insertPos = pos;
      for (const url of urls) {
        const node = schema.nodes.image.create({ src: url });
        tr = tr.insert(insertPos, node);
        insertPos += node.nodeSize;
      }
      editor.view.dispatch(tr);
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [editor, uploadFile]);

  // 파일 선택 버튼으로 이미지 업로드
  const handleImageFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editor) return;
    e.target.value = "";
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(false);
    }
  }, [editor, uploadFile]);

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
    <div
      style={{ border: `1px solid ${isDragOver ? "#2563EB" : "var(--kino-pale)"}`, borderRadius: "var(--radius)", overflow: "hidden", background: "white", transition: "border-color 0.15s" }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onPaste={handlePaste}
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
        💡 이미지를 드래그&드롭하거나, 클립보드에서 붙여넣기(Ctrl+V)하거나, <Upload size={10} style={{ display: "inline", verticalAlign: "middle" }} /> 버튼으로 파일을 선택할 수 있습니다.
      </div>

      {/* ── 표 스타일 ── */}
      <style>{`
        .rich-editor-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75rem 0;
        }
        .rich-editor-content th,
        .rich-editor-content td {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          text-align: left;
          font-size: 0.8125rem;
        }
        .rich-editor-content th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .rich-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 4px 0;
        }
        .rich-editor-content p { margin: 0.25rem 0; }
        .rich-editor-content h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0 0.25rem; }
        .rich-editor-content h2 { font-size: 1.25rem; font-weight: 700; margin: 0.75rem 0 0.25rem; }
        .rich-editor-content h3 { font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0 0.25rem; }
        .rich-editor-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.25rem 0; }
        .rich-editor-content a { color: #2563EB; text-decoration: underline; }
      `}</style>
    </div>
  );
}

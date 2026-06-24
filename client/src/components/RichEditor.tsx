/**
 * RichEditor.tsx — TipTap 기반 리치 텍스트 에디터
 * 지원: 굵게/기울임/밑줄/취소선, 정렬, 표 삽입, 이미지, 링크, 목록
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useEffect, useCallback } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List as ListIcon, ListOrdered,
  Table as TableIcon, ImageIcon, Link as LinkIcon,
  Undo, Redo,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({ value, onChange, placeholder = "내용을 입력하세요...", minHeight = 300 }: RichEditorProps) {
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
      Image.configure({ inline: false, allowBase64: true }),
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

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const insertImage = useCallback(() => {
    const url = prompt("이미지 URL을 입력하세요:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
    onClick, active, title, children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${btnBase} ${active ? btnActive : btnInactive}`}
      style={{ color: active ? "var(--kino-charcoal)" : "var(--kino-mid)" }}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <span className="inline-block w-px h-5 mx-1" style={{ background: "var(--kino-pale)" }} />
  );

  return (
    <div style={{ border: "1px solid var(--kino-pale)", borderRadius: "var(--radius)", overflow: "hidden", background: "white" }}>
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
            <button
              type="button"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="열 추가"
              className={`${btnBase} ${btnInactive} text-xs`}
              style={{ color: "var(--kino-mid)", fontSize: "10px" }}
            >
              열+
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="행 추가"
              className={`${btnBase} ${btnInactive} text-xs`}
              style={{ color: "var(--kino-mid)", fontSize: "10px" }}
            >
              행+
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="열 삭제"
              className={`${btnBase} ${btnInactive} text-xs`}
              style={{ color: "#DC2626", fontSize: "10px" }}
            >
              열-
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="행 삭제"
              className={`${btnBase} ${btnInactive} text-xs`}
              style={{ color: "#DC2626", fontSize: "10px" }}
            >
              행-
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().deleteTable().run()}
              title="표 삭제"
              className={`${btnBase} ${btnInactive} text-xs`}
              style={{ color: "#DC2626", fontSize: "10px" }}
            >
              표삭제
            </button>
          </>
        )}

        <Divider />

        {/* 이미지 / 링크 */}
        <ToolBtn onClick={insertImage} title="이미지 삽입">
          <ImageIcon size={14} />
        </ToolBtn>
        <ToolBtn onClick={setLink} active={editor.isActive("link")} title="링크 삽입">
          <LinkIcon size={14} />
        </ToolBtn>
      </div>

      {/* ── 에디터 본문 ── */}
      <EditorContent editor={editor} />

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
          min-width: 60px;
          vertical-align: top;
          font-size: 0.8125rem;
        }
        .rich-editor-content th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .rich-editor-content p { margin: 0.25rem 0; }
        .rich-editor-content h1 { font-size: 1.25rem; font-weight: 700; margin: 0.5rem 0; }
        .rich-editor-content h2 { font-size: 1.1rem; font-weight: 700; margin: 0.5rem 0; }
        .rich-editor-content h3 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0; }
        .rich-editor-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rich-editor-content ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rich-editor-content img { max-width: 100%; height: auto; margin: 0.5rem 0; border-radius: 4px; }
        .rich-editor-content a { color: #2563EB; text-decoration: underline; }
        .rich-editor-content blockquote {
          border-left: 3px solid #d1d5db;
          padding-left: 0.75rem;
          color: #6b7280;
          margin: 0.5rem 0;
        }
        /* 표 선택 셀 하이라이트 */
        .rich-editor-content .selectedCell:after {
          background: rgba(37, 99, 235, 0.1);
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        .rich-editor-content .column-resize-handle {
          background-color: #2563EB;
          bottom: -2px;
          position: absolute;
          right: -2px;
          top: 0;
          width: 4px;
          pointer-events: none;
        }
        .rich-editor-content .tableWrapper { overflow-x: auto; }
        .rich-editor-content td, .rich-editor-content th { position: relative; }
      `}</style>
    </div>
  );
}

/**
 * FileUploader.tsx — 범용 파일 첨부 컴포넌트
 * 이미지(jpg, png, gif, webp), 동영상(mp4, mov), 문서(pdf, ppt, pptx, doc, docx, xls, xlsx), 압축(zip) 지원
 * - 이미지: 썸네일 미리보기
 * - 동영상: 재생 아이콘 + 파일명
 * - 문서: 파일 타입 아이콘 + 파일명
 */
import { useRef, useState } from "react";
import { Loader2, X, Upload, FileText, Film, FileSpreadsheet, Presentation, Archive, File } from "lucide-react";

export type AttachmentItem = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

interface FileUploaderProps {
  attachments: AttachmentItem[];
  onChange: (attachments: AttachmentItem[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ACCEPT = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-zip-compressed",
].join(",");

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return null; // 이미지는 썸네일로 표시
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("word")) return FileText;
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return Presentation;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return FileSpreadsheet;
  if (mimeType.includes("zip")) return Archive;
  return File;
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "이미지";
  if (mimeType === "video/mp4") return "MP4";
  if (mimeType === "video/quicktime") return "MOV";
  if (mimeType.startsWith("video/")) return "동영상";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PPT";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Excel";
  if (mimeType.includes("zip")) return "ZIP";
  return "파일";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function FileUploader({
  attachments,
  onChange,
  maxFiles = 10,
  maxSizeMB = 100,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";

    if (attachments.length + files.length > maxFiles) {
      setError(`최대 ${maxFiles}개까지 첨부 가능합니다.`);
      return;
    }

    const oversized = files.find(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      setError(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploaded: AttachmentItem[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload-file", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "업로드 실패" }));
          throw new Error(err.error ?? "업로드 실패");
        }
        const data = await res.json() as { url: string; name: string; size: number; mimeType: string };
        uploaded.push({ name: data.name, url: data.url, mimeType: data.mimeType, size: data.size });
      }
      onChange([...attachments, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {/* 첨부 파일 목록 */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          {attachments.map((att, idx) => {
            const IconComponent = getFileIcon(att.mimeType);
            const isImage = att.mimeType.startsWith("image/");
            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded"
                style={{ background: "var(--kino-bg)", border: "1px solid var(--kino-pale)" }}
              >
                {isImage ? (
                  <img
                    src={att.url}
                    alt={att.name}
                    className="rounded object-cover shrink-0"
                    style={{ width: 48, height: 48 }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center rounded shrink-0"
                    style={{ width: 48, height: 48, background: "var(--kino-pale)" }}
                  >
                    {IconComponent ? (
                      <IconComponent size={22} style={{ color: "var(--kino-mid)" }} />
                    ) : (
                      <File size={22} style={{ color: "var(--kino-mid)" }} />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--kino-charcoal)" }}>
                    {att.name}
                  </p>
                  <p className="text-xs" style={{ color: "var(--kino-muted)" }}>
                    {getFileTypeLabel(att.mimeType)} · {formatSize(att.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 rounded shrink-0 transition-colors"
                  style={{ color: "var(--kino-muted)" }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 업로드 버튼 */}
      {attachments.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-all active:scale-95"
          style={{
            border: "1.5px dashed var(--kino-pale)",
            color: "var(--kino-mid)",
            background: "transparent",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "업로드 중..." : "파일 첨부 (이미지, 동영상, PDF, PPT, Word 등)"}
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "#DC2626" }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

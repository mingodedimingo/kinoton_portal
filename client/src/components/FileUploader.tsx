/**
 * FileUploader.tsx — 범용 파일 첨부 컴포넌트
 * - 모든 파일 형식 지원
 * - 드래그 앤 드롭 업로드 지원
 * - 이미지: 썸네일 미리보기
 * - 동영상/문서/기타: 파일 타입 아이콘 + 파일명
 */
import { useRef, useState, useCallback } from "react";
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

function getFileTypeLabel(mimeType: string, fileName?: string): string {
  if (mimeType.startsWith("image/")) return "이미지";
  if (mimeType === "video/mp4") return "MP4";
  if (mimeType === "video/quicktime") return "MOV";
  if (mimeType.startsWith("video/")) return "동영상";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "Word";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "PPT";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "Excel";
  if (mimeType.includes("zip")) return "ZIP";
  // 확장자 기반 폴백
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext) return ext.toUpperCase();
  }
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
  const [isDragging, setIsDragging] = useState(false);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

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
  }, [attachments, maxFiles, maxSizeMB, onChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    await uploadFiles(files);
  };

  const handleRemove = (idx: number) => {
    onChange(attachments.filter((_, i) => i !== idx));
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
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
                    {getFileTypeLabel(att.mimeType, att.name)} · {formatSize(att.size)}
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

      {/* 드래그 앤 드롭 + 클릭 업로드 영역 */}
      {attachments.length < maxFiles && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded cursor-pointer transition-all"
          style={{
            border: `2px dashed ${isDragging ? "var(--kino-charcoal)" : "var(--kino-pale)"}`,
            background: isDragging ? "var(--kino-pale)" : "transparent",
            opacity: uploading ? 0.6 : 1,
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--kino-mid)" }} />
              <span className="text-xs" style={{ color: "var(--kino-mid)" }}>업로드 중...</span>
            </>
          ) : (
            <>
              <Upload size={20} style={{ color: isDragging ? "var(--kino-charcoal)" : "var(--kino-mid)" }} />
              <div className="text-center">
                <p className="text-xs font-medium" style={{ color: "var(--kino-charcoal)" }}>
                  파일을 여기에 끌어다 놓거나 클릭하여 선택
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kino-muted)" }}>
                  엑셀, PDF, Word, PPT, 이미지, 동영상 등 모든 파일 · 최대 {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "#DC2626" }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

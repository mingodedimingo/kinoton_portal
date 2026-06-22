/**
 * ImageUploader — 이미지 첨부 공통 컴포넌트
 * - 드래그&드롭 또는 클릭으로 이미지 선택
 * - /api/upload-image 엔드포인트로 업로드 후 URL 반환
 * - 최대 5장, 각 10MB 이하
 */
import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export default function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다.");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다.");
      return null;
    }
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch("/api/upload-image", { method: "POST", body: formData });
    if (!res.ok) throw new Error("업로드 실패");
    const data = await res.json() as { url: string };
    return data.url;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`최대 ${maxImages}장까지 첨부 가능합니다.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(uploadFile));
      const valid = urls.filter((u): u is string => u !== null);
      if (valid.length > 0) onChange([...images, ...valid]);
    } catch {
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {/* 업로드 영역 */}
      {images.length < maxImages && (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver ? "border-gray-500 bg-gray-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">업로드 중...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <ImagePlus size={24} />
              <span className="text-sm">클릭하거나 이미지를 드래그하세요</span>
              <span className="text-xs text-gray-300">최대 {maxImages}장 · 각 10MB 이하 · JPG, PNG, GIF, WEBP</span>
            </div>
          )}
        </div>
      )}

      {/* 첨부된 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, idx) => (
            <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt={`첨부 이미지 ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

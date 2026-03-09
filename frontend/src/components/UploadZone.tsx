import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onDrop: (files: File[]) => void;
  accept?: Record<string, string[]>;
  multiple?: boolean;
  label?: string;
  subLabel?: string;
  disabled?: boolean;
}

export default function UploadZone({
  onDrop,
  accept = { "image/*": [] },
  multiple = true,
  label = "ลากวางรูปสลิปที่นี่",
  subLabel = "หรือคลิกเพื่อเลือกไฟล์ (JPEG, PNG, WEBP)",
  disabled = false,
}: Props) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onDrop(acceptedFiles);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept,
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors select-none",
        isDragActive
          ? "border-brand-500 bg-brand-50"
          : "border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />
      {isDragActive ? (
        <Upload size={40} className="text-brand-500 animate-bounce" />
      ) : (
        <ImageIcon size={40} className="text-gray-400" />
      )}
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-sm text-gray-400">{subLabel}</p>
    </div>
  );
}

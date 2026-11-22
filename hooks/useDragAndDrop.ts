import { useState, useRef, useCallback } from "react";
import { infoToast, errorToast } from "../lib/toast";
import { isImportable } from "./useFileOperations";

interface UseDragAndDropProps {
  onFilesDrop: (files: FileList) => void;
}

export function useDragAndDrop({
  onFilesDrop,
}: UseDragAndDropProps) {
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current++;

    if (e.dataTransfer.types.includes("Files")) {
      setIsFileDragging(true);

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        // While dragging, browsers only reveal the type, not the name.
        // Some systems report no type for .json, so that's allowed through
        // and checked properly on drop.
        if (
          items[0].kind === "file" &&
          ["application/json", "text/plain", ""].includes(items[0].type)
        ) {
          setDragError(null);
        } else {
          const fileType = items[0].type || "unknown";
          setDragError(`File type not supported: ${fileType}`);
        }
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsFileDragging(false);
      setDragError(null);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounterRef.current = 0;
      setIsFileDragging(false);

      const files = e.dataTransfer.files;

      if (files && files.length > 0) {
        if (isImportable(files[0])) {
          onFilesDrop(files);
        } else {
          setDragError("Only JSON and text files can be imported");
          errorToast("Only JSON and text files can be imported");
          // Auto-hide the error after 3 seconds
          setTimeout(() => {
            setDragError(null);
          }, 3000);
        }
      }
    },
    [onFilesDrop]
  );

  return {
    isFileDragging,
    dragError,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
}

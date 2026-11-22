import { useCallback, useRef } from "react";
import { successToast, errorToast } from "../lib/toast";
import { validateJsonAgainstFreeLimits } from "../constants/limits";
import { useSupabase } from "../components/Auth/SupabaseProvider";
import { useJsonStore } from "../store/useJsonStore";

/** What the file picker offers: JSON files, and text files that hold JSON. */
export const IMPORT_ACCEPT = ".json,.txt,application/json,text/plain";

/** JSON and plain-text files can be imported; the contents must be JSON. */
export const isImportable = (file: { name: string; type: string }) =>
  /\.(json|txt)$/i.test(file.name) ||
  file.type === "application/json" ||
  file.type === "text/plain";

interface UseFileOperationsProps {
  setJsonData: (data: string) => void;
  onSuccessfulLoad?: (content: string) => void;
}

export function useFileOperations({
  setJsonData,
  onSuccessfulLoad,
}: UseFileOperationsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { isPro } = useSupabase(); // Get premium status

  const handleFiles = useCallback(
    (files: FileList) => {
      const file = files[0];

      if (!isImportable(file)) {
        errorToast("Only JSON and text files can be imported");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          // Try to parse the JSON to validate it
          JSON.parse(content);
          
          // For free users, validate against limits
          if (!isPro) {
            const validation = validateJsonAgainstFreeLimits(content, isPro);
            if (!validation.isValid) {
              // Only add "Upgrade for more!" if it's not a format error
              const errorMessage = validation.isFormatError
                ? validation.message
                : `${validation.message}. Upgrade for more!`;
                
              errorToast(errorMessage || "Error validating JSON");
              return;
            }
          }
          
          // If validation passes or user is premium, update the content
          setJsonData(content);
          useJsonStore.getState().setFileName(file.name);
          // Call the callback if provided
          if (onSuccessfulLoad) {
            onSuccessfulLoad(content);
          }
          successToast(`File "${file.name}" loaded successfully`);
        } catch (error) {
          errorToast(`"${file.name}" doesn't contain valid JSON`);
        }
      };
      reader.readAsText(file);
    },
    [setJsonData, onSuccessfulLoad, isPro]
  );

  const importFile = useCallback(() => {
    // Create a file input element if it doesn't exist
    if (!fileInputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = IMPORT_ACCEPT;
      fileInputRef.current = input;
    }

    // Set up the change event handler
    fileInputRef.current.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
    };

    // Trigger the file dialog
    fileInputRef.current.click();
  }, [handleFiles]);

  return { handleFiles, importFile };
}

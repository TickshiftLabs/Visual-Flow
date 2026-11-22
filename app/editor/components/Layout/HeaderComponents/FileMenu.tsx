import React from "react";
import {
  FileIcon,
  Save,
  Upload,
  Link2,
  Download,
  FileImage,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useJsonStore } from "@/store/useJsonStore";
import { useFileOperations } from "@/hooks/useFileOperations";
import { exportAsPng, exportAsJpeg, exportAsSvg } from "@/utils/exportHandlers";
import { errorToast, infoToast } from "@/lib/toast";
import { useSupabase } from "@/components/Auth/SupabaseProvider";
import { copyShareLink } from "@/utils/shareActions";

interface FileMenuProps {
  onUpgradeClick?: (featureName: string) => void;
}

export default function FileMenu({ onUpgradeClick }: FileMenuProps) {
  // Get state and actions from Zustand store
  const {
    jsonData,
    setJsonData,
    setIsLoading,
    setVisualizationJson,
  } = useJsonStore();

  const { user, isPro } = useSupabase();

  const isPremiumUser = isPro;

  const handleSaveJson = () => {
    try {
      if (jsonData && jsonData.trim()) {
        const blob = new Blob([jsonData], { type: "application/json" });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "data.json";

        infoToast("Starting download...", { duration: 2000 });

        a.addEventListener("click", () => {
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        });

        document.body.appendChild(a);
        a.click();
      } else {
        errorToast("Cannot save empty JSON");
      }
    } catch (e) {
      errorToast("Failed to save JSON");
    }
  };

  // Use hooks for operations
  const { importFile } = useFileOperations({
    setJsonData,
    onSuccessfulLoad: (content) => {
      setVisualizationJson(content);
    },
  });

  // Export handlers - pass jsonData to ensure they have access to current data
  const handleExportPngClick = () => {
    if (isPremiumUser) {
      if (jsonData && jsonData.trim()) {
        exportAsPng();
      } else {
        errorToast("No JSON data to export");
      }
    } else if (onUpgradeClick) {
      onUpgradeClick("PNG Export");
    }
  };

  const handleExportJpgClick = () => {
    if (isPremiumUser) {
      if (jsonData && jsonData.trim()) {
        exportAsJpeg();
      } else {
        errorToast("No JSON data to export");
      }
    } else if (onUpgradeClick) {
      onUpgradeClick("JPG Export");
    }
  };

  const handleExportSvgClick = () => {
    if (isPremiumUser) {
      if (jsonData && jsonData.trim()) {
        exportAsSvg();
      } else {
        errorToast("No JSON data to export");
      }
    } else if (onUpgradeClick) {
      onUpgradeClick("SVG Export");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-sm font-normal text-vf-soft hover:text-vf-text hover:bg-vf-panel cursor-pointer transition-colors select-none focus:ring-0 focus:outline-none"
        >
          File
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 border border-vf-line bg-vf-panel font-vf-sans text-vf-soft shadow-xl z-50">
        <DropdownMenuItem
          onClick={handleSaveJson}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={importFile}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
        >
          <Upload className="h-4 w-4" />
          <span>Import…</span>
          <span className="ml-auto font-vf-mono text-[10.5px] text-vf-dim">
            .json .txt
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={copyShareLink}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
        >
          <Link2 className="h-4 w-4" />
          <span>Copy share link</span>
        </DropdownMenuItem>

        {/* Export submenu with image format options */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none">
            <Download className="mr-2 h-4 w-4" />
            <span>Export</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="border border-vf-line bg-vf-panel font-vf-sans text-vf-soft shadow-xl">
            {/* PNG export - premium feature */}
            <DropdownMenuItem
              onClick={handleExportPngClick}
              className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
            >
              <FileImage className="mr-2 h-4 w-4" />
              <span>PNG Image</span>
              {!isPremiumUser && (
                <span className="ml-auto font-vf-mono text-[10.5px] text-vf-acc">PRO</span>
              )}
            </DropdownMenuItem>

            {/* JPG export - premium feature */}
            <DropdownMenuItem
              onClick={handleExportJpgClick}
              className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
            >
              <FileImage className="mr-2 h-4 w-4" />
              <span>JPG Image</span>
              {!isPremiumUser && (
                <span className="ml-auto font-vf-mono text-[10.5px] text-vf-acc">PRO</span>
              )}
            </DropdownMenuItem>

            {/* SVG export - premium feature */}
            <DropdownMenuItem
              onClick={handleExportSvgClick}
              className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text focus:ring-0 focus:outline-none"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>SVG Vector</span>
              {!isPremiumUser && (
                <span className="ml-auto font-vf-mono text-[10.5px] text-vf-acc">PRO</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

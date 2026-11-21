import React from "react";
import { FileCode, Minimize, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJsonStore } from "@/store/useJsonStore";

import { successToast, errorToast } from "@/lib/toast";
import { copyText } from "@/lib/clipboard";

export default function EditMenu() {
  const { jsonData, setJsonData } = useJsonStore();

  const handleFormatJson = () => {
    try {
      if (jsonData.trim()) {
        const parsedJson = JSON.parse(jsonData);
        const formattedJson = JSON.stringify(parsedJson, null, 2);
        setJsonData(formattedJson);
        successToast("JSON formatted successfully");
      } else {
        errorToast("No JSON to format");
      }
    } catch (e) {
      errorToast("Cannot format invalid JSON");
    }
  };

  const handleMinimizeJson = () => {
    try {
      if (jsonData.trim()) {
        const parsedJson = JSON.parse(jsonData);
        const minimizedJson = JSON.stringify(parsedJson);

        // Update the store with the minimized JSON
        setJsonData(minimizedJson);

        // Show success toast
        successToast("JSON minimized successfully");
      } else {
        errorToast("No JSON to minimize");
      }
    } catch (e) {
      errorToast("Cannot minimize invalid JSON");
    }
  };

  const handleCopyJson = async () => {
    if (!jsonData.trim()) {
      errorToast("No JSON to copy");
      return;
    }
    if (await copyText(jsonData)) successToast("JSON copied to clipboard");
    else errorToast("Failed to copy JSON to clipboard");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-sm font-normal text-vf-soft hover:text-vf-text hover:bg-vf-panel cursor-pointer transition-colors select-none focus:ring-0 focus:outline-none"
        >
          Edit
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 border border-vf-line bg-vf-panel font-vf-sans text-vf-soft shadow-xl z-50">
        <DropdownMenuItem
          onClick={handleFormatJson}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text"
        >
          <FileCode className="mr-2 h-4 w-4" />
          <span>Format JSON</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleMinimizeJson}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text"
        >
          <Minimize className="mr-2 h-4 w-4" />
          <span>Minimize JSON</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleCopyJson}
          className="cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text"
        >
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy JSON</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useJsonStore } from "@/store/useJsonStore";

const itemClass =
  "cursor-pointer hover:bg-vf-line hover:text-vf-text transition-colors focus:bg-vf-line focus:text-vf-text";

interface ViewMenuProps {
  onOpenSettings: () => void;
}

export default function ViewMenu({ onOpenSettings }: ViewMenuProps) {
  const { collapseLeftPanel, toggleLeftPanel, showGrid, setShowGrid } =
    useJsonStore();

  const tick = (on: boolean) => (
    <Check className={`mr-2 h-4 w-4 ${on ? "opacity-100" : "opacity-0"}`} />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-sm font-normal text-vf-soft hover:text-vf-text hover:bg-vf-panel cursor-pointer transition-colors select-none focus:ring-0 focus:outline-none"
        >
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 border border-vf-line bg-vf-panel font-vf-sans text-vf-soft shadow-xl z-50">
        <DropdownMenuItem onClick={toggleLeftPanel} className={itemClass}>
          {tick(!collapseLeftPanel)}
          <span>Code panel</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setShowGrid(!showGrid)}
          className={itemClass}
        >
          {tick(showGrid)}
          <span>Grid</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-vf-line" />
        <DropdownMenuItem onClick={onOpenSettings} className={itemClass}>
          <span className="ml-6">Settings…</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

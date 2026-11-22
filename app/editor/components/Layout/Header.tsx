import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { SUPPORT_URL } from "@/constants/site";
import Logo from "@/components/Logo";
import { useJsonStore } from "@/store/useJsonStore";
import { copyShareLink } from "@/utils/shareActions";
import { useGraphStore } from "@/store/useGraphStore";

import FileMenu from "./HeaderComponents/FileMenu";
import EditMenu from "./HeaderComponents/EditMenu";
import ViewMenu from "./HeaderComponents/ViewMenu";

const barButton =
  "inline-flex h-[30px] cursor-pointer items-center rounded-[7px] border px-3 text-[13px] font-semibold transition-colors";

export default function Header() {
  const { fileName, jsonData, isValidJson, setIsSettingsOpen } = useJsonStore();

  const hasContent = jsonData.trim() !== "";

  const query = useGraphStore((s) => s.query);
  const setQuery = useGraphStore((s) => s.setQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="relative flex h-12 shrink-0 items-center gap-1 border-b border-vf-rule bg-vf-bg pl-3.5 pr-3">
      <Link href="/" className="mr-3">
        <Logo wordClassName="max-sm:hidden" />
      </Link>

      <FileMenu />
      <EditMenu />
      <ViewMenu onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* File name, centred in the bar regardless of what sits either side */}
      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 items-center gap-2 font-vf-mono text-[12.5px] md:flex">
        <span className="text-vf-soft">{fileName}</span>
        {hasContent && (
          <span className={isValidJson ? "text-vf-dim" : "text-vf-err"}>
            {isValidJson ? "saved" : "invalid"}
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <label className="mr-1.5 hidden h-[30px] w-[250px] items-center gap-2 rounded-[7px] border border-vf-line pl-[11px] pr-2 transition-colors focus-within:border-vf-acc/60 lg:flex">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Search keys and values"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-vf-mono text-xs text-vf-text outline-none placeholder:text-vf-faint"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="cursor-pointer font-vf-mono text-xs text-vf-dim hover:text-vf-text"
              title="Clear search"
            >
              ✕
            </button>
          ) : (
            <span className="rounded-[5px] border border-vf-line px-1.5 py-px font-vf-mono text-[11px] text-vf-dim">
              Ctrl K
            </span>
          )}
        </label>

        <button
          className={`${barButton} border-vf-line text-vf-text hover:border-[#4a5058]`}
          onClick={copyShareLink}
          title="Copy a link to this file, view and selection"
        >
          Share
        </button>

        <a
          href={SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          title="Visual Flow is free. Chip in if it's useful."
          className={`${barButton} gap-1.5 border-vf-line text-vf-soft hover:border-[#4a5058] hover:text-vf-text max-sm:px-2`}
        >
          <Heart className="size-3.5 text-vf-acc" />
          <span className="max-sm:hidden">Support</span>
        </a>
      </div>
    </header>
  );
}

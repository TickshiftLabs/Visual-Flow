import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, Settings, User } from "lucide-react";
import { useSupabase } from "@/components/Auth/SupabaseProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from "@/components/Logo";
import UpgradeModal from "@/components/PremiumFeatures/UpgradeModal";
import { useJsonStore } from "@/store/useJsonStore";
import { useGraphStore } from "@/store/useGraphStore";

import FileMenu from "./HeaderComponents/FileMenu";
import EditMenu from "./HeaderComponents/EditMenu";
import ViewMenu from "./HeaderComponents/ViewMenu";

const itemClass =
  "cursor-pointer hover:bg-vf-line hover:text-vf-text focus:bg-vf-line focus:text-vf-text";
const barButton =
  "inline-flex h-[30px] cursor-pointer items-center rounded-[7px] border px-3 text-[13px] font-semibold transition-colors";

export default function Header() {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<string | undefined>();
  const { user, isPro, signOut } = useSupabase();
  const router = useRouter();
  const { fileName, jsonData, isValidJson, setIsSettingsOpen } = useJsonStore();

  const handleUpgradeClick = (featureName?: string) => {
    setCurrentFeature(featureName);
    setUpgradeModalOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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

      <FileMenu onUpgradeClick={handleUpgradeClick} />
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

        {!isPro && (
          <button
            className={`${barButton} border-vf-acc/35 text-vf-acc hover:border-vf-acc/70`}
            onClick={() => handleUpgradeClick("")}
          >
            Upgrade
          </button>
        )}

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 cursor-pointer overflow-hidden rounded-full focus:outline-none">
                <Avatar className="size-[30px]">
                  <AvatarImage src={user.user_metadata?.avatar_url || ""} />
                  <AvatarFallback className="bg-vf-line text-xs text-vf-text">
                    {user.email ? (
                      user.email.substring(0, 2).toUpperCase()
                    ) : (
                      <User size={16} />
                    )}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-50 w-56 border border-vf-line bg-vf-panel font-vf-sans text-vf-soft shadow-xl"
            >
              <div className="px-3 py-2.5">
                <p className="truncate text-sm font-medium text-vf-text">
                  {user.email}
                </p>
                <p className="font-vf-mono text-[11px] text-vf-dim">
                  {isPro ? "Pro plan" : "Free plan"}
                </p>
              </div>
              <DropdownMenuSeparator className="bg-vf-line" />
              <DropdownMenuItem
                onClick={() => setIsSettingsOpen(true)}
                className={itemClass}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/pricing")}
                className={itemClass}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Plans</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-vf-line" />
              <DropdownMenuItem onClick={handleSignOut} className={itemClass}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            onClick={() =>
              router.push(
                `/auth/login?returnTo=${encodeURIComponent(
                  window.location.pathname
                )}`
              )
            }
            className={`${barButton} border-vf-line text-vf-text hover:border-[#4a5058]`}
          >
            Sign in
          </button>
        )}
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgrade={() => {
          setUpgradeModalOpen(false);
          router.push("/pricing");
        }}
        featureName={currentFeature}
      />
    </header>
  );
}

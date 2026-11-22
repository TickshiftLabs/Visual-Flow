"use client";

import { useEffect, useRef } from "react";
import LeftPanel from "./components/Panel/LeftPanel";
import Footer from "./components/Layout/Footer";
import RightPanel from "./components/Panel/RightPanel";
import Header from "./components/Layout/Header";
import DragOverlay from "@/components/DragOverlay";
import { useFileOperations } from "@/hooks/useFileOperations";
import { useDragAndDrop } from "@/hooks/useDragAndDrop";
import { useMouseInteractions } from "@/hooks/useMouseInteractions";
import { storageService } from "@/utils/storageService";
import SettingsDialog from "./components/Layout/SettingsDialog";
import { useJsonStore } from "@/store/useJsonStore";
import { useSupabase } from "@/components/Auth/SupabaseProvider";
import { NARROW_QUERY } from "@/hooks/useIsNarrow";
import { useSharedLink } from "@/hooks/useSharedLink";

export default function Home() {
  const {
    jsonData,
    setJsonData,
    setVisualizationJson,
    isValidJson,
    setIsValidJson,
    nodeCount,
    edgeType,
    setEdgeType,
    showGrid,
    setShowGrid,
    isSettingsOpen,
    setIsSettingsOpen,
  } = useJsonStore();

  // Add the useSupabase hook to get isPro
  const { isPro } = useSupabase();

  const lastParsedJsonRef = useRef<any>(null);

  // Load saved settings and data
  useEffect(() => {
    const savedSettings = storageService.getSettings();

    if (savedSettings.edgeStyle) {
      setEdgeType(savedSettings.edgeStyle);
    }

    if (savedSettings.showGrid !== undefined) {
      setShowGrid(savedSettings.showGrid);
    }

    if (savedSettings.view) {
      useJsonStore.getState().setView(savedSettings.view);
    }
    if (savedSettings.graphDirection) {
      useJsonStore.getState().setGraphDirection(savedSettings.graphDirection);
    } else if (window.matchMedia(NARROW_QUERY).matches) {
      // A tall, narrow canvas suits a graph that grows downwards. This is
      // only the starting point: it isn't saved, so a choice made in
      // settings always wins.
      useJsonStore.setState({ graphDirection: "TB" });
    }
    if (savedSettings.layout3d) {
      useJsonStore.getState().setLayout3d(savedSettings.layout3d);
    }
    if (savedSettings.nodeShadows !== undefined) {
      useJsonStore.getState().setNodeShadows(savedSettings.nodeShadows);
    }

    if (savedSettings.autoSaveEnabled) {
      const jsonContent = storageService.getJsonData();
      if (jsonContent && jsonContent.content) {
        setJsonData(jsonContent.content);
        setVisualizationJson(jsonContent.content);
      }
    }
  }, [setJsonData, setEdgeType, setShowGrid, setVisualizationJson]);

  // After the saved work is loaded (above), open a share link if there is one.
  const { isViewingShared, keep, restore } = useSharedLink();

  // Validate JSON whenever it changes
  useEffect(() => {
    // Handle empty or whitespace-only JSON
    if (!jsonData || jsonData.trim() === "") {
      setIsValidJson(true); // Consider empty JSON as valid
      return;
    }

    try {
      // Only try to parse if there's actual content
      JSON.parse(jsonData);
      setIsValidJson(true);
    } catch (e) {
      setIsValidJson(false);
      // Don't throw or log the error to prevent SES exceptions
    }
  }, [jsonData, setIsValidJson]);

  // Auto-save effect
  useEffect(() => {
    const settings = storageService.getSettings();
    // Paused while looking at someone's shared file, so it can't overwrite
    // the visitor's own saved work before they've chosen to keep it.
    if (settings.autoSaveEnabled && isValidJson && jsonData && !isViewingShared) {
      const debounceTimer = setTimeout(() => {
        storageService.saveJsonData(jsonData);
      }, 1000); // 1 second debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [jsonData, isValidJson, isViewingShared]);

  // Update visualization when JSON is valid
  useEffect(() => {
    // Only attempt to process if we have non-empty JSON data
    if (isValidJson && jsonData && jsonData.trim()) {
      try {
        const parsedJson = JSON.parse(jsonData);

        const currentJsonStr = JSON.stringify(parsedJson);
        const lastJsonStr = lastParsedJsonRef.current
          ? JSON.stringify(lastParsedJsonRef.current)
          : "";

        if (currentJsonStr !== lastJsonStr) {
          lastParsedJsonRef.current = parsedJson;
          setVisualizationJson(jsonData);
        }
      } catch (e) {
        // Silently handle parsing errors
      }
    }
  }, [isValidJson, jsonData, setVisualizationJson]);

  const { handleFiles } = useFileOperations({
    setJsonData,
    onSuccessfulLoad: (content) => {
      setVisualizationJson(content);
    },
  });

  // Fix the function reference - use handleFiles instead of handleFileDrop
  const {
    isFileDragging,
    dragError,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  } = useDragAndDrop({
    onFilesDrop: handleFiles,
    isPremiumUser: isPro,
  });

  const { mainRef, handleMouseDown } = useMouseInteractions();



  return (
    <main
      ref={mainRef}
      className={`flex h-screen flex-col overflow-hidden bg-vf-bg font-vf-sans text-sm text-vf-text antialiased ${
        isFileDragging
          ? dragError
            ? "ring-2 ring-inset ring-vf-err"
            : "ring-2 ring-inset ring-vf-acc"
          : ""
      }`}
      onMouseDown={handleMouseDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <DragOverlay isVisible={isFileDragging} error={dragError} />
      <Header />

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      {isViewingShared && (
        <div
          role="status"
          className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-vf-acc/25 bg-vf-acc/[0.06] px-3.5 py-2 text-[13px]"
        >
          <span className="text-vf-soft">
            <b className="font-semibold text-vf-text">
              You&apos;re viewing a shared file.
            </b>{" "}
            Your own work is safe until you choose.
          </span>
          <span className="ml-auto flex gap-2">
            <button
              onClick={restore}
              className="cursor-pointer rounded-md border border-vf-line px-2.5 py-1 font-semibold text-vf-text transition-colors hover:border-[#4a5058]"
            >
              Back to mine
            </button>
            <button
              onClick={keep}
              className="cursor-pointer rounded-md bg-vf-acc px-2.5 py-1 font-semibold text-vf-bg transition hover:brightness-110"
            >
              Keep this
            </button>
          </span>
        </div>
      )}

      {/* Side by side on wide screens; code above the views on phones. */}
      <div className="flex min-h-0 flex-1 overflow-hidden max-md:flex-col">
        <LeftPanel />
        <RightPanel />
      </div>
      <Footer />
    </main>
  );
}

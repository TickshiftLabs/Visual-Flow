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
    if (settings.autoSaveEnabled && isValidJson && jsonData) {
      const debounceTimer = setTimeout(() => {
        storageService.saveJsonData(jsonData);
      }, 1000); // 1 second debounce

      return () => clearTimeout(debounceTimer);
    }
  }, [jsonData, isValidJson]);

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

      {/* Side by side on wide screens; code above the views on phones. */}
      <div className="flex min-h-0 flex-1 overflow-hidden max-md:flex-col">
        <LeftPanel />
        <RightPanel />
      </div>
      <Footer />
    </main>
  );
}

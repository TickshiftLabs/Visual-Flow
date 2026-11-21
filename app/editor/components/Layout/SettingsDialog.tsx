import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { storageService } from "@/utils/storageService";
import { useJsonStore } from "@/store/useJsonStore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChoiceProps<T extends string> {
  label: string;
  hint?: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

/** A labelled row with a segmented control: one click per setting. */
function Choice<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: ChoiceProps<T>) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <div>
        <div className="text-sm text-vf-text">{label}</div>
        {hint && <div className="text-[12.5px] text-vf-dim">{hint}</div>}
      </div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex shrink-0 gap-0.5 rounded-lg border border-vf-line p-[3px]"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`cursor-pointer rounded-[5px] px-2.5 py-1 font-vf-mono text-xs transition-colors ${
              value === option.value
                ? "bg-vf-line text-vf-text"
                : "text-vf-dim hover:text-vf-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-vf-rule pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-0.5 font-vf-mono text-[10.5px] uppercase tracking-[0.08em] text-vf-faint">
        {title}
      </h3>
      {children}
    </section>
  );
}

const ON_OFF = [
  { value: "on" as const, label: "On" },
  { value: "off" as const, label: "Off" },
];

export default function SettingsDialog({
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const {
    edgeType,
    setEdgeType,
    showGrid,
    setShowGrid,
    graphDirection,
    setGraphDirection,
    layout3d,
    setLayout3d,
    nodeShadows,
    setNodeShadows,
  } = useJsonStore();

  // Autosave lives in localStorage only; re-read it each time the dialog opens.
  const [autoSave, setAutoSave] = useState(true);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage on open
      setAutoSave(storageService.getSettings().autoSaveEnabled !== false);
    }
  }, [open]);

  const changeAutoSave = (enabled: boolean) => {
    setAutoSave(enabled);
    storageService.saveSettings({ autoSaveEnabled: enabled });
    window.dispatchEvent(new Event("settings-changed"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-vf-line bg-vf-panel font-vf-sans text-vf-text sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-[-0.02em]">
            Settings
          </DialogTitle>
          <DialogDescription className="text-vf-dim">
            Changes apply straight away and are remembered on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Section title="Graph view">
            <Choice
              label="Direction"
              hint="Which way the graph grows from the root."
              value={graphDirection}
              onChange={setGraphDirection}
              options={[
                { value: "LR", label: "Left to right" },
                { value: "TB", label: "Top to bottom" },
              ]}
            />
            <Choice
              label="Lines"
              value={edgeType === "smoothstep" ? "smoothstep" : "default"}
              onChange={setEdgeType}
              options={[
                { value: "default", label: "Curved" },
                { value: "smoothstep", label: "Stepped" },
              ]}
            />
            <Choice
              label="Node shadows"
              hint="Always left out of exported images."
              value={nodeShadows ? "on" : "off"}
              onChange={(v) => setNodeShadows(v === "on")}
              options={ON_OFF}
            />
            <Choice
              label="Background grid"
              value={showGrid ? "on" : "off"}
              onChange={(v) => setShowGrid(v === "on")}
              options={ON_OFF}
            />
          </Section>

          <Section title="3D view">
            <Choice
              label="Layout"
              hint="Constellation floats freely; cone tree stacks levels."
              value={layout3d}
              onChange={setLayout3d}
              options={[
                { value: "constellation", label: "Constellation" },
                { value: "cone", label: "Cone tree" },
              ]}
            />
          </Section>

          <Section title="Editor">
            <Choice
              label="Autosave"
              hint="Keeps your JSON in this browser between visits."
              value={autoSave ? "on" : "off"}
              onChange={(v) => changeAutoSave(v === "on")}
              options={ON_OFF}
            />
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

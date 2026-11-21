interface JsonErrorMessageProps {
  isVisible: boolean;
}

/** Thin banner above the code editor while the JSON doesn't parse. */
export default function JsonErrorMessage({ isVisible }: JsonErrorMessageProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-baseline gap-2 border-b border-vf-err/25 bg-vf-err/[0.07] px-3.5 py-2 text-[13px]">
      <span className="font-vf-mono text-xs text-vf-err">● invalid JSON</span>
      <span className="text-vf-dim">
        Check for a missing comma, bracket or quote.
      </span>
    </div>
  );
}

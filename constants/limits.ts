import { buildGraph } from "../app/editor/components/Visualizers/graph/buildGraph";

// Free-plan limits, defined in one place.
export const FREE_LIMITS = {
  MAX_NODES: 200,
  MAX_SIZE_KB: 100,
};

export const countJsonLines = (json: string): number => json.split("\n").length;

/** Number of nodes the graph draws for this value. */
export const countJsonNodes = (value: unknown): number =>
  buildGraph(value).nodes.length;

export const getJsonDepth = (value: any): number => {
  if (value === null || typeof value !== "object") return 0;
  let max = 0;
  for (const child of Object.values(value)) {
    max = Math.max(max, getJsonDepth(child));
  }
  return max + 1;
};

interface LimitDetails {
  lines: number;
  nodes: number;
  depth: number;
  size: number;
}

/** Checks JSON text against the free-plan limits. Pro users always pass. */
export const validateJsonAgainstFreeLimits = (
  jsonContent: string,
  isPremiumUser: boolean = false
): {
  isValid: boolean;
  message?: string;
  details?: LimitDetails;
  isFormatError?: boolean;
} => {
  if (isPremiumUser === true) return { isValid: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch {
    return {
      isValid: false,
      message: "Invalid JSON format",
      isFormatError: true,
    };
  }

  const details: LimitDetails = {
    lines: countJsonLines(jsonContent),
    nodes: countJsonNodes(parsed),
    depth: getJsonDepth(parsed),
    size: new Blob([jsonContent]).size / 1024,
  };

  if (details.size > FREE_LIMITS.MAX_SIZE_KB) {
    return {
      isValid: false,
      message: `File size (${details.size.toFixed(0)}KB) exceeds the free limit (${FREE_LIMITS.MAX_SIZE_KB}KB)`,
      details,
    };
  }

  if (details.nodes > FREE_LIMITS.MAX_NODES) {
    return {
      isValid: false,
      message: `Node count (${details.nodes}) exceeds the free limit (${FREE_LIMITS.MAX_NODES})`,
      details,
    };
  }

  return { isValid: true, details };
};

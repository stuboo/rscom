import { readdirSync, readFileSync } from "fs";
import { join } from "path";

// --- Interfaces ---

export interface Reference {
  author: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
}

export interface Change {
  section: string;
  before: string;
  after: string;
  reason: string;
  references?: Reference[];
}

export interface Proposal {
  page: string;
  summary: string;
  changes: Change[];
  references: Reference[];
}

export type Status = "idle" | "researching" | "ready" | "deciding";

export interface QueueItem {
  path: string;
  status: "pending" | "reviewed";
}

export interface ReviewState {
  queue: QueueItem[];
  current: string | null;
  proposals: Map<string, Proposal>;
  status: Status;
}

// --- Parser ---

const REPO_ROOT =
  "/Users/jrs/Library/CloudStorage/Dropbox/ryan/Projects/@inprogress_proj/GitHub/rscom";
const TRACKER_PATH = join(REPO_ROOT, "pseo-review-tracker.md");

/** Expand a location directory line into individual page paths */
function expandLocationDir(dirPath: string): string[] {
  const fullDir = join(REPO_ROOT, dirPath);
  try {
    return readdirSync(fullDir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .map((f) => join(dirPath, f));
  } catch {
    return [];
  }
}

/** Check if a path looks like a real file/directory path (contains a slash) */
function isFilePath(s: string): boolean {
  return s.includes("/");
}

/** Parse the tracker markdown file into a ReviewState */
export function parseTracker(trackerPath: string = TRACKER_PATH): ReviewState {
  const content = readFileSync(trackerPath, "utf-8");
  const lines = content.split("\n");

  const queue: QueueItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Completed pages: - [x] [H] path/to/file.md  or  - [x] path/to/file.md
    const completedMatch = trimmed.match(
      /^- \[x\]\s+(?:\[H\]\s+)?(.+?)(?:\s+—.*)?$/
    );
    if (completedMatch) {
      const rawPath = completedMatch[1]!.trim();
      if (!isFilePath(rawPath)) continue;
      // Location directory lines like "locations/appleton/ (4 pages)"
      if (rawPath.match(/^locations\/[^/]+\/\s*\(/)) {
        const dirPath = rawPath.replace(/\s*\(.*$/, "").trim();
        for (const p of expandLocationDir(dirPath)) {
          queue.push({ path: p, status: "reviewed" });
        }
      } else {
        queue.push({ path: rawPath, status: "reviewed" });
      }
      continue;
    }

    // Unreviewed pages: - [ ] path/to/file.md
    const unreviewedMatch = trimmed.match(/^- \[ \]\s+(.+?)(?:\s+—.*)?$/);
    if (unreviewedMatch) {
      const rawPath = unreviewedMatch[1]!.trim();
      if (!isFilePath(rawPath)) continue;
      // Location directory lines like "locations/brillion/ (4 pages)"
      if (rawPath.match(/^locations\/[^/]+\/\s*\(/)) {
        const dirPath = rawPath.replace(/\s*\(.*$/, "").trim();
        for (const p of expandLocationDir(dirPath)) {
          queue.push({ path: p, status: "pending" });
        }
      } else {
        queue.push({ path: rawPath, status: "pending" });
      }
      continue;
    }
  }

  return {
    queue,
    current: null,
    proposals: new Map(),
    status: "idle",
  };
}

// --- State management ---

let state: ReviewState = parseTracker();

export function getState(): ReviewState {
  return state;
}

export function resetState(): ReviewState {
  state = parseTracker();
  return state;
}

/** Advance to the next unreviewed page */
export function next(): string | null {
  const pending = state.queue.find((q) => q.status === "pending");
  if (!pending) {
    state.current = null;
    state.status = "idle";
    return null;
  }
  state.current = pending.path;
  state.status = "researching";
  return pending.path;
}

/** Store a proposal for the current page */
export function propose(proposal: Proposal): void {
  state.proposals.set(proposal.page, proposal);
  state.status = "ready";
}

/** Mark current page as reviewed */
export function markReviewed(path: string): void {
  const item = state.queue.find((q) => q.path === path);
  if (item) {
    item.status = "reviewed";
  }
}

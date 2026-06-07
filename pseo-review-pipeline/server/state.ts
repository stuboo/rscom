import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { join, resolve } from "path";

// --- Paths ---

// Repo root is two levels up from this file (pseo-review-pipeline/server/state.ts),
// overridable via env for tests or relocated checkouts.
export const REPO_ROOT = process.env.RSCOM_ROOT
  ? resolve(process.env.RSCOM_ROOT)
  : resolve(import.meta.dir, "..", "..");

// Draft + session state live alongside the server, outside the repo content.
const DRAFTS_DIR = process.env.RSCOM_DRAFTS
  ? resolve(process.env.RSCOM_DRAFTS)
  : resolve(import.meta.dir, "..", "drafts");

const STATE_FILE = join(DRAFTS_DIR, "_state.json");

function ensureDir(): void {
  if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
}

// --- Interfaces ---

export interface Reference {
  author: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
}

/** Sidecar metadata stored next to each draft. */
export interface DraftMeta {
  path: string; // repo-relative markdown path, e.g. "life-stages/recurrent-prolapse.md"
  title: string;
  summary: string;
  references: Reference[];
}

export type PageStatus = "drafting" | "ready" | "approved";

export interface PageListItem {
  path: string;
  title: string;
  status: PageStatus;
}

interface SessionState {
  committed: string[]; // repo-relative paths approved + committed this session
}

// --- Slug helpers ---

/** Map a repo-relative path to a flat on-disk slug. */
export function slugFor(path: string): string {
  return path.replace(/[/\\]/g, "__");
}

const draftMdPath = (path: string) => join(DRAFTS_DIR, `${slugFor(path)}.md`);
const draftJsonPath = (path: string) => join(DRAFTS_DIR, `${slugFor(path)}.json`);

// --- Session state (approvals) ---

function loadSession(): SessionState {
  ensureDir();
  if (!existsSync(STATE_FILE)) return { committed: [] };
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as SessionState;
  } catch {
    return { committed: [] };
  }
}

function saveSession(s: SessionState): void {
  ensureDir();
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// --- Public API ---

/** Register a batch of pages so they appear in the sidebar as "drafting". */
export function registerBatch(pages: { path: string; title?: string }[]): void {
  ensureDir();
  for (const p of pages) {
    const jsonPath = draftJsonPath(p.path);
    if (existsSync(jsonPath)) continue; // don't clobber an existing draft
    const meta: DraftMeta = {
      path: p.path,
      title: p.title ?? deriveTitle(p.path),
      summary: "",
      references: [],
    };
    writeFileSync(jsonPath, JSON.stringify(meta, null, 2));
  }
}

/** Store a finished draft (full markdown) + evidence for a page. */
export function putDraft(
  path: string,
  draft: string,
  summary: string,
  references: Reference[],
  title?: string
): void {
  ensureDir();
  writeFileSync(draftMdPath(path), draft);
  const meta: DraftMeta = {
    path,
    title: title ?? deriveTitle(path),
    summary,
    references: references ?? [],
  };
  writeFileSync(draftJsonPath(path), JSON.stringify(meta, null, 2));
}

/** Overwrite a draft's body without touching evidence metadata (autosave). */
export function saveDraftBody(path: string, body: string): boolean {
  if (!existsSync(draftJsonPath(path))) return false;
  writeFileSync(draftMdPath(path), body);
  return true;
}

export function getMeta(path: string): DraftMeta | null {
  const jsonPath = draftJsonPath(path);
  if (!existsSync(jsonPath)) return null;
  try {
    return JSON.parse(readFileSync(jsonPath, "utf-8")) as DraftMeta;
  } catch {
    return null;
  }
}

export function getDraftBody(path: string): string | null {
  const md = draftMdPath(path);
  return existsSync(md) ? readFileSync(md, "utf-8") : null;
}

/** Current committed content of the page in the repo (the "original"). */
export function getOriginal(path: string): string | null {
  const full = join(REPO_ROOT, path);
  return existsSync(full) ? readFileSync(full, "utf-8") : null;
}

export function statusFor(path: string): PageStatus {
  if (loadSession().committed.includes(path)) return "approved";
  return existsSync(draftMdPath(path)) ? "ready" : "drafting";
}

/** All pages currently registered (have a sidecar), sorted by path. */
export function listPages(): PageListItem[] {
  ensureDir();
  const metas: DraftMeta[] = [];
  for (const file of readdirSync(DRAFTS_DIR)) {
    if (!file.endsWith(".json") || file === "_state.json") continue;
    try {
      metas.push(
        JSON.parse(readFileSync(join(DRAFTS_DIR, file), "utf-8")) as DraftMeta
      );
    } catch {
      /* skip malformed sidecar */
    }
  }
  return metas
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((m) => ({ path: m.path, title: m.title, status: statusFor(m.path) }));
}

/** Mark a page approved (after the file is written + committed). */
export function markApproved(path: string): void {
  const s = loadSession();
  if (!s.committed.includes(path)) {
    s.committed.push(path);
    saveSession(s);
  }
}

// --- Helpers ---

/** Pull a human title from frontmatter, else fall back to the filename. */
function deriveTitle(path: string): string {
  const full = join(REPO_ROOT, path);
  if (existsSync(full)) {
    const content = readFileSync(full, "utf-8");
    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (fm) {
      const t = fm[1]!.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (t) return t[1]!.trim();
    }
  }
  const base = path.split("/").pop()!.replace(/\.md$/, "");
  return base.replace(/[-_]/g, " ");
}

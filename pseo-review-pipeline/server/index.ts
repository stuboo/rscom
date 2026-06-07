import { join } from "path";
import { existsSync, writeFileSync } from "fs";
import {
  REPO_ROOT,
  getDraftBody,
  getMeta,
  getOriginal,
  listPages,
  markApproved,
  putDraft,
  registerBatch,
  saveDraftBody,
  type Reference,
} from "./state";

const PORT = Number(process.env.PSEO_PORT ?? 19600);
const PUBLIC_DIR = join(import.meta.dir, "..", "public");

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Commit a single file to the repo on the current branch. */
async function commitFile(path: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const add = Bun.spawn(["git", "-C", REPO_ROOT, "add", "--", path], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if ((await add.exited) !== 0) {
    return { ok: false, error: await new Response(add.stderr).text() };
  }
  const commit = Bun.spawn(
    ["git", "-C", REPO_ROOT, "commit", "-m", message, "--", path],
    { stdout: "pipe", stderr: "pipe" }
  );
  if ((await commit.exited) !== 0) {
    const err = await new Response(commit.stderr).text();
    const out = await new Response(commit.stdout).text();
    // "nothing to commit" is not a hard failure — the approved content matched HEAD.
    if (/nothing to commit/i.test(out + err)) return { ok: true };
    return { ok: false, error: err || out };
  }
  return { ok: true };
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // --- API ---

    // GET /api/pages -> sidebar list
    if (pathname === "/api/pages" && req.method === "GET") {
      return json(listPages());
    }

    // GET /api/page?path=... -> draft + original + evidence
    if (pathname === "/api/page" && req.method === "GET") {
      const path = url.searchParams.get("path");
      if (!path) return json({ error: "Missing path" }, 400);
      const meta = getMeta(path);
      if (!meta) return json({ error: "Unknown page" }, 404);
      return json({
        path,
        title: meta.title,
        summary: meta.summary,
        references: meta.references,
        draft: getDraftBody(path) ?? "",
        original: getOriginal(path) ?? "",
      });
    }

    // POST /api/batch -> register pages as "drafting"
    if (pathname === "/api/batch" && req.method === "POST") {
      const body = (await req.json()) as { pages: { path: string; title?: string }[] };
      registerBatch(body.pages ?? []);
      return json({ ok: true, count: (body.pages ?? []).length });
    }

    // POST /api/draft -> store a finished draft
    if (pathname === "/api/draft" && req.method === "POST") {
      const body = (await req.json()) as {
        path: string;
        draft: string;
        summary?: string;
        references?: Reference[];
        title?: string;
      };
      if (!body.path || typeof body.draft !== "string") {
        return json({ error: "path and draft are required" }, 400);
      }
      putDraft(
        body.path,
        body.draft,
        body.summary ?? "",
        body.references ?? [],
        body.title
      );
      return json({ ok: true });
    }

    // POST /api/save -> autosave edited draft body (no commit)
    if (pathname === "/api/save" && req.method === "POST") {
      const body = (await req.json()) as { path: string; content: string };
      if (!body.path || typeof body.content !== "string") {
        return json({ error: "path and content are required" }, 400);
      }
      const ok = saveDraftBody(body.path, body.content);
      return json(ok ? { ok: true } : { error: "Unknown page" }, ok ? 200 : 404);
    }

    // POST /api/approve -> write to repo, commit, mark approved
    if (pathname === "/api/approve" && req.method === "POST") {
      const body = (await req.json()) as { path: string; content: string };
      if (!body.path || typeof body.content !== "string") {
        return json({ error: "path and content are required" }, 400);
      }
      const target = join(REPO_ROOT, body.path);
      if (!existsSync(target)) {
        return json({ error: `Page not found in repo: ${body.path}` }, 404);
      }
      writeFileSync(target, body.content);
      const result = await commitFile(body.path, `pSEO review: ${body.path}`);
      if (!result.ok) {
        return json({ error: `Commit failed: ${result.error}` }, 500);
      }
      markApproved(body.path);
      return json({ ok: true });
    }

    // --- Static UI ---

    if (req.method === "GET") {
      const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
      const file = Bun.file(join(PUBLIC_DIR, rel));
      if (await file.exists()) return new Response(file);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.error(`pseo-review server listening on http://127.0.0.1:${PORT}`);
console.error(`repo root: ${REPO_ROOT}`);

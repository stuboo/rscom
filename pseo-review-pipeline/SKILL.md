---
name: pseo-review
version: 3.0.0
description: |
  Headless review pipeline for programmatic SEO pages. Bun server + web textarea UI
  served over Tailscale. A research agent pre-drafts full revised pages against a
  medical wiki (humanized + de-slopped), and the physician edits each draft directly
  in a browser textarea and approves — each approval commits to git.
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
  - Skill
  - Agent
trigger: |
  When the user wants to review pSEO pages, says "pseo review", "review pages",
  "start review pipeline", or wants to continue the page-by-page review process.
---

# pSEO Review Pipeline (headless)

You are assisting a urogynecologist (the clinical expert) in reviewing programmatic SEO
pages for accuracy, completeness, and readability. The box is headless: review happens in
a browser textarea served over Tailscale, not a Chrome extension.

## Architecture

```
┌──────────────┐  POST /api/draft   ┌────────────┐   GET /        ┌──────────────┐
│ Research      │ ─────────────────► │ Bun server │ ─────────────► │  Browser      │
│ agent(s)      │                    │ :19600     │  textarea UI   │  (physician   │
│ (you, Claude) │                    │            │ ◄───────────── │   over        │
└──────────────┘                    └────────────┘  POST /approve │   Tailscale)  │
       │ humanizer + stop-slop            │ git commit            └──────────────┘
       ▼                                  ▼
  full revised draft                 repo markdown
```

- **Bun server** (`server/index.ts`): serves the UI on `:19600` and the JSON API. Draft +
  session state live on disk under `drafts/` (gitignored), so they survive a restart.
- **Web UI** (`public/index.html`): sidebar list of pages + textarea + collapsible evidence
  panel + diff-vs-original toggle. Self-contained, no build, no deps.
- **Research agent**: a Claude Code agent (you spawn it) that reads the wiki, produces a
  **full revised draft** of each page, then runs `/humanizer` + `/stop-slop` before posting.
- The server is **decoupled from `pseo-review-tracker.md`** — it never edits that file.
  Each approval commits to git; you reconcile the tracker in a batch afterward.

## Setup & Startup

### 1. Start the review server

```bash
cd <repo>/pseo-review-pipeline
bun run server/index.ts
# logs: pseo-review server listening on http://127.0.0.1:19600
#       repo root: <repo>
```

Repo root is auto-detected as two levels up from `server/`. Override with `RSCOM_ROOT` if
the checkout moved. Port override: `PSEO_PORT`. Draft dir override: `RSCOM_DRAFTS`.

### 2. Expose it on the tailnet

```bash
tailscale serve --bg 19600
tailscale serve status   # shows the https://<machine>.<tailnet>.ts.net URL
```

The physician opens that HTTPS URL (or `http://<machine>:19600` via MagicDNS if you skip
`serve` and bind to the tailnet). Tailscale + your ACLs are the access boundary — the app
itself has no auth, so keep it tailnet-only (never `tailscale funnel`).

### Shutdown

```bash
tailscale serve reset          # stop exposing the port
lsof -ti:19600 | xargs kill     # stop the Bun server
```

## Orchestration Workflow

### 1. Pick a batch

Read `pseo-review-tracker.md`, take the next ~10 unreviewed pages (`- [ ]`). Expand any
location directory line (e.g. `locations/brillion/ (4 pages)`) into its 4 `.md` files.

### 2. Register the batch (so they show as "drafting")

```bash
curl -s -X POST http://127.0.0.1:19600/api/batch \
  -H 'Content-Type: application/json' \
  -d '{"pages":[{"path":"life-stages/recurrent-prolapse.md"}, ...]}'
```

### 3. Draft each page (research agent → humanize → post)

For each page, spawn a research agent (prompt template below). The agent returns a full
revised markdown draft plus an evidence summary and references. Then **you** run
`/humanizer` and `/stop-slop` on that draft before posting it, so what the physician sees is
already clean:

```bash
curl -s -X POST http://127.0.0.1:19600/api/draft \
  -H 'Content-Type: application/json' \
  -d '{"path":"...","draft":"<full markdown>","summary":"...","references":[...]}'
```

The page flips from `drafting` → `ready` in the sidebar the moment its draft lands.

### 4. Physician reviews

In the browser: click a page → its draft loads in the textarea, evidence summary +
references show above it, and the **Diff vs original** toggle shows what changed. The
physician edits freely (autosaved every ~1.2s) and clicks **Approve & commit**:

- The textarea content (their edits, authoritative) is written to the repo file.
- The server commits just that file: `pSEO review: <path>`.
- Status → `approved`, and the UI advances to the next `ready` page.

There is no "revise" round-trip and no AskUserQuestion — the physician edits directly.

### 5. Reconcile the tracker (batch, after a session)

The server doesn't touch `pseo-review-tracker.md`. After a session, mark the approved pages
`- [x] [H]` (they were humanized + de-slopped before review) and append Change Log entries.
Use `git log --oneline` for the list of `pSEO review:` commits to know what was approved.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/` | The textarea review UI |
| GET  | `/api/pages` | `[{ path, title, status }]` — status = `drafting \| ready \| approved` |
| GET  | `/api/page?path=…` | `{ path, title, summary, references, draft, original }` |
| POST | `/api/batch` | `{ pages: [{ path, title? }] }` → register pages as `drafting` |
| POST | `/api/draft` | `{ path, draft, summary?, references?, title? }` → store finished draft |
| POST | `/api/save` | `{ path, content }` → autosave edited draft body (no commit) |
| POST | `/api/approve` | `{ path, content }` → write file, git commit, mark `approved` |

## Research Agent Prompt Template

Spawn one agent per page (via the Agent tool):

```
You are a medical content research agent reviewing a programmatic SEO page for clinical
accuracy and completeness by comparing it against a medical knowledge wiki.

## Page to review
Read the page markdown at: {pagePath}

## Knowledge base (clinical wiki)
The medical wiki lives at `/home/jryanstewart/urogyn-wiki/` (synced from the Mac's Obsidian
vault every 15 min via cron — see `~/bin/sync-wiki.sh`):
- `wiki/INDEX.md` — index of all 213 concept articles by topic + category
- `wiki/concepts/<topic>.md` — per-topic articles with an Evidence section and `sources:` keys
- `wiki/categories/<category>.md` — category roll-ups
- `sources/<citation-key>.md` — full bibliographic detail (authors, title, journal, year, doi)
  for the `[[citation-key]]` references in each concept article

## Research process
1. Read the page markdown file.
2. Identify the condition/topic and key clinical claims.
3. Open `wiki/INDEX.md`, find the relevant concept articles, and read them for evidence;
   resolve their `sources:` keys against `sources/` for citation detail.
4. Compare the page against wiki evidence:
   - Are clinical claims accurate and up-to-date?
   - Are treatment options complete (nothing major missing)?
   - Are any statements misleading or oversimplified?
   - Does it follow the clinical patterns below?
5. Produce a FULL revised version of the page markdown (frontmatter included), making only
   evidence-backed clinical edits. Keep changes surgical — do not rewrite sound sections.
6. REFERENCES ARE MANDATORY. Every evidence-based article (treatment comparisons, condition
   question pages, life-stages, location pages) MUST end with a `## References` section AND
   set `last_evidence_review: <today>` in frontmatter. Rules:
   - Cite ONLY real entries that exist as files in `/home/jryanstewart/urogyn-wiki/sources/`.
     NEVER fabricate an author, title, journal, year, or DOI. If no source backs a claim,
     omit the reference (or soften the claim) — do not invent one.
   - Verify topical fit: a `sources/` file about a different condition (e.g. a fecal-
     incontinence review) does NOT belong on an OAB or SUI page even if it mentions a shared
     device. Match the reference to the claim.
   - Format each as: `- Author A, Author B, Author C, et al. Title. Journal. Year. [doi:10.xxxx/yyyy](https://doi.org/10.xxxx/yyyy)`
     ("et al." after the first 3 authors). Populate the structured `references` array to match.

## Clinical patterns to enforce
- Shared decision-making approach, NOT stepwise conservative-first
- PT is not just Kegels — includes strength, relaxation/elongation, coordination,
  endurance, plus surrounding structures (hips, buttocks, thighs, core), breathing,
  postural, and bracing changes
- Differentiate treatments by condition type (stress vs urge vs mixed)
- For mixed incontinence: treat the most bothersome type first; stress surgery
  can temporarily worsen urge symptoms
- AUA guidelines don't require step therapy (though insurance might)
- Correct fellowship pathways: 3yr after OB/GYN residency or 2yr after urology residency
- General insurance language — no specific plan lists
- Sacral neuromodulation for fecal incontinence = "bowel pacemaker"
- Dr. Stewart doesn't offer injectable bulking agents for fecal incontinence
- Sphincter repair for fecal incontinence is rarely recommended (poor long-term
  durability, painful recovery, high infection risk)
- Urethral bulking is a treatment option for stress incontinence
- Tibial neuromodulation is a treatment option for urge incontinence
- Botox lasts 6-9 months; sacral neuromodulation battery 10-15 years;
  urethral bulking effective at least 7 years
- In-office PT context where relevant (practice has in-office pelvic floor PTs)
- Plain language over jargon
- NEVER include employer name, practice name, or address

## Output
Return JSON:
{
  "draft": "<the full revised page markdown>",
  "summary": "Brief evidence summary of what you found and changed",
  "references": [
    { "author": "...", "title": "...", "journal": "...", "year": 2024, "doi": "https://doi.org/..." }
  ]
}
```

After the agent returns: run `/humanizer` then `/stop-slop` on `draft`, then POST to
`/api/draft`.

## Humanizer / stop-slop patterns (applied before the physician sees the draft)

- Sentence-case headings
- No bold in list items or body text
- Quotes without "Dr. Stewart explains/notes:" attribution, placed under "Dr. Stewart's
  perspective" heading
- Plain language over jargon
- In-office PT context where relevant
- Correct fellowship pathways (3yr after OB/GYN or 2yr after urology)
- General insurance language (no specific plan lists)
- Differentiate treatments by condition type (stress vs urge)
- AUA guidelines don't require step therapy (though insurance might)
- Sacral neuromodulation for fecal incontinence = "bowel pacemaker"
- Dr. Stewart doesn't offer injectable bulking agents for fecal incontinence
- Sphincter repair for fecal incontinence is rarely recommended (poor long-term durability,
  painful recovery, high infection risk)
- PT is not just Kegels (see clinical patterns above)
- Urethral bulking for stress incontinence; tibial neuromodulation for urge incontinence
- Botox 6-9mo; SNM battery 10-15yr; urethral bulking effective at least 7yr

## Tracker format

`pseo-review-tracker.md` uses:
- `- [ ] path/to/file.md` — unreviewed
- `- [x] [H] path/to/file.md` — reviewed and humanized
- Location lines: `- [ ] locations/city/ (4 pages)` — expand to individual files

---
name: pseo-review
version: 2.0.0
description: |
  Expert review pipeline for programmatic SEO pages. Chrome extension + Bun server
  + research agent loop. Agents pre-research pages against a medical wiki, propose
  edits via API, and a Chrome sidebar lets the physician approve/revise/skip.
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

# pSEO Review Pipeline

You are assisting a urogynecologist (the clinical expert) in reviewing programmatic SEO pages for accuracy, completeness, and readability using an automated research + sidebar review pipeline.

## Architecture

```
┌─────────────┐  POST /propose   ┌────────────┐  GET /current   ┌──────────────┐
│  Research    │ ───────────────► │ Bun Server │ ◄────────────── │   Chrome      │
│  Agent       │                  │ :19600     │ ───────────────► │   Sidebar     │
│  (Claude)    │ ◄─ POST /next ── │            │  POST /decide   │   Extension   │
└─────────────┘                  └────────────┘                 └──────────────┘
                                       ▲
                                       │ highlights
                                       ▼
                                 ┌──────────────┐
                                 │ Jekyll Preview│
                                 │ :4000        │
                                 └──────────────┘
```

- **Bun server** (`server/index.ts`): API on port 19600, manages queue and state
- **Chrome extension** (`extension/`): sidebar UI for physician review decisions
- **Research agent**: Claude Code agent that reads wiki → compares against page → POSTs proposals
- **Jekyll preview**: local site at http://127.0.0.1:4000 for reading pages in context

## Setup & Startup

### 1. Start Jekyll preview (if not already running)

```bash
cd /Users/jrs/Library/CloudStorage/Dropbox/ryan/Projects/@inprogress_proj/GitHub/rscom
bundle exec jekyll serve --livereload
```

### 2. Start the review server

```bash
cd /Users/jrs/Library/CloudStorage/Dropbox/ryan/Projects/@inprogress_proj/GitHub/rscom/pseo-review-pipeline
bun run server/index.ts
```

The server logs `pseo-review server listening on http://127.0.0.1:19600` to stderr.

### 3. Load the Chrome extension

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the `pseo-review-pipeline/extension/` directory
4. The pSEO Review extension appears with a side panel

Or launch Chrome with the extension pre-loaded:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --load-extension="$PWD/extension" \
  --auto-open-devtools-for-tabs \
  http://127.0.0.1:4000
```

## Shutdown

```bash
# Stop the Bun server (Ctrl+C in its terminal, or):
lsof -ti:19600 | xargs kill

# Stop Jekyll (Ctrl+C in its terminal, or):
lsof -ti:4000 | xargs kill
```

## Orchestration Workflow

### Full review loop

1. **Start services** (Jekyll + Bun server + Chrome extension)
2. **Advance the queue**: `POST /next` → server sets status to `researching`, returns next page path
3. **Research agent** runs (see prompt template below):
   - Reads the page markdown
   - Queries the wiki for relevant clinical concepts
   - Compares page content against wiki evidence
   - Generates a structured Proposal
   - POSTs to `http://127.0.0.1:19600/propose`
4. **Sidebar shows proposal** (server status → `ready`, sidebar polls and renders)
5. **Physician decides**:
   - **Approve**: sidebar POSTs `{decision: "approve"}` → server marks reviewed, advances queue
   - **Revise**: sidebar POSTs `{decision: "revise", feedback: "..."}` → server stores feedback, resets to `researching` → research agent re-runs with feedback
   - **Skip**: sidebar POSTs `{decision: "skip"}` → server marks reviewed, advances queue
6. **On approve**: the orchestrator applies the approved changes to the markdown file, runs `/humanizer`, marks `[x] [H]` in the tracker
7. **Loop**: go to step 2 until queue is empty (status → `idle`)

### Driving the loop from Claude Code

```
# Advance to next page
curl -s -X POST http://127.0.0.1:19600/next | jq

# Check status
curl -s http://127.0.0.1:19600/health | jq

# Submit a proposal (research agent does this)
curl -s -X POST http://127.0.0.1:19600/propose \
  -H "Content-Type: application/json" \
  -d '{"page":"path/to/file.md","summary":"...","changes":[...],"references":[...]}'

# Get current proposal
curl -s http://127.0.0.1:19600/current | jq
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ status, queue_length, reviewed_count, current_page }` |
| GET | `/current` | Current Proposal object (404 if none) |
| POST | `/propose` | Accept Proposal JSON body, set status → `ready` |
| POST | `/decide` | `{ decision: "approve"\|"revise"\|"skip", feedback?: string }` |
| GET | `/queue` | Array of `{ path, status }` for all pages |
| POST | `/next` | Advance to next unreviewed page, status → `researching` |

## Research Agent Prompt Template

Use this prompt when launching the research agent (via the Agent tool) for each page:

```
You are a medical content research agent. Your job is to review a programmatic SEO
page for clinical accuracy and completeness by comparing it against a medical
knowledge wiki.

## Page to review

Read the page at: {pagePath}
The page is live at: http://127.0.0.1:4000/{permalink}

## Research process

1. Read the page markdown file
2. Identify the condition/topic and key clinical claims
3. Search the wiki for relevant articles:
   - Look in wiki/ directory for topic-related files
   - Read relevant wiki articles for evidence and citations
4. Compare the page content against wiki evidence:
   - Are clinical claims accurate and up-to-date?
   - Are treatment options complete (nothing major missing)?
   - Are any statements misleading or oversimplified?
   - Does the page follow established clinical patterns (see below)?
5. Generate a structured Proposal with specific changes

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

{feedbackSection}

## Output format

POST your proposal as JSON to http://127.0.0.1:19600/propose:

```json
{
  "page": "{pagePath}",
  "summary": "Brief evidence summary of what was found and what needs changing",
  "changes": [
    {
      "section": "Section heading where change applies",
      "before": "Exact text to replace (or empty string for additions)",
      "after": "New text to use",
      "reason": "Why this change is needed, with evidence"
    }
  ],
  "references": [
    {
      "author": "Author names",
      "title": "Article title",
      "journal": "Journal name",
      "year": 2024,
      "doi": "https://doi.org/..."
    }
  ]
}
```

Keep changes surgical and focused. Do not rewrite entire sections.
Only propose changes where there is clear clinical evidence for improvement.
```

### Feedback section (for revise iterations)

When the physician clicks "Revise" with feedback, re-run the agent with this added:

```
## Physician feedback on previous proposal

The physician reviewed your previous proposal and requested revisions:

"{feedback}"

Incorporate this feedback into your revised proposal. The physician is the
clinical expert — their feedback takes priority over wiki evidence.
```

## Established Patterns (apply during /humanizer after approval)

- Sentence-case headings
- No bold in list items or body text
- Quotes without "Dr. Stewart explains/notes:" attribution, placed under "Dr. Stewart's perspective" heading
- Plain language over jargon
- In-office PT context where relevant
- Correct fellowship pathways (3yr after OB/GYN or 2yr after urology)
- General insurance language (no specific plan lists)
- Differentiate treatments by condition type (stress vs urge)
- AUA guidelines don't require step therapy (though insurance might)
- Sacral neuromodulation for fecal incontinence = "bowel pacemaker"
- Dr. Stewart doesn't offer injectable bulking agents for fecal incontinence
- Sphincter repair for fecal incontinence is rarely recommended (poor long-term durability, painful recovery, high infection risk)
- PT is not just Kegels — includes strength, relaxation/elongation, coordination, endurance, plus surrounding structures (hips, buttocks, thighs, core), breathing, postural, and bracing changes
- Urethral bulking is a treatment option for stress incontinence
- Tibial neuromodulation is a treatment option for urge incontinence
- Botox lasts 6-9 months; sacral neuromodulation battery replacement after 10-15 years; urethral bulking effective at least 7 years

## Tracker format

The tracker at `pseo-review-tracker.md` uses:
- `- [ ] path/to/file.md` — unreviewed
- `- [x] [H] path/to/file.md` — reviewed and humanized
- Location lines: `- [ ] locations/city/ (4 pages)` — expand to individual files

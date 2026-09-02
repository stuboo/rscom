# GEO Audit Report: Ryan Stewart, DO

**Audit Date:** 2026-08-30
**URL:** https://ryanstewart.com
**Business Type:** Local Business — solo medical practice (urogynecology), YMYL health content
**Pages Analyzed:** 125 live URLs (sitemap), plus 141 unpublished source files reviewed locally

---

## Executive Summary

> **Status update, 2026-09-02.** Substantial work has shipped since this was
> written — 10 commits across Weeks 1–4. Every Critical except C5–C7 is fixed,
> deployed, and verified live. **The week-by-week checklists near the bottom are
> the current source of truth**; the diagnosis above them describes the site *as
> audited* on 2026-08-30 and is deliberately left unedited so the before/after is
> legible.
>
> Still open and blocking: **C5** HTTPS enforcement (a checkbox in repo Settings
> → Pages), **C6** midwestpelvis.com still serving a competing self-canonicalizing
> site, and **C7** the Indianapolis identity split (WebMD correction pending,
> Yelp and Practo untouched). C5 and C6 need Ryan's access, not code.
>
> The 62 score has **not** been recomputed and is stale — the Technical, Schema,
> and AI Citability inputs have all moved. Treat it as the baseline, not the
> current state.
>
> See also **"Found during implementation"** below for what this audit got wrong
> or missed.

**Overall GEO Score: 62/100 (Fair)**

The technical GEO foundation here is genuinely top-decile for a solo-physician site, and it provably works: an AI search for "urogynecologist Green Bay Wisconsin pelvic organ prolapse specialist" cites this site first and quotes its JSON-LD `knowsAbout` array verbatim. Static server-rendered HTML, 82ms TTFB, a single canonical `@id` physician entity referenced rather than duplicated, a well-formed `llms.txt`, DOI-cited clinical writing, and first-person surgical judgment that Mayo Clinic structurally cannot reproduce.

That foundation is carrying a corpus with four categorical trust defects that are live right now: **two raw LLM chat artifacts published on treatment hub pages**, a **"Medically reviewed" badge backed by file-modification timestamps on 40 live pages**, **nine testimonials with no attribution to any platform**, and **a false clinical claim that surgical mesh "lasts forever."** On YMYL medical content attributed to a named, licensed physician with an NPI in the same markup, these are not gradual deductions — they disqualify the pages carrying them.

The second structural problem is identity. The strongest third-party coverage he has — Fortune, Medscape, Washington Post/The Lily — all dateline him to Indianapolis, and his own `sameAs` vouches for a WebMD profile that says Louisville, Kentucky. Asked "who is Dr. Ryan Stewart, urogynecologist," an AI engine confidently answers *Indiana*.

Roughly an hour of edits removes most of the trust loss. Nothing in the top ten findings requires new capability — the review pipeline that produced the good 48% already exists and works.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 72/100 | 25% | 18.0 |
| Brand Authority | 41/100 | 20% | 8.2 |
| Content E-E-A-T | 57/100 | 20% | 11.4 |
| Technical GEO | 76/100 | 15% | 11.4 |
| Schema & Structured Data | 68/100 | 10% | 6.8 |
| Platform Optimization | 64/100 | 10% | 6.4 |
| **Overall GEO Score** | | | **62/100** |

### Scope correction

Three working assumptions about this site are wrong, and they change every denominator:

| Assumed | Actual |
|---|---|
| ~261 content pages | **125 live URLs** — 141 source files carry `published: false` |
| ~136 location pSEO pages live | **8 live** (Green Bay + Appleton × 4 conditions); 128 gated |
| 218 pages with FAQ schema | **86 of 120** live content pages |

The gating is deliberate and well-governed (`pseo-review-tracker.md` holds pages behind medical review, and `locations/index.md` hides unreviewed cities so no broken links leak). But **60% of the written corpus is invisible to AI engines today**, including two of the highest-citability assets on the site: `sling-vs-bulking-agents` and `snm-vs-botox-oab` both 404.

---

## Critical Issues (Fix Immediately)

### C1. Two raw LLM chat artifacts are live on treatment hub pages

Verified live on the public site:

`/treatments/urinary-incontinence` (source `treatments/urinary-incontinence/index.md:54`):
> "You're absolutely correct. I apologize for the oversight. Sacral neuromodulation and tibial neuromodulation are indeed important minimally invasive procedures for urinary incontinence. I'll revise the section to include these treatments. Here's the updated version:"

`/treatments/fecal-incontinence` (source `treatments/fecal-incontinence/index.md:25`):
> "Certainly, I'll add the Eclipse device to the Conservative Treatments section. Here's the updated content:"

Both sit mid-page between clinical sections on the two top-level treatment hubs. **Fix:** delete both paragraphs, then grep the corpus for `I apologize|As an AI|Here's the updated|You're absolutely|Certainly, I'll` before anything else ships.

### C2. "✓ Medically reviewed" is backed by a file-modification timestamp on 40 live pages

`_includes/author-card.html:7`, `_includes/medical-page-schema.html:9`, and `_includes/schema.html:124` all resolve:

```liquid
{% assign review_date = page.last_evidence_review | default: page.last_reviewed_date | default: page.last_modified_date %}
```

…then render **"✓ Medically reviewed {date}"** and emit `"lastReviewed"` into `MedicalWebPage` JSON-LD.

Verified live on `/treatments/prolapse/pessary`, whose frontmatter contains **no review field at all**:
```
"lastReviewed": "2026-03-15"
Medically reviewed March 15, 2026
```

40 live pages reach that badge only through `last_modified_date`, and most of those dates are a single bulk stamp. The entire `/treatments/` tree asserts a March 2026 physician review while containing zero citations and never having been reviewed.

This is the most serious finding in the audit: a false attestation of medical review, in both human- and machine-readable form, attributed to a named board-certified physician with an NPI in the same JSON-LD block.

**Fix:** drop `| default: page.last_modified_date` from all three includes. Render no badge and emit no `lastReviewed` unless `last_evidence_review` or `last_reviewed_date` is explicitly set.

### C3. Nine testimonials with zero attribution, rotated onto 65 clinical pages

Every entry in `_data/testimonials.yml` carries only `context: "Patient testimonial"` — no name, no platform, no date, no link. Four appear on no review platform and nowhere on `/testimonials`:

| idx | Quote | Pages |
|---|---|---|
| 4 | "He was confident, and **felt we could achieve good results**." | 17 |
| 5 | "Dr. Stewart's approach made me feel heard and understood during a difficult time." | 17 |
| 7 | "Dr. Stewart's expertise gave me confidence in my treatment plan." | 16 |
| 8 | "I felt completely comfortable discussing sensitive health issues." | 15 |

Index 4 is outcome-implying and renders on `treatments/comparisons/robotic-vs-vaginal-repair.md` and `life-stages/prolapse-after-pregnancy.md` — surgical decision pages. Every *real* review on `/testimonials` carries a name and platform (Google, Healthgrades, WebMD); these do not.

This is FTC endorsement exposure (16 CFR 465, effective Oct 2024) and a state medical-board advertising concern, independent of any SEO consideration.

**Fix:** delete indices 4, 5, 7, 8, or replace with verifiable sourced reviews. Add `source:` and a profile link to the remaining five. Remove outcome-implying quotes from treatment-decision pages entirely.

### C4. A false clinical claim about surgical mesh, live and uncited

`treatments/prolapse/mesh-augmented-repair.md:21`, verified live:
> "Mesh works for this approach and **it lasts forever**. Failure rates are low because the mesh is durable."

Polypropylene mesh contracts, can fragment, and sacrocolpopexy mesh exposure accrues over time — as this site's own `treatments/comparisons/robotic-vs-vaginal-repair.md` correctly reports. The page has no references and displays "Medically reviewed March 15, 2026."

### C5. HTTPS is not enforced

```
http://ryanstewart.com/                → HTTP/1.1 200 OK  (26,916 bytes, cleartext)
http://ryanstewart.com/conditions/...  → HTTP/1.1 200 OK  (46,758 bytes, cleartext)
```

No 301, no upgrade. This is not a platform limitation — `pages.github.com`, also GitHub Pages on a custom domain, correctly 301s. The **Enforce HTTPS** checkbox is off in repo Settings → Pages.

Cleartext delivery of pelvic-health page requests is a genuine privacy concern for this audience. **Fix:** check the box; also add a root `CNAME` file containing `ryanstewart.com`, since with an Actions-based deploy the custom-domain setting can be dropped on some repo operations, silently disabling enforcement.

### C6. midwestpelvis.com is still live and self-canonicalizing

```
https://midwestpelvis.com/ → 301 → https://www.midwestpelvis.com/ → 200
<title>Indianapolis Urogynecology - Midwest Center for Pelvic Health</title>
<link rel="canonical" href="https://www.midwestpelvis.com/da-vinci-robotic-sacrocolpopexy/" />
```

`DOMAIN_REDIRECT_SETUP.md` describes a plan that was never executed. Every one of the 29 `redirect_from` blocks in the repo is downstream of a domain redirect that does not exist, so all of them are inert for their actual purpose. The old site competes with ryanstewart.com for the same entity and holds whatever authority the legacy URLs accumulated.

This is the single largest recoverable authority item on the site, and it compounds C7.

### C7. The Indianapolis identity split is producing wrong AI answers

Asked "Dr. Ryan Stewart urogynecologist," an AI engine answers that he **"is a urogynecologist in Indiana… building his own pelvic health practice called Midwest Center… in Indiana, not in Green Bay, Wisconsin."**

Causes, in order of severity:
- **His own `sameAs` vouches for a WebMD profile listing Louisville, Kentucky / Norton Urogynecology Center.** A `sameAs` pointing at a contradictory address actively teaches crawlers the entity has two locations.
- Fortune, Medscape, and Washington Post/The Lily coverage of the Dec 2021 viral thread all dateline him to Indianapolis.
- A Yelp listing (`james-ryan-stewart-do-norton-urogynecology-center-louisville`) and a Practo listing ("Fishers 46037", an Indiana ZIP) repeat it.
- Nothing on ryanstewart.com mentions the prior practice, the media coverage, or `@stuboo`.

**Fix:** claim and correct the WebMD profile or remove it from `sameAs` until corrected; claim or suppress the Yelp and Practo listings; publish a page that owns the history and links the media coverage, so his strongest authority signals resolve to Green Bay.

---

## High Priority Issues

### H1. No contact information exists anywhere on the site

No phone number, street address, email, contact form, or booking link in any file. `/privacy-policy` tells readers to reach him "through the contact information available on this website" — there is none. `_includes/location-cta.html` renders a heading reading **"Schedule Your Appointment"** with no mechanism to do so.

The data is public and authoritative. Verified against the CMS NPI registry (record updated 2026-03-18):

```
2845 Greenbrier Rd, Fl 4, Green Bay, WI 54311-6519
Tel: 920-288-8510
Taxonomy: 207VF0040X (Obstetrics & Gynecology, Urogynecology and Reconstructive Pelvic Surgery)
License: WI 81734
```

Contact/NAP is a primary Trustworthiness signal in Google's Quality Rater Guidelines, a first-order local-SEO input, and the thing an AI needs to answer "how do I book with Dr. Stewart." This is the cheapest large point-gain available.

### H2. The flagship prolapse page publishes a 2016 medical review date

`conditions/prolapse/pelvic-organ-prolapse.md:40` sets `last_reviewed_date: 2016-01-01`, which outranks `last_modified_date: 2026-03-15` in the fallback chain. Verified live:

```
"lastReviewed": "2016-01-01"
Medically reviewed January 1, 2016
```

On the site's single most important condition page. A machine-readable ten-year-old review date is a direct citation disqualifier on YMYL content. Almost certainly a typo for 2026-01-01 — a one-line fix.

### H3. FAQ answers strip out the statistics the body text already has

The `FAQPage` block is the most-extracted unit on every page, and it is systematically **less** citable than the prose above it.

On `/treatments/comparisons/pessary-vs-surgery`, the body reads *"78% felt much or very much better at 1 year, and over 90% … at 2 and 3 years."* The FAQ answer to the same question reads only *"In a large national registry, most women who kept using a pessary stayed happy with it for years."* The number and the source are stripped from exactly the block an answer engine quotes.

**Fix:** mirror the body's specific numbers and study names into the `faq:` frontmatter. Highest-leverage citability edit on the site; touches ~86 pages of already-written frontmatter.

### H4. 26 treatment pages declare procedures and devices as diseases in JSON-LD

`_includes/schema.html` emits `"about": {"@type": "MedicalCondition", "name": "{{ page.title }}"}` for anything under `/treatments/`. Verified live on `/treatments/prolapse/pessary`:

```json
"about": { "@type": "MedicalCondition", "name": "Pessary" }
```

Also produces `MedicalCondition: "Urethral Bulking"`, `"Botox Injections"`, `"Watch and Wait"`, `"Eclipse Device"`. A pessary is a device, not a condition. This is a false clinical ontology asserted in machine-readable form on a physician's site — precisely the kind of claim an LLM repeats.

**Fix:** switch on URL prefix and emit `MedicalProcedure` for treatment pages, reserving `MedicalCondition` for `/conditions/`.

### H5. The root entity uses five properties that are invalid for its type

`_includes/schema.html:16` declares `"@type": "IndividualPhysician"`. That type descends from `Physician → MedicalBusiness → LocalBusiness → Organization`/`Place` — **not** from `Person`. But the node uses `givenName`, `familyName`, `honorificSuffix`, `jobTitle`, and all three `alumniOf` entries, every one of which is `domainIncludes: Person` only.

Consequence: the medical school, residency, fellowship, job title, and name decomposition — precisely the E-E-A-T payload the file exists to carry — are silently dropped by any consumer that enforces domains.

**Fix (minimal, preserves specificity):** `"@type": ["IndividualPhysician", "Person"]`. Every property becomes valid and the physician semantics are kept. A more conservative alternative is `["Person", "Physician"]`, which trades the newer type's precision for broader parser support in extractors whose vocabulary snapshot predates schema.org v27; either resolves the defect.

### H6. `sameAs` omits the two strongest corroborators

Missing: the **Aurora BayCare directory page** (`aurorabaycare.com/doctors/j-ryan-stewart-1922366061` — the URL contains his NPI, making it an unusually strong identity anchor) and **LinkedIn** (`linkedin.com/in/jryanstewart/`). Also absent: `x.com/stuboo`, the YouTube channel, PubMed author.

### H7. 16 legacy inbound URLs return 404

`jekyll-redirect-from` emits no redirect stub for a page with `published: false`, so every `redirect_from:` attached to a gated draft is dead:

```
/what-causes-uterine-prolapse/     /can-uterine-prolapse-be-reversed/
/how-to-avoid-uterine-prolapse/    /can-uterine-prolapse-cause-bleeding/
/how-does-uterine-prolapse-feel/   /can-uterine-prolapse-cause-cramping/
/does-uterine-prolapse-hurt-2/     /can-uterine-prolapse-cause-heavy-periods/
/can-your-uterus-prolapse/         /can-uterine-prolapse-cause-incontinence/
/enterocele-repair/                /can-uterine-prolapse-cause-sciatica/
/non-mesh-sling-procedures/        /how-fast-does-uterine-prolapse-progress/
/vaginal-prolapse-repair/          /vaginal-prolapse-symptoms-diagnosis-treatment/
```

Four more that `REDIRECT_MAPPING.md` marks as mapped have no `redirect_from` anywhere and 404: `/labiaplasty/`, `/hysterectomy/`, `/schedule-a-consultation/`, `/urogynecologist-indianapolis/`. Verified: `/rectocele/` → 200 (working), `/what-causes-uterine-prolapse/` → 404.

These are the highest-intent legacy URLs from the old domain. Do not simply delete the `redirect_from` entries.

### H8. Sitemap `<lastmod>` missing on 118 of 125 URLs

Verified: 125 `<loc>`, 7 `<lastmod>` (the blog posts only). Meanwhile 252 source pages already carry `last_modified_date:` in frontmatter. **jekyll-sitemap reads `last_modified_at`, not `last_modified_date`** — the data exists and is simply invisible to the plugin.

**Fix:** rename the frontmatter key sitewide, *and* update `_config.yml`'s `last_edit_timestamp` consumer and any layout referencing `page.last_modified_date` so the footer timestamp and review-date chain keep working.

### H9. Three citation-integrity defects

Verified as internal contradictions in-repo:

1. **One paper, two DOIs.** Andy UU et al. (PFDR-R, *Urogynecology* 2025) cited as `10.1097/SPV.0000000000001669` on 11 pages and as `10.1097/SPV.0000000000001530` on `how-long-is-recovery-from-prolapse-surgery.md`.
2. **One DOI, three papers.** `10.1097/JU.0000000000003985` renders as three different citation strings with different authors and different page ranges (`overactive-bladder/index.md:131`, `botox-injections.md:69`, `urinary-incontinence.md:196`).
3. **One guideline, two author lists.** Kobashi 2023 SUI as "Kobashi KC, Vasavada SP, Zambon JP, et al." vs "Kobashi KC, Vasavada S, Jain P, et al."

Each needs checking by hand against PubMed. (The `healthcare-citations` MCP server failed to connect this session, so these could not be machine-verified against source.)

### H10. Superseded guidelines anchor 14 pages

14 pages cite the **2019** AUA/SUFU OAB amendment; only 3 cite the **2024** replacement — so the site contradicts itself about which guideline is current. Same pattern for SUI: 6 pages on the 2017 AUA guideline, 2 on the 2023 update. Overall citation recency: median year **2017**, 26% from 2020+.

### H11. No conflict-of-interest disclosure alongside 8 named commercial devices

No hit for `disclosure`, `conflict of interest`, `financial relationship`, `consultant`, or `proctor` anywhere. Meanwhile: **Bulkamid** (21 mentions, called "the one with the best safety and durability data"), **InterStim** (10), **Eclipse** (12), **Axonics** (4), plus da Vinci, Myrbetriq, Gemtesa, eCoin. `treatments/fecal-incontinence/eclipse-device.md` reads as vendor copy — five consecutive favorable figures (86%, 41%, 96%, 98%, 11.6→2.1 episodes), no references, no trial named, no note that the source is manufacturer-sponsored.

One line on `/about` closes this.

### H12. No `og:image`, `twitter:image`, or favicon anywhere

0 of 125 pages carry `og:image` or `twitter:image`; `twitter:card` is `summary` rather than `summary_large_image`. `/favicon.ico` returns **404** and no page links an icon — despite `assets/favicon.ico` and `assets/favicon.png` existing in the repo and serving 200. Browsers, Google's SERP favicon, and AI-assistant link previews all currently show nothing.

---

## Medium Priority Issues

### M1. Internal linking is close to nonexistent

| Section | Pages | Median in-body links | Pages with zero |
|---|---|---|---|
| conditions | 70 | 0 | **67** |
| treatments | 34 | 0 | **31** |
| _posts | 7 | 0 | **7** |

**14 in-body internal links across all 104 condition and treatment source files.** No `related:` frontmatter exists; the only structural link is the single templated parent link in `question.html`. There is no pillar-cluster structure, only a nav tree — and topical clustering is how AI systems infer subject authority.

This causes real content failures: `treatments/prolapse/watch-and-wait.md` (453 words) says nothing about natural history, while `conditions/prolapse/does-prolapse-get-worse-over-time.md` two directories away has the exact numbers (78% no change at 16 months). The pages don't link. `/treatments/prolapse/pessary` never links to `/treatments/comparisons/pessary-vs-surgery`.

### M2. The schema claims expertise the site does not have

`_includes/schema.html` asserts `knowsAbout` for 7 topics and `availableService` for 6 procedures; `index.md` lists 7 under "My Expertise." Three have **no page at all**:

| Claimed | Pages |
|---|---|
| **Vaginal Fistulas** (+ `MedicalProcedure: Vaginal Fistula Repair`) | **0** — one 2-sentence blurb |
| **Recurrent UTIs** (+ `MedicalProcedure: Recurrent UTI Treatment`) | **0** — passing mentions |
| **Genitourinary Syndrome of Menopause** | **0** — covered well *inside* two other pages |

Claiming `availableService` for procedures with no supporting page is an unsupported entity assertion that suppresses rather than helps citation.

Highest-value missing subtopics: **recurrent UTI** (high volume, high intent, zero coverage), **GSM / vaginal estrogen** (already well-written inside `life-stages/incontinence-during-menopause.md` — extract it), **mesh complications / revision** (a fellowship-trained urogynecologist who explicitly does not place transvaginal mesh is exactly who should own this query), **vaginal fistula**, **interstitial cystitis**, **urodynamics**, **pessary self-care**.

### M3. Seven cannibalizing page pairs, with the worse page on the better URL

| Legacy (unreviewed, uncited) | Modern (reviewed, cited) |
|---|---|
| `/conditions/cystocele` | `/conditions/prolapse/what-is-a-cystocele` |
| `/conditions/rectocele` | `/conditions/prolapse/what-is-a-rectocele` |
| `/conditions/enterocele` | `/conditions/prolapse/what-is-enterocele` |
| `/conditions/urge-urinary-incontinence` | `/conditions/incontinence/what-is-urge-incontinence` |
| `/conditions/mixed-urinary-incontinence` | `/conditions/incontinence/what-is-mixed-incontinence` |
| `/conditions/uterine-prolapse` | `/conditions/prolapse/can-your-uterus-prolapse` |

Plus the two `pelvic-floor-physical-therapy.md` pages (distinct titles as of `7d47500`, bodies still overlapping). In every pair the *worse* page holds the shorter, older, higher-authority URL.

### M4. Unsourced or self-contradicting outcome numbers

| Claim | File | Status |
|---|---|---|
| Pessary "fit 90% … 50% still wearing at a year" | `treatments/prolapse/pessary.md:64` | No refs; conflicts with "Up to 92%" and "About 92%" elsewhere |
| Mesh exposure "2-5%" | `mesh-augmented-repair.md` | No refs |
| Eclipse 86/41/96/98%, 11.6→2.1 | `eclipse-device.md` | No refs, no trial named |
| Rectocele "up to 80% of women" | `rectocele.md` (2,666 w, longest page) | No refs |
| Sling "80-90% cure or significant improvement" | `sling-procedures.md:89` | Most optimistic figure on site, no attribution |
| SNM battery "15 or more years" | `what-is-sacral-neuromodulation.md` | Conflicts with "10-15 years" on two pages |
| Botox UTI "~35%" | `what-is-sacral-neuromodulation.md` | Conflicts with "about 33%" on two pages |

### M5. Content fails the repo's own readability standard

`patient-readability.skill` sets the target at **8th grade or below on both** Flesch-Kincaid and SMOG. Running the skill's own `readability_score.py`:

| Group | n | median FK | median SMOG | % FK≤8 |
|---|---|---|---|---|
| conditions | 70 | 8.6 | 10.7 | 39% |
| treatments | 34 | 9.8 | 11.7 | 21% |
| life-stages | 13 | 7.5 | 10.5 | 62% |
| **sitewide** | **263** | **10.8** | **11.9** | **21%** |

The skill's own caveat applies — necessary terms like "urethra" inflate SMOG, and a 9 with real medical words beats a 6 that says "pee tube." But FK median 10.8 against a stated target of 8 is a real gap, and it tracks review status exactly: `life-stages` (85% reviewed) medians 7.5; `treatments` (21% reviewed) medians 9.8.

### M6. 14px base font on every common phone width

just-the-docs 0.10.0 ships `html { font-size: 0.875rem !important }` below a **500px** breakpoint. Every common phone (iPhone 390–430px, Android 360–412px) falls below it and renders body text at 14px. For patient-facing pelvic-health content aimed substantially at women 50+, that is under the 16px readability floor. It also drops nav tap targets from 48px to 42px, under the 44px guideline. One line in `_sass/custom/custom.scss` fixes both.

### M7. No BreadcrumbList on 118 hierarchical pages

just-the-docs already renders `<nav aria-label="Breadcrumb">` with the exact trail. Only the JSON-LD is missing — a supported Google rich result, free, and it tells AI systems the topical parent of every leaf page.

### M8. Medical concepts have no stable identity or grounding

Every `MedicalCondition` is an anonymous blank node with only a name — no `@id`, no `code`, no `sameAs`. Across 118 pages that is ~118 unrelated blank nodes where there should be ~8 canonical condition entities with ICD-10 and MeSH codes. This is the difference between "some pages mention prolapse" and "these 22 pages are about N81.1."

### M9. llms.txt covers 19 of 125 live pages (15%)

Format is spec-clean and all 19 links return 200. But coverage omits the best content: **0 of 7 comparison pages**, **0 of 12 life-stage pages** (the `/life-stages` hub isn't listed at all), 0 of 23 treatment pages, 0 of ~55 question pages.

Two accuracy defects: the Treatments section advertises "sling vs. bulking agents" and "Botox vs. neuromodulation," and **both 404**. `/locations` is described as "Cities and regions served" when only 2 cities have pages. `llms-full.txt` → 404 (~250KB for this corpus — entirely practical to generate from the Jekyll build).

### M10. Only 6 live pages contain a table, 5 of them comparison pages

Tables are the most reliably extracted structure in AI answers. Condition pages (prolapse types, POP-Q stages) and treatment pages (options by tier) are obvious candidates and have none.

### M11. Review volume is 26 across all platforms

Google 5, Healthgrades 6, US News 14, WebMD 1. For local AI answers review count is a primary ranking input, and this is the cheapest signal on the list to move.

### M12. ORCID record is nearly empty

15 works listed against 43 on Google Scholar; works stop at 2021; biography, employments, educations, researcher-urls, and keywords are **all empty**. ORCID is heavily crawled and high-trust — filling it is ~30 minutes for outsized entity benefit.

### M13. Other schema gaps

- Blog `BlogPosting.author` is a detached blank node (`"Dr. Ryan Stewart"`, no `@id`) — re-splitting the entity the consolidation commit unified, and introducing a fourth name variant absent from `alternateName`.
- Page-level and site-level nodes have no `@id`; `isPartOf` inlines a duplicate anonymous `WebSite`.
- `page.title` / `page.description` are interpolated raw into JSON rather than via `| jsonify` — a latent break on any title containing a quote or backslash, across 100+ pages.
- `/about` has no `ProfilePage` node declaring itself the authoritative page for the entity.
- `medicalSpecialty` omits `Urologic`; urogynecology needs both enum values.
- `alternateName` omits the publication byline forms (`Stewart JR`, `Stewart R`, `Stewart J`) that connect 23 papers to the entity.
- `_layouts/page.html` (49 pages) omits `medical-page-schema.html` entirely.

### M14. Zero images across 126 live pages

No `![...]` and no `<img>` in any content file; the only image is the author headshot. For prolapse anatomy, POP-Q staging, pessary types, and sling placement, this is both a comprehension gap and a forfeited Experience signal — original diagrams are exactly what distinguishes a practitioner site from aggregated content.

### M15. Blog is 15 months stale

Last post 2025-05-24; zero posts in 2026. All 7 posts score ≤15 on citability — zero statistics, zero references, no FAQ. The two best (`first-principles-medicine-patient-story`, `human-touch-ai-world-excited-not-scared`) have zero inbound internal links.

### M16. No IndexNow, no Bing Webmaster verification

`/indexnow.txt` 404s; no `msvalidate.01` meta tag. Bing indexes ~94 of 125 URLs (~75%), which caps ChatGPT search coverage since it rides that index.

### M17. 48 meta descriptions under 120 characters

The weakest are bare title-echoes on the **highest-value hub pages**: `/conditions/overactive-bladder` ("Overactive Bladder", 18 chars), `/conditions/urinary-incontinence` (20), `/treatments/prolapse/pessary` (24), `/conditions/rectocele` (27). Nine exceed 165 and will truncate. 46 titles exceed 60 characters.

---

## Low Priority Issues

- **L1.** Add `private/` to `_config.yml`'s `exclude`. It 404s today by circumstance, not configuration, and `private/or-assistant-guide-0d4cbd002c82.html` is committed to `main`. (Full leak probe of 17 internal paths otherwise came back clean.)
- **L2.** `#888` on `#f8f9fa` = 3.36:1 fails WCAG AA in `.testimonial-source` and `.rating-count` (`_includes/head_custom.html`).
- **L3.** Add an explicit `User-agent: * / Allow: /` group to robots.txt. Behaviorally identical, but some crawlers and audit tools flag a group-less file. Consider `Content-Signal: search=yes, ai-train=yes, ai-retrieval=yes`.
- **L4.** No RSS feed — `/feed.xml` 404s. Add `jekyll-feed`.
- **L5.** No custom 404 page; visitors get GitHub's generic one.
- **L6.** Homepage hero (`index.md:15`) is a 400×533 64KB JPEG displayed at 200px with no `width`/`height` (guaranteed layout shift), no `fetchpriority`, no WebP. `_includes/author-card.html` does this correctly — the homepage just never got the same treatment.
- **L7.** Two render-blocking synchronous scripts in `<head>` (`lunr.min.js`, `just-the-docs.js`), both theme defaults.
- **L8.** Two H1 violations: `conditions/conditions.md` (3×), `conditions/overactive-bladder/can-oab-be-cured.md` (4×).
- **L9.** 35 pages lack `faq:` frontmatter — the entire `/treatments/` tree, so every treatment page is missing both the rendered FAQ block and `FAQPage` structured data.
- **L10.** Voice inconsistency: 24% of unreviewed live pages mix "I" and "Dr. Stewart" within a single page.
- **L11.** `_data/locations.yml` gives Appleton `drive_time: "30 minutes"` while the page body says 45 — and Appleton is one of only 8 published location pages, so the rendered page states both.
- **L12.** `_data/locations.yml`'s `context:` field (highways, landmarks) is never rendered by `location-cta.html`.
- **L13.** YouTube channel `@stuboo` (798 subscribers, 15 videos) has an **empty description** — no name, credentials, or link. The top YouTube result for "Ryan Stewart" is a soil scientist.
- **L14.** `FAQPage` markup will not produce rich results (restricted to government and health-authority sites since Aug 2023). Keep it anyway — it still helps AI Q&A extraction. Noted so it isn't mistaken for a Search Console win.
- **L15.** Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, and Permissions-Policy are **impossible on GitHub Pages** without a reverse proxy (verified against two other GitHub Pages sites). Two do have working HTML equivalents: `<meta name="referrer">` and `<meta http-equiv="Content-Security-Policy">`. Given zero attack surface, treat the proxy as optional.

---

## Category Deep Dives

### AI Citability (72/100)

Measured across all 120 live content pages: **mean 51, median 60**. 37 pages (31%) are citation-ready (≥70); 34 pages (28%) are citation-unlikely (<30); **36 live pages have zero statistics and zero citations**.

The 72 reflects a bimodal corpus on an excellent technical substrate. The substrate lifts everything: 100% server-rendered static HTML, `FAQPage` JSON-LD with visible Q&A parity, `MedicalWebPage` with `reviewedBy`, a single canonical `#physician` node, and a visible credentialed byline. That is better than most academic medical centers.

**Strongest passages** — self-contained, attributed, quotable:
- *"Research shows that up to 80% of female athletes experience some urinary leakage during sport. Even about 40% of healthy women who have never been pregnant leak during vigorous exercise."*
- *"In the PRIDE study, women who lost about 8% of their body weight saw a 47% drop in weekly leakage episodes over 6 months."*
- *"A 2018 Cochrane review of 38 trials found that pelvic floor training during pregnancy reduced incontinence risk by 29% in the 3-6 months after birth."*
- The first-person `## How I think about the choice` sections: *"I do not see a pessary and surgery as competing. They are two valid endpoints."*

That last category is the durable moat. A named surgeon's decision framework attached to DOI-cited evidence is something Mayo Clinic and WebMD structurally cannot produce.

**Weakest, with rewrites:**

`/treatments/prolapse/watch-and-wait` (431 words, 0 stats, 0 refs) — *"For many women with pelvic organ prolapse, especially in mild cases, immediate treatment may not be necessary."*
→ *"Watchful waiting is appropriate for prolapse at or above the hymen (POP-Q stage 1–2) that causes no bother. Prolapse is not dangerous, so treatment is driven by symptoms rather than stage, and progression is slow enough that annual reassessment is usually sufficient."*

`/treatments/urinary-incontinence/neuromodulation` — *"Sacral neuromodulation can be a game-changer for patients with refractory overactive bladder."*
→ *"In the ROSETTA randomized trial, onabotulinumtoxinA reduced urgency incontinence by about 4 episodes per day versus about 3.3 for sacral neuromodulation over 6 months. Botox carried higher UTI risk; SNM requires an implanted device but allows a trial period first. (Amundsen et al., JAMA 2016)"*

`/treatments/comparisons` (155 w) and `/life-stages` (126 w) are a paragraph plus a Liquid loop — the entry points to the best content on the site offer AI engines nothing to lift.

### Brand Authority (41/100)

Higher than a typical private-practice physician because of a real academic footprint, but the entity is fragmented across four name forms and two cities.

**Present:** NPI 1922366061 (active, Green Bay, urogynecology taxonomy primary, updated 2026-03-18). Google Scholar — 43 publications, **236 citations, h-index 11**. Aurora BayCare directory page keyed by NPI. Doximity, Healthgrades, US News, WebMD — all four resolve and are already in `sameAs`. LinkedIn (~463 connections, unlinked; also blocks AI crawlers at HTTP 999, so it contributes little regardless). YouTube `@stuboo` (798 subscribers, anonymous). National media — Fortune, Medscape, Washington Post/The Lily — **all dateline Indianapolis**.

**Absent:** Wikipedia (API `totalhits: 0`; `/wiki/Ryan_Stewart` is a disambiguation page of footballers). **Wikidata — zero entities.** Reddit (unconfirmed; Reddit blocks the search agent). Review volume 26 total.

Live proof the schema investment works and the entity problem is real:
- **Local intent** → cited first, with his JSON-LD `knowsAbout` array quoted verbatim.
- **Clinical intent** ("pessary vs surgery… which is better") → **absent**; cited instead were Cleveland Clinic, Healio, PMC, and a content farm. His page on that exact question is objectively better than the content farm's.
- **Identity intent** → confidently answered "Indiana."

**Wikipedia is not realistically achievable and shouldn't be attempted** — the coverage is coverage *of a tweet*, which reads as WP:BIO1E, and a COI-flagged AfD is worse than nothing. **Wikidata has no comparable notability bar** and accepts professionals with verifiable external identifiers. He has ORCID, NPI, a Scholar ID, and an existing Google Knowledge Graph MID (`/g/11wtsgdryk`). That item is the highest-leverage entity fix available and takes about an hour.

### Content E-E-A-T (57/100)

| Dimension | Score | Basis |
|---|---|---|
| Experience | 15/25 | Excellent where present, but zero practice data, zero complication narratives, zero images; the entire `/treatments/` tree has no author voice |
| Expertise | 19/25 | Strongest axis — verifiable credentials, 23 papers + book chapter, genuinely nuanced mesh/anticholinergic/estrogen handling |
| Authoritativeness | 16/25 | Good identity cluster, but median citation year 2017, ~10 papers supply two-thirds of all references, 3 citation defects |
| Trustworthiness | 11/25 | **The weak axis** — C1 through C4 all land here |

**The site is two sites wearing one badge**, and the correlation is exact: **46 of 46** condition/treatment/life-stage pages lacking a real review date also have no `## References`. **67 of 67** pages carrying `last_evidence_review` have references.

| Signal | Reviewed (n=60) | Unreviewed (n=54) |
|---|---|---|
| Carries a concrete statistic | **38%** | 7% |
| First-person voice | **88%** | 56% |
| Third-person voice break | 3% | **50%** |
| AI-writing tells | **2%** | **40%** |

The review pipeline demonstrably works. It has covered 26% of files and stopped.

What's in the good 26% is rare on physician sites: `mesh-vs-non-mesh-sling.md` tells patients the thing they're never told (*"I make a cut on your lower belly, usually about 6 to 8 cm long"*). `pessary.md:120` describes using a pessary trial as a *diagnostic* to predict surgical benefit — a framework in no patient handout anywhere. `native-tissue-repair.md:53` states a named deviation from standard practice with its rationale (*"I don't give people lifting restrictions because the data shows that this does not improve surgical outcomes"*). `what-is-pelvic-floor-physical-therapy.md:83` publishes the *adherence* downside of PT.

### Technical GEO (76/100)

Unusually strong fundamentals: 100% server-side rendered (a deep condition page ships 1,474 words of body text with zero JS execution), 82ms TTFB on Fastly, HTML at 6.8KB gzipped, **zero `@font-face` rules** (pure system stack, no FOIT/FOUT), canonical + title + description on all 125 pages, all unique, max URL depth 3, and **zero broken internal links** across a full crawl of 127 unique targets.

robots.txt is 45 bytes — one `Sitemap:` line, the jekyll-sitemap default. With no `User-agent` group, every crawler is permitted. Verified behaviorally: GPTBot, ClaudeBot, and PerplexityBot user-agents each returned 200, no bot challenge, no rate limiting. **AI crawler access is 100/100 — no action needed.**

Leak probe of 17 internal paths came back clean (`/private/`, `/marketing/`, `/scripts/`, `/AGENTS.md`, `/faq.md.bak`, the CSV, etc. all 404).

The score is held down by C5 (HTTPS), C6 (old domain), H7 (dead redirects), H8 (lastmod), H12 (og:image/favicon), and M6 (mobile font).

**GitHub Pages constraints, verified rather than assumed:** `Cache-Control: max-age=600` on all assets, gzip-only (no brotli), no custom response headers, no `Link:` headers, no markdown content negotiation. None are configurable. Anyone recommending HSTS "in your config" on this stack is wrong — it needs Cloudflare in front or a move to Cloudflare Pages/Netlify.

### Schema & Structured Data (68/100)

All JSON-LD on all 11 sampled page types parses cleanly, is correctly escaped (`jsonify` works on FAQ text), uses absolute URLs, has no malformed dates, no deprecated types, and no dangling `@id` references. The `mwp_layouts` guard works — no page emits two `MedicalWebPage` nodes. The consolidation commit did what it claimed.

**What's right and must not regress:** one `@id` for the physician referenced identically from `reviewedBy` and `author` on every medical page; `identifier` as a `PropertyValue` with `propertyID: "NPI"`; seven high-quality `sameAs` targets; `lastReviewed` chained to match the visible byline so structured data and visible content agree.

**Correctly omitted:** `AggregateRating`/`Review` on `/testimonials`. Self-serving reviews have been ineligible for rich results since 2019; `Physician` is a `LocalBusiness` descendant so it's squarely in scope; the ratings are aggregated from third parties; and FTC 16 CFR 465 applies. **Keep it omitted.** The value is the outbound corroboration, not the markup.

Held down by H4 (procedures typed as conditions), H5 (Person properties on an Organization type), M7 (no BreadcrumbList), M8 (no entity grounding), M13.

### Platform Optimization (64/100)

| Platform | Score |
|---|---|
| ChatGPT Search | 74 |
| Google AI Overviews | 69 |
| Bing Copilot | 67 |
| Perplexity | 64 |
| Google Gemini | 48 |

**Strongest — ChatGPT (74):** zero crawler restrictions, static HTML, hard identifiers (NPI, ORCID, Scholar) that resolve the entity without needing Wikipedia. Content is exactly what it quotes: short declarative claims with DOI backing and a credentialed byline.

**Weakest — Gemini (48):** almost no Google-ecosystem surface. No Google Business Profile, no YouTube presence tied to the name, no Knowledge Panel, and no NAP anywhere on the site. Google Scholar is the only Google property in `sameAs`.

**Perplexity's ceiling is community validation (9/30):** zero Reddit presence, and Perplexity weights Reddit heavily for "who should I see for X" queries. This is the highest-leverage Perplexity action and the only one that moves that subscore.

**Realistic competitive read:** the content already clears the bar for the three winnable lanes — long-tail question queries, local queries, and comparison queries. What holds the score at 64 is not content quality. It is that the local lane, the most winnable of the three, has no local business identity for any platform to attach to.

---

## Quick Wins (Implement This Week)

1. **Delete both LLM chat artifacts** (`treatments/urinary-incontinence/index.md:54`, `treatments/fecal-incontinence/index.md:25`), then grep the corpus for similar. *Minutes. Removes the single most damaging thing on the site.*
2. **Remove `| default: page.last_modified_date`** from `author-card.html:7`, `medical-page-schema.html:9`, and `schema.html:124`. *Minutes. Ends a false medical-review attestation on 40 live pages.*
3. **Fix `pelvic-organ-prolapse.md:40`** — `2016-01-01` → `2026-01-01`. *One line, on the site's most important page.*
4. **Delete testimonial indices 4, 5, 7, 8** from `_data/testimonials.yml`; add `source:` + profile links to the rest. *Minutes. Closes FTC and medical-board exposure.*
5. **Fix "it lasts forever"** in `mesh-augmented-repair.md:21`. *Minutes. It is clinically false and the site contradicts it elsewhere.*
6. **Check Enforce HTTPS** in repo Settings → Pages; add a root `CNAME`. *Two minutes.*
7. **Add phone, address, and a booking link** to `_includes/location-cta.html` and a real `/contact` page, using the verified NPI record (2845 Greenbrier Rd Fl 4, Green Bay WI 54311; 920-288-8510). *Hours. Largest single point-gain available.*
8. **Add Aurora BayCare + LinkedIn to `sameAs`**; remove or correct the WebMD entry pointing at Louisville. *Minutes.*
9. **Add favicon links + `og:image`/`twitter:image`** to `head_custom.html`; copy `favicon.ico` to the repo root. *Minutes.*

## 30-Day Action Plan

### Week 1: Stop asserting things that aren't true

**Shipped 2026-08-30** — commits `e2bd224`, `c26b19f`, `aa5bdb1` on `main`, deployed and verified live.

- [x] Delete both LLM chat artifacts; grep corpus for `I apologize|As an AI|Here's the updated|You're absolutely|Certainly, I'll` — a second artifact turned up in `treatments/fecal-incontinence/index.md` beyond the one this report named; corpus rescan is now clean
- [x] Remove the `last_modified_date` fallback from all three includes — `/treatments/prolapse/pessary` went from a March 2026 badge to none; the 9 treatment pages that still show one all carry an explicit `last_evidence_review`
- [x] Fix the 2016 review date on the flagship prolapse page — set to `2026-03-15` to match every other explicitly reviewed page. **Confirm this is right**; if that page was never actually reviewed, delete the field instead so it makes no claim
- [x] Delete unsourced testimonials 4, 5, 7, 8 — 81 pages whose `testimonial_index` pointed past the end of the shortened list were remapped
- [ ] Attribute the 5 surviving testimonials — they still carry only `context: "Patient testimonial"`, no name or platform. Needs reconciling against the Google/Healthgrades exports
- [x] Fix the mesh "lasts forever" claim — replaced with the durability/exposure trade-off, consistent with what `robotic-vs-vaginal-repair` already tells patients
- [x] Add a COI disclosure to `/about` — states no financial relationships with any device or drug company
- [x] Pull `eclipse-device.md` — unpublished pending medical review; its one inbound link is delinked rather than deleted, and `llms.txt` no longer advertises it. Sitemap 125 → 124
- [x] Commit a root `CNAME`
- [ ] **Enable Enforce HTTPS** — repo Settings → Pages. Still off; `http://ryanstewart.com/` continues to serve 200 in cleartext

**Found while fixing, not in the audit above:** the testimonial snippet renders on *zero* pages, live and in build. `_includes/testimonial-snippet.html` uses `testimonials[include.index | default: 0]`, and Liquid does not support filters inside a bracket accessor, so the lookup always returns nil. The unattributed quotes were never actually displayed on clinical pages, which makes C3 a latent risk rather than a live one. The include was left broken on purpose: repairing it would *start* rendering unattributed testimonials on 156 pages. Fix it only after the attribution item above is done.

### Week 2: Become a findable local entity

**Mostly shipped 2026-08-30/31.** Reshaped by a constraint the audit did not
know: Ryan is an *employed* physician at Aurora BayCare. The practice NAP and
the Google Business Profile belong to his employer, so several items below were
written on a false premise and are struck rather than done.

- [x] Add the Aurora BayCare profile and LinkedIn to `sameAs` — commit `49314a8`. The AAH URL carries his NPI, making it the strongest available corroborator for Green Bay
- [x] Add publication byline forms to `alternateName` (`Stewart JR`/`Stewart R`/`Stewart J`) and `Urologic` to `medicalSpecialty` — commit `5f6ca51`
- [x] Point the scheduling CTA at the employer's booking page — commit `49314a8`. Reaches the homepage and 8 location pages only; the other ~115 pages still have no booking path
- [x] Fill out the ORCID record — done by Ryan 2026-08-31. Works 15 → 38, plus biography, 4 employments, 4 educations, 2 qualifications, 10 keywords, 4 websites
- [ ] **Correct the WebMD profile** — change request submitted 2026-08-30, still showing Louisville/Norton as of 08-31. `sameAs` vouches for it until it lands
- [ ] Claim or suppress the Yelp listing (Louisville/Norton) and correct Practo ("Fishers 46037")
- [ ] Create a Wikidata item — no Wikipedia notability bar, and ORCID + NPI + Scholar IDs all qualify. Highest-leverage remaining entity fix
- [ ] Add a channel description and site link to YouTube `@stuboo`
- [ ] **Decide** whether the practice phone and street address go on the site at all. Blocks `/contact` and any practice schema node
- ~~Create and verify a Google Business Profile~~ — not his to create; the employer owns it
- ~~Add `streetAddress`/`telephone`/`geo` to a `#practice` node~~ — predicated on owning the location; deferred behind the NAP decision above

### Week 3: Fix the machine-readable layer

**Shipped 2026-08-31 / 09-01**, except the two items that need Ryan's access.

- [x] Emit the right entity type on treatment pages — commit `43a3033`. Went further than the audit asked: `MedicalProcedure` (9), `MedicalTherapy` (8), `MedicalDevice` (1), and no `about` at all on 6 listing hubs. Zero procedures still typed as diseases
- [x] Root `@type` → `["IndividualPhysician", "Person"]`, recovering 5 silently-dropped E-E-A-T properties — commit `43a3033`
- [x] Add `BreadcrumbList` — 99 pages, verified page-by-page against the theme's rendered trail (99 exact matches, 0 mismatches)
- [x] Add `@id` to page and site nodes, switch raw interpolation to `| jsonify` — 0 dangling references sitewide
- [x] Add `ProfilePage` to `/about`, linked both directions with `#physician`
- [x] Fix sitemap `lastmod` — commit `8dbb558`. `jekyll-sitemap` reads `last_modified_at`; the site wrote `last_modified_date`. Renamed across 257 files. Coverage 7/124 → 131/131
- [x] Enforce: a page's modified date never predates its medical review date — 59 pages corrected
- [x] Restore the 16 dead legacy redirects — commit `72992da`. They were stranded on `published: false` pages, which emit no stub
- [x] Favicon and `/feed.xml` — commit `72992da`. Also site-wide `og:image`/`twitter:image` via a Jekyll default, and `meta referrer`
- [ ] **Implement the midwestpelvis.com wildcard 301** — needs DNS/hosting access. Still serving a live self-canonicalizing site competing for the same entity. Largest recoverable authority item on the list
- [ ] **Verify Bing Webmaster Tools**, then implement IndexNow. Bing indexes ~94 of 131 URLs and ChatGPT search rides that index. Try "Import from Google Search Console" first

### Week 4: Raise the content floor

- [x] Raise the mobile base font to 16px — commit `5ca33e4`. The theme's 500px breakpoint left every common phone at 14px
- [x] Fix the two `llms.txt` references that 404'd — resolved by commit `f929b17` publishing the pages they pointed at. All 19 links now return 200
- [ ] Mirror body statistics and study names into `faq:` answers across ~86 pages — the highest-leverage citability edit remaining. The FAQ block is what answer engines lift, and it is systematically less specific than the prose above it
- [ ] Add contextual internal links — still **13 in-body links across 104 condition and treatment pages**
- [ ] Rewrite the short meta descriptions — **46 of 103** live pages are under 120 chars, worst on the hub pages
- [ ] Extend `llms.txt` to cover the 9 comparison and 12 life-stage pages (currently 0 of each), and generate `llms-full.txt`
- [ ] Resolve the 7 cannibalizing page pairs by redirect
- [ ] **Run the review pipeline over the 35 live unreviewed pages**, `/treatments/` first — needs Ryan's medical judgment
- [ ] **Verify the 3 citation-integrity defects** against PubMed, and retire the 2019 OAB / 2017 SUI citations on the 20 pages still anchored to them — needs Ryan's medical judgment

### Found during implementation (not in the original audit)

Things the audit got wrong or missed, discovered while fixing it. Each was
verified against the live site.

- **A second LLM chat artifact.** The audit found one; there were two. `treatments/fecal-incontinence/index.md:25` also carried *"Certainly, I'll add the Eclipse device…"*. Both removed.
- **The testimonial snippet renders on zero pages.** `_includes/testimonial-snippet.html` uses `testimonials[include.index | default: 0]`, and Liquid does not support filters inside a bracket accessor, so the lookup always returns nil. The unattributed quotes were never actually displayed on clinical pages, which makes C3 a *latent* risk rather than a live one. **The include was left deliberately broken** — repairing it would start rendering unattributed testimonials on 156 pages. Fix it only after the 5 surviving quotes get `source:` attribution.
- **The favicon finding was half wrong.** The theme *was* emitting `<link rel="icon" href="/favicon.ico">`. Nothing was served at that path. The file, not the tag, was missing.
- **Seven pages were approved but never published.** All seven entries in `pseo-review-pipeline`'s `/api/pages` showed status `approved` while still carrying `published: false` — including the two comparison pages the audit rated highest-citability. **Worth checking whether approving in the review UI actually writes the flag**, or this recurs with every batch.
- **`locations/index.md` has a hardcoded region list.** The Liquid filters it against published pages, so a city missing from that string fails *silently* — its pages go live but are reachable only from the sitemap. Brillion hit this. Every future city needs a one-line addition there.
- **Comparison pages emit no `about`.** `_layouts/comparison.html` passes no entity key, so all 9 comparison pages have a `MedicalWebPage` with no subject. `snm-vs-botox-oab` is plainly about overactive bladder. One layout line plus frontmatter on 9 pages.
- **The `og:image` fix has a trap.** jekyll-seo-tag already emits `twitter:card`, so hand-writing the meta tags produces a *duplicate*. Set `image` as a Jekyll default in `_config.yml` instead and let the plugin emit all of it.
- **One theme file is now vendored.** `_includes/components/footer.html`, solely because the theme hardcodes `page.last_modified_date` and the sitemap fix renamed that key. Re-apply the single rename on any just-the-docs upgrade; a banner in the file says so.
- **The 5 surviving testimonials are still unattributed.** They carry only `context: "Patient testimonial"` — no name, no platform. Needs reconciling against the Google/Healthgrades exports.

### Deliberately not recommended
- **Do not publish the 128 gated location pages.** Quantified: 136 pages reduce to **32 distinct bodies**; 104 of 136 (76.5%) are byte-identical to another page after placeholder substitution; median page differs from its nearest sibling by **7–8 words out of ~337 (~2%)**; 444 FAQ items reduce to **13 distinct questions**. Genuinely local content is ~7–15 words per page, with zero hospital names, landmarks, highways, or referral partners anywhere. The complete diff between Chilton and Kewaunee urinary-incontinence pages is four words — even the drive time is identical. Either invest ~1,000 differentiated words per city (the Green Bay standard, which those two reviewed pages already demonstrate at 866–1,184 words with real citations), or cut to a single `/locations` service-area page. Thirty-four near-identical doorway pages on a physician domain risks the site-level quality signal the good 48% currently earns.
- **Do not pursue a Wikipedia article.** WP:BIO1E; a COI-flagged AfD is worse than nothing. Wikidata instead.
- **Do not add `AggregateRating` to `/testimonials`.** Ineligible, and it carries manual-action and FTC risk. The outbound links are the asset.

---

## Appendix: Pages Analyzed

125 live URLs from `sitemap.xml`, plus 141 unpublished source files reviewed locally.

| Section | Live | Gated | Notes |
|---|---|---|---|
| `conditions/` | 62 | 8 | 8 uterine-prolapse question pages gated |
| `treatments/` | 30 | 4 | Includes 7 of 9 comparison pages; `sling-vs-bulking-agents` and `snm-vs-botox-oab` 404 |
| `life-stages/` | 12 | 1 | Highest review coverage (85%), best readability |
| `locations/` | 9 | 128 | Only Green Bay + Appleton live |
| `_posts/` | 7 | 0 | 15 months stale |
| root pages | 6 | 0 | `index`, `about`, `research`, `blog`, `testimonials`, `privacy-policy` |
| **Total** | **126** | **141** | |

**Highest-issue live pages:**

| URL | Issues |
|---|---|
| `/treatments/urinary-incontinence` | LLM artifact; false review badge; no refs; no FAQ |
| `/treatments/fecal-incontinence` | LLM artifact; false review badge; no refs; no FAQ |
| `/treatments/prolapse/mesh-augmented-repair` | False "lasts forever" claim; unsourced 2–5% figure; false review badge; no refs |
| `/conditions/pelvic-organ-prolapse` | 2016 review date, visible and in JSON-LD |
| `/treatments/prolapse/pessary` | `MedicalCondition: "Pessary"`; false review badge; conflicting 90%/92% figures; no refs |
| `/treatments/fecal-incontinence/eclipse-device` | Reads as vendor copy; 5 unsourced favorable figures; no COI disclosure |
| `/conditions/prolapse/rectocele` | Longest page on the site (2,666 w) with zero references |
| `/testimonials` | 4 of 9 quotes appear on no platform |

**Fetch failures:** none. All 125 sitemap URLs resolved; the only 404s encountered were the 16 dead legacy redirects and 4 unmapped URLs listed in H7, plus `/favicon.ico`, `/feed.xml`, `/indexnow.txt`, and `llms-full.txt`.

**Tooling note:** the `healthcare-citations` MCP server failed to connect this session, so the three citation-integrity defects in H9 were verified as internal contradictions in-repo but could not be checked against PubMed.

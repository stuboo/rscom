# GA4 setup and analysis plan — ryanstewart.com

**Property:** measurement ID `G-1LYFEX7C2D`, set in `_config.yml:89` as `ga_tracking`
**Account:** jryanstewart@gmail.com
**Written:** 2026-08-31. UI paths verified against Google's current documentation
on that date; GA4's admin UI moves often, so if a path is wrong the section
heading still tells you what you're looking for.

Two separate goals, and they need doing in this order:

1. **Measure the booking CTA** so "how many patients did my site send to Aurora
   BayCare" is one number. Must be set up *before* the CTA expands, because
   custom dimensions are not retroactive.
2. **Find which pages draw local audiences**, so the CTA goes on the pages where
   Wisconsin and UP readers actually land instead of all 124.

---

## Part 1 — Grant API access (blocks everything in Part 7)

The analysis agent has no access to the property, so it pulled zero numbers. Its
report script is written and will run the full set the moment this lands.

1. https://analytics.google.com → **Admin**
2. Select the property whose web stream is `G-1LYFEX7C2D`
3. **Property access management** → **+** → **Add users**
4. Email: `ga4-reader@oslr-ai.iam.gserviceaccount.com`
5. Role: **Viewer**
6. **Uncheck "Notify new users by email"** — service accounts can't receive mail
   and the invite will bounce

Alternative if you'd rather not share the property with a service account:

```bash
gcloud auth application-default login \
  --scopes=https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/cloud-platform
gcloud auth application-default set-quota-project oslr-ai
```

Either path unblocks the whole analysis.

---

## Part 2 — Confirm Enhanced Measurement is on

This is what generates the click event in the first place. No code change needed.

**Admin → Data collection and modification → Data streams →** *(select the web
stream)* **→ Enhanced measurement**

Confirm the toggle is on, then open the gear icon and confirm **Outbound clicks**
specifically is enabled. Requires Editor or above on the property.

When on, GA4 automatically collects `page_view`, `scroll`, `click` (outbound),
`view_search_results`, `file_download`, `form_start`, `form_submit`, and the
YouTube video events.

**The outbound click event:**

| | |
|---|---|
| Event name | `click` |
| Parameters | `link_url`, `link_domain`, `link_classes`, `link_id`, `outbound` |

Note the event is named `click`, not `outbound_click`. That matters in Part 5.

---

## Part 3 — Verify it actually fires (5 minutes, do this today)

Don't trust the toggle. Confirm the event.

1. Open https://ryanstewart.com/?debug_mode=true in Chrome
   *(or use Google Tag Assistant at https://tagassistant.google.com)*
2. In GA4: **Admin → Data display → DebugView**
3. Select your device in the debug device dropdown
4. On the site, click **"Schedule through Aurora BayCare"**
5. Watch for a `click` event in the Seconds stream. Open it and confirm
   `link_url` contains `aurorabaycare.com` and `outbound` is `true`

If no `click` event appears, Enhanced Measurement's outbound-clicks toggle is off
and Part 2 wasn't done. Nothing downstream works until this fires.

**Faster smoke test:** Realtime (**Reports → Realtime**) will show the event
count without the debug parameter, but won't show you the parameters. DebugView
is the one that proves `link_url` is populated.

---

## Part 4 — Register `link_url` as a custom dimension

GA4 *collects* `link_url` but does not make it available in standard reports
until you register it. This is the step people skip, then conclude tracking is
broken because the reports look empty.

**Admin → Data display → Custom definitions → Create custom dimension**

| Field | Value |
|---|---|
| Dimension name | `Link URL` |
| Scope | **Event** — cannot be changed after saving |
| Description | `Destination URL of an outbound link click` |
| Event parameter | `link_url` — cannot be changed after saving |

**Constraints worth knowing before you click save:**

- **Not retroactive.** Data flows from creation forward only. This is the reason
  to do it before expanding the CTA.
- **24–48 hours** before it appears in standard reports.
- **50 event-scoped dimensions** on a standard property, and if you hit the cap
  you must wait 48 hours after deleting one before adding another. You are
  nowhere near this, but scope and parameter are permanent, so get them right.

Explorations can already break down by `link_url` without registering it. The
registration buys you standard reports and Looker Studio.

---

## Part 5 — Create `booking_click` as a key event

**Do not mark the raw `click` event as a key event.** It fires on every outbound
link on the site — LinkedIn, Doximity, NPI registry, and all 274 DOI citations in
the references sections. The number would be meaningless.

Create a narrower event instead. No code deploy required.

**Admin → Data display → Events → Create event → Create**

| Field | Value |
|---|---|
| Custom event name | `booking_click` |
| Condition 1 | `event_name` **equals** `click` |
| Condition 2 | `link_url` **contains** `aurorabaycare.com` |
| Mark as key event | **on** |
| Counting method | **Once per event** (every click counts, not one per session) |

"Create" copies the matching event into a new one and leaves `click` intact.
"Modify" would overwrite it — don't use Modify here.

Also not retroactive: `booking_click` starts existing the moment you save it.

After this, "how many people did my site send to booking" is a single key-event
count you can quote in a conversation with your CMO.

---

## Part 6 — Should you add an explicit gtag event to the button?

**Recommendation: no, not yet.**

Enhanced Measurement's automatic `click` event already captures everything you
need on a static site, and it survives you editing the markup. A hand-written
`gtag('event', ...)` on the button adds a second source of truth that can drift
out of sync with the automatic one, and on GitHub Pages it means an inline
script in a Liquid include that has to stay correct across theme upgrades.

Revisit if either of these becomes true:

- You want to distinguish *which page* the booking click came from with more
  precision than `page_location` gives you
- Enhanced Measurement's automatic click stops firing for some reason (some ad
  blockers and some `target="_blank"` handling can interfere)

If you do add one later, the markup is a `data-` attribute plus a delegated
listener rather than an inline `onclick` on every button — ask and I'll write it.

---

## Part 7 — The analysis to run once access lands

These are the questions that decide where the CTA goes.

**Q1. Top 25 pages by pageviews, last 12 months.** The baseline. Expect this list
to be dominated by national traffic — "what is a cystocele" pulls readers from
everywhere.

**Q2. The same list restricted to Wisconsin + Michigan.** This is the one that
matters. It will differ substantially from Q1, and it is the list the CTA should
follow.

**Q3. Sessions by city for WI + MI, sitewide.** Not filtered to location pages.

> **Important correction to the original plan.** Comparing GA4 city traffic
> against the 34 cities in `_data/locations.yml` does not work, because **32 of
> those 34 cities are `published: false`.** 136 location pages exist in source;
> only 8 are built (Appleton ×4, Green Bay ×4). Zeros for the other 32 would be a
> publishing decision showing up as a demand signal, not evidence of no demand.
>
> The useful version is sessions by city across the *whole site*, regardless of
> landing page. That shows which unpublished cities already have an audience
> finding you through condition and treatment pages — which is the actual
> argument for publishing those pages and giving them a CTA.

**Q4. Existing outbound clicks to aurorabaycare.com.** Expect ~0: the CTA shipped
2026-08-30 in commit `49314a8`, and no click instrumentation existed before that.
This is a baseline, not a measurement.

**Q5. Traffic trend and acquisition channel over time** (organic / direct /
referral), plus the queries driving local traffic if available.

---

## Part 8 — Why the order matters

```
Part 1 (access)  ─────────────────► Part 7 (analysis) ──► decide CTA page list
Part 2 (enhanced measurement)
   └─► Part 3 (verify) ──► Part 4 (dimension) ──► Part 5 (key event)
                                    └─► 24-48h lag ──► expand CTA, measurably
```

Parts 2–5 are independent of Part 1 and can be done today. Do them **before**
expanding the CTA past its current 9 pages, so the rollout is measurable from day
one instead of retroactively unmeasurable.

---

## Current state, for reference

**Site inventory** (source vs. built — the gap matters for any analysis):

| Section | In source | Live |
|---|---|---|
| conditions | 70 | 62 |
| treatments | 34 | 29 |
| life-stages | 13 | 12 |
| locations | 137 | 9 |
| posts | 7 | 7 |
| **total content** | | **~120** (124 URLs in sitemap) |

**Booking CTA is on exactly 9 pages:** the homepage, plus Appleton ×4 and Green
Bay ×4. Verified against built output. It renders from
`_includes/location-cta.html` (location layout only) and `index.md`, with the URL
held once in `_config.yml` as `site.booking_url`:

```
https://www.aurorabaycare.com/doctors/j-ryan-stewart-1922366061?patient_type=new_patient
```

**No click instrumentation in the repo.** No `gtag('event', ...)`, no listeners,
no `dataLayer` in `_includes/` or `_layouts/`. Whatever click data exists comes
from Enhanced Measurement alone.

**Tracking install is correct.** `G-1LYFEX7C2D` renders on all live pages via the
just-the-docs theme at
`vendor/bundle/ruby/*/gems/just-the-docs-0.10.0/_includes/head.html:25`. There
should be real history to pull once access lands.

---

## Checklist

- [ ] **Part 1** — grant `ga4-reader@oslr-ai.iam.gserviceaccount.com` Viewer access
- [ ] **Part 2** — confirm Enhanced Measurement + outbound clicks are on
- [ ] **Part 3** — verify a `click` event fires with `link_url` in DebugView
- [ ] **Part 4** — register `Link URL` / event scope / `link_url`
- [ ] **Part 5** — create `booking_click`, mark as key event
- [ ] **Part 7** — run Q1–Q5, decide the CTA page list
- [ ] Expand the CTA to the pages Q2 identifies

---
layout: page
title: Areas We Serve
nav_order: 6
description: "Dr. Ryan Stewart provides urogynecological care to patients across Northeast Wisconsin and Michigan's Upper Peninsula. Find care near you."
permalink: /locations
has_children: false
---

# Areas We Serve

Dr. Ryan Stewart provides expert urogynecological care to women across **Northeast Wisconsin** and **Michigan's Upper Peninsula**. Whether you're nearby in the Fox Valley or joining us from the UP, we offer flexible options to make specialist care accessible.

## Our Practice

Dr. Stewart's office is located in **Green Bay, Wisconsin**, where he divides his time between office consultations and surgical procedures. For patients who live farther away, **telehealth consultations** are available for initial evaluations and follow-up visits.

<!-- City links are generated from published location pages. A city appears only once at least one of its pages clears medical review; each links to that city's urinary-incontinence page (or its first published page). A region heading is hidden entirely when none of its cities are live yet. -->
{%- assign regions = "Northeast Wisconsin=green-bay;Green Bay;Home practice|appleton;Appleton;30 minutes|oshkosh;Oshkosh;50 minutes|fond-du-lac;Fond du Lac;1 hour|manitowoc;Manitowoc;45 minutes|sheboygan;Sheboygan;1 hour##Michigan's Upper Peninsula=marquette;Marquette;3 hours (telehealth available)|escanaba;Escanaba;2 hours (telehealth available)|menominee;Menominee;1 hour 15 minutes|iron-mountain;Iron Mountain;2 hours (telehealth available)" | split: "##" -%}
{%- for region in regions -%}
  {%- assign region_parts = region | split: "=" -%}
  {%- assign region_name = region_parts[0] -%}
  {%- assign cities = region_parts[1] | split: "|" -%}
  {%- capture items -%}
    {%- for city in cities -%}
      {%- assign c = city | split: ";" -%}
      {%- assign city_pages = site.pages | where: "location_slug", c[0] -%}
      {%- if city_pages.size > 0 -%}
        {%- assign target = city_pages.first -%}
        {%- for cp in city_pages -%}{%- if cp.condition_slug == "urinary-incontinence" -%}{%- assign target = cp -%}{%- endif -%}{%- endfor -%}
  <li><a href="{{ target.url }}">{{ c[1] }}</a> — {{ c[2] }}</li>
      {%- endif -%}
    {%- endfor -%}
  {%- endcapture -%}
  {%- assign trimmed = items | strip -%}
  {%- if trimmed != "" %}

## {{ region_name }}

<ul>
{{ items }}
</ul>
  {%- endif -%}
{%- endfor %}

## Conditions We Treat

No matter where you're located, Dr. Stewart provides expert care for:

- **[Urinary Incontinence](/conditions/urinary-incontinence)** — Stress, urge, and mixed incontinence
- **[Pelvic Organ Prolapse](/conditions/pelvic-organ-prolapse)** — Uterine, bladder, and rectal prolapse
- **[Overactive Bladder](/conditions/overactive-bladder)** — Urgency, frequency, and nocturia
- **[Fecal Incontinence](/conditions/fecal-incontinence)** — Accidental bowel leakage

## Getting Started

- **No referral necessary** — you can schedule directly
- **Telehealth available** — start your care from home
- **Most insurance accepted** — Wisconsin and Michigan plans
- **New patients welcome**

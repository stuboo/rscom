---
last_modified_at: 2026-05-29
layout: page
title: Areas We Serve
nav_order: 6
description: "Dr. Ryan Stewart provides urogynecological care to patients across Northeast Wisconsin and Michigan's Upper Peninsula. Find care near you."
last_evidence_review: 2026-11-05
permalink: /locations
has_children: false
---

# Areas we serve

I'm a fellowship-trained urogynecologist in Green Bay, Wisconsin, and I see women from across Northeast Wisconsin and Michigan's Upper Peninsula. Some patients live 15 minutes away in the Fox Valley. Others drive three or more hours from the UP. Telehealth visits are available.

## My practice

My office is in Green Bay, Wisconsin. I split my week between clinic visits and surgery. If you live farther away, we can do your first consultation and many follow-up visits by telehealth. You'll still need to come in for a pelvic exam, bladder testing, or a procedure, and we'll try to group those into as few trips as we can.

<!-- City links are generated from published location pages. A city appears only once at least one of its pages clears medical review; each links to that city's urinary-incontinence page (or its first published page). A region heading is hidden entirely when none of its cities are live yet. -->
{%- assign regions = "Northeast Wisconsin=green-bay;Green Bay;Home practice|appleton;Appleton;30 minutes|brillion;Brillion;30 minutes|oshkosh;Oshkosh;50 minutes|fond-du-lac;Fond du Lac;1 hour|manitowoc;Manitowoc;45 minutes|sheboygan;Sheboygan;1 hour##Michigan's Upper Peninsula=marquette;Marquette;3 hours (telehealth available)|escanaba;Escanaba;2 hours (telehealth available)|menominee;Menominee;1 hour 15 minutes|iron-mountain;Iron Mountain;2 hours (telehealth available)" | split: "##" -%}
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

## Conditions I treat

Wherever you live, I treat:

- [Urinary incontinence](/conditions/urinary-incontinence): stress, urge, and mixed incontinence
- [Pelvic organ prolapse](/conditions/pelvic-organ-prolapse): uterine, bladder, and rectal prolapse
- [Overactive bladder](/conditions/overactive-bladder): urgency, frequency, and getting up at night to urinate
- [Fecal incontinence](/conditions/fecal-incontinence): accidental bowel leakage

## Getting started

- You don't need a referral. You can schedule directly.
- Telehealth visits let you start care from home.
- Most insurance plans are accepted. Your plan may have its own rules about out-of-state or specialist visits, so check with them before your first appointment.
- New patients are welcome.

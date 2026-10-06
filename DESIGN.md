# Template and Builder design direction

## 1. Purpose
Extend the Home's clear, restrained visual language to template selection and editing. Preserve the identity and functions of each storefront.

## 2. Typography
Use the platform sans serif in the library, balanced headings, readable descriptions and a consistent hierarchy. Preserve existing luxury storefront serif treatments. Mobile headings use a controlled clamp and wrap long business names.

## 3. Color
Use neutral platform surfaces and one blue action color. Support the existing light and dark themes. Storefront accent, background and button ink remain driven by each template or saved business configuration.

## 4. Layout
Desktop selection has a compact category rail and a two-column card grid. Below 768px both become a single column. Shared storefront sections stack on phones; headers separate branding/menu from language and business actions.

## 5. Components
Keep category filtering, localized descriptions, demo and Builder links. Controls have at least 44px touch targets and visible keyboard focus. Device buttons expose their selected state. Template demo creation links preserve the selected slug.

## 6. Motion
Use subtle border feedback without moving cards or adding decorative effects. Respect reduced motion. Preserve the existing Home video and interactive scroll, which are outside this change.

## 7. Implementation and validation
TemplateLayout remains the single renderer for demo, Builder iframe and live storefront. StorefrontPreview measures its container before paint and keeps isolated device dimensions. Default Builder device follows the initial screen width; manual switching remains available. Verify layout and data/feature gates across all templates, plus browser checks for narrow screens, localization, template selection and preview sizing. Use a separate branch and Netlify preview for review; do not publish production.

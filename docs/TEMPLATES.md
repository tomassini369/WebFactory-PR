# WebFactory — Templates Library

The public design library is called **Templates**. "Demo" is legacy terminology and must not be used in customer-facing UI, portals, production packages, or new backend records.

## Canonical routes

- Library: `/templates`
- Template preview: `/templates/{templateSlug}`
- Builder selection: `/builder?template={templateSlug}`
- Legacy `/demos/{templateSlug}` routes may remain only as backward-compatible aliases. Do not link to them in new UI.

## Design modes

- `template_base`: a prefabricated WebFactory Template is selected.
- `custom`: the customer uses the flexible Custom builder.
- New records use `preserveTemplateStructure`.
- Legacy `demo_base`, `preserveDemoStructure`, and `/demos/` values are normalized when read.

## Template groups

- Food & Hospitality
- Beauty & Wellness
- Automotive
- Home & Property Services
- Events & Entertainment
- Professional Services
- Retail & Creative
- Care Services

The category groups are defined in `src/demoData.ts` through `templateGroups`. The internal filename is retained for compatibility, but the product terminology is Templates.

## Template behavior

Each Template can define its own photography, palette, content, catalog, employees, booking configuration, and enabled functions. Template preview content is sample content only.

When a customer uses a Template:

1. The Template supplies the base structure and visual composition.
2. Customer branding, Hero, gallery, catalog images, copy, services, employees, schedules, and settings replace sample content.
3. Customer images have priority. Template photography is fallback/sample content.
4. The selected Template is stored with `templateSlug`, `templateName`, `templateCategory`, `templateRoute`, and `preserveTemplateStructure`.
5. Client and WebFactory admin portals display the canonical Template information.

## Preview behavior

Template previews may simulate cart, checkout, booking, deposits, employee selection, and availability. Preview interactions never create a real charge, booking, email, calendar event, or slot reservation.

## Photography

Template photography is cached into the WebFactory deployment at build time and served from `/demo-images/` for technical backward compatibility. Customer-facing terminology remains Templates.

## Custom mode

Custom is not a Template. It supports the flexible layout system and section ordering defined in the Builder.

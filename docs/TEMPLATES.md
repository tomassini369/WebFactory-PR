# WebFactory — Templates Library

The official design library is called **Templates**.

## Canonical routes

- Library: `/templates`
- Template preview: `/templates/{templateSlug}`
- Builder selection: `/builder?template={templateSlug}`

## Design modes

- `template_base`: a WebFactory Template is selected.
- `custom`: the customer uses the flexible Custom builder.
- Template records use `preserveTemplateStructure`.

## Template groups

- Food & Hospitality
- Beauty & Wellness
- Automotive
- Home & Property Services
- Events & Entertainment
- Professional Services
- Retail & Creative
- Care Services

## Template behavior

Each Template can define its own photography, palette, content, catalog, employees, booking configuration and enabled functions. Preview content is sample content only.

When a customer uses a Template:

1. The Template supplies the base structure and visual composition.
2. Customer branding, Hero, gallery, catalog images, copy, services, employees, schedules and settings replace sample content.
3. Customer images have priority over sample photography.
4. The selected Template is stored with `templateSlug`, `templateName`, `templateCategory`, `templateRoute` and `preserveTemplateStructure`.
5. Client and WebFactory admin portals display the canonical Template information.

## Preview behavior

Template previews may simulate cart, checkout, booking, deposits, employee selection and availability. Preview interactions never create a real charge, booking, email, calendar event or slot reservation.

## Custom mode

Custom is not a Template. It supports the flexible layout system and section ordering defined in the Builder.

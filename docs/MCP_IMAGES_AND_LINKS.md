# MCP images and public business addresses

Existing OAuth roles, tenant boundaries and `webfactory.read` / `webfactory.execute` scopes remain unchanged. No provider generation or paid credits are involved.

## Change a public address

Use `wf_update_slug` with `input.value` containing the new slug and a new UUID `requestId`. Platform administrators also select `siteId`; tenant connections use their fixed business. The existing public-address service validates reserved names, claims availability atomically, checks the business revision and retains old links as aliases. A name change and a public-address change are separate operations.

## Assign a photograph to a product or service

1. Obtain an actual local image file. Compute its byte length and SHA-256 without placing file bytes in model context.
2. Call `wf_prepare_image_upload` with a new `requestId`, filename, MIME type, byte length and checksum.
3. The client transfers **raw bytes** with PUT to the returned short-lived capability URL, using the declared Content-Type. Do not forward the WebFactory OAuth bearer, pass base64 into MCP or fetch arbitrary remote image URLs on the server.
4. Inspect `wf_image_upload_status` if the transfer outcome is uncertain. PUT is single-use; do not replay it.
5. Call `wf_finalize_image_upload` with the upload ID, a new request ID and `target: {kind: "catalog", itemId: "existing-item-id"}`. The current catalog is preserved and only that item's photo changes. Check `verified` before claiming success.

The upload endpoint accepts PNG, JPEG or WebP up to 4 MiB. It verifies byte count and checksum, decodes the image with a pixel limit, strips embedded metadata and produces an optimized WebP up to 1600 pixels on either side. Authorization and current membership are checked again before storage and assignment. Capability URLs expire after ten minutes and are bound to one grant, user, business and exact image. They must never be included in user-facing text, screenshots or logs.

Read-only connections do not receive image writers or the slug writer. Status returns no upload capability. Invalid, expired, revoked or already-used uploads fail closed. An uncertain attachment returns a state requiring review rather than silently repeating the mutation.

**Client limitation:** adding MCP tools does not itself give ChatGPT permission or a transport to read a local image file. The host/client must support raw file transfer to the prepared URL. If that is unavailable, report the limitation and use the authenticated portal's existing upload flow. Do not report an image as uploaded solely because it was generated or an upload URL was prepared.

Production publishing and tool-catalog availability must be verified separately. This change does not activate Stripe/ATH, generate images, rename a business automatically or modify any particular customer's public address.

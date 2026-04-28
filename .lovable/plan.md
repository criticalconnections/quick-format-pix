## Goal

Stop the recurring `ERR_LIBHEIF format not supported` failures by replacing the abandoned `heic2any` (last release 2020, libheif ~1.10) with the actively maintained `heic-to` package, which ships **libheif 1.21.2** — the version that fixed support for modern iPhone HEICs (10-bit HEVC, newer ftyp brands like `heix`, etc.).

## Why `heic-to` over raw `libheif-js`

Both wrap the same underlying WASM. `heic-to`:
- Has the same `{ blob, type, quality }` API shape we already use, so `fileToBitmap` barely changes.
- 0 runtime deps, ~21MB unpacked (WASM), MIT-compatible LGPL-3.0 license (acceptable for a browser-only tool).
- Provides `isHeic(file)` we can use to confirm format before invoking the heavy decoder.
- Has a `heic-to/next` entry point for web workers if we want to offload later.

Raw `libheif-js` would also work but requires us to write the canvas blit / decode loop ourselves; no benefit for this use case.

## Changes

### 1. Dependencies
- `bun add heic-to`
- Keep `heic2any` installed for now as a fallback (one more retry attempt if `heic-to` itself throws). Once we've confirmed the new decoder works on the user's failing files we can drop `heic2any` in a follow-up.

### 2. `src/lib/imageConvert.ts` — new decoder pipeline

Refactor `fileToBitmap` so the HEIC branch tries decoders in order and only marks the file non-retryable after all of them fail:

```text
validateAndNormalize(file)          // unchanged: sniff magic bytes, fix MIME
   │
   ▼
isHeicMime || extLooksHeic ?
   │
   ├─ try heic-to → heicTo({ blob, type: "image/png", quality: 1 })
   │     └─ on success: createImageBitmap(png) → return
   │
   ├─ on failure: try heic2any (legacy, may handle some edge files)
   │
   └─ on failure: throw ConversionError(non-retryable, friendly message
                  including BOTH decoder errors so the Debug panel is useful)
```

Key implementation notes:
- Lazy `import("heic-to")` inside the function (same pattern as current `heic2any` import) to keep it out of SSR.
- Capture each decoder's raw error message and join them: `heic-to: <msg> | heic2any: <msg>`. This becomes the `decoderError` shown in the Debug panel, so we can finally see what `heic-to` says about these specific files.
- Keep the existing `ConversionError` / `isNonRetryableConversionError` plumbing — only the inner decode logic changes.
- Keep `validateAndNormalize`, `gatherDebug`, `sniffMime`, etc. exactly as-is.

### 3. `src/components/Converter.tsx`
No structural changes. The Debug panel already renders `decoderError`; it'll automatically show the combined message from the new pipeline. The retry loop / non-retryable break logic is unchanged.

### 4. Vite / bundling
`heic-to` ships a WASM file. `@cloudflare/vite-plugin` + Vite 7 already handle `?url` / asset imports for WASM via the package's own loader (the package resolves its WASM with `new URL(..., import.meta.url)`). No `vite.config.ts` change expected; if the dev server complains about an unbundled WASM asset I'll add it to `optimizeDeps.exclude` for `heic-to` (standard recipe for libheif-js-based packages).

### 5. Verification
After the patch I'll:
1. Confirm the build passes (harness runs it automatically).
2. Ask the user to retry one of the failing files (e.g. `IMG_8601.HEIC`) and open the Debug panel — we'll now see either a successful conversion or a precise libheif 1.21 error message instead of the generic libheif 1.10 "format not supported".

## Files touched
- `package.json` (via `bun add heic-to`)
- `src/lib/imageConvert.ts` (decoder pipeline only)

No DB, no routes, no UI changes.
# TOOLSHED

> Tiny tools. Big attitude.

A collection of dumb-simple browser tools that don't waste your time. Convert HEICs,
extract palettes, generate passwords, scrub EXIF, encode base64, forge favicons.
Everything runs **in your browser** — no uploads, no accounts, no 14-day trials that
quietly renew at $79/mo.

![TOOLSHED — Tiny tools, big attitude.](docs/screenshots/home.png)

---

## The tools

### 01 / Witness Protection — HEIC convert

Apple's proprietary HEIC files get a brand-new identity. Bulk-convert to JPG, PNG,
or WEBP without uploading a single byte. Falls back through `heic-to` (libheif 1.21)
to `heic2any` (libheif 1.10) so the long tail of weird HEICs still decodes.

![Witness Protection — HEIC converter](docs/screenshots/imgconvert.png)

### 02 / Color Heist — palette extractor

Drop a photo. Walk away with its dominant swatches plus complementary, analogous,
triadic, and monochrome palettes. K-means clustering in OKLab so the swatches match
what you'd actually call "the colors of this photo."

![Color Heist — palette extractor](docs/screenshots/colors.png)

### 03 / Password Factory — generator

Crank out passwords with toggles for length, symbols, ambiguous characters, and
bulk batches. The kind of passwords your bank wishes you used. Strength meter
included.

![Password Factory — password generator](docs/screenshots/passwords.png)

### 04 / Getaway Driver — image compressor

Bulk image compressor that doesn't ask where you're going. Drop your files, pick
how clean you want the cut, drive off with something a fraction of the original
size. Quality stays suspiciously intact.

![Getaway Driver — image compressor](docs/screenshots/compress.png)

### 05 / The Fence — QR code generator

Move anything anywhere. URL, raw text, or WiFi credentials → a QR code nobody can
trace back. Custom colors, error correction, PNG or SVG out the door.

![The Fence — QR code generator](docs/screenshots/qr.png)

### 06 / The Alibi — EXIF stripper

Strip EXIF, GPS coordinates, camera fingerprints, and timestamps from your JPGs
and PNGs. Plausible deniability, one drop at a time. The photo stays. The receipts
don't.

![The Alibi — EXIF stripper](docs/screenshots/strip.png)

### 07 / Shell Company — base64 encoder/decoder

Encode or decode text and files through base64 with zero paper trail. Drop a file,
get a clean data URL out the back door. Decode someone else's and pretend you
didn't.

![Shell Company — base64 encoder/decoder](docs/screenshots/base64.png)

### 08 / The Forger — favicon generator

Forge a complete favicon set from any image — every size browsers ask for, plus a
multi-resolution ICO, all packed in a zip. Your site will look like it's been
around for years.

![The Forger — favicon generator](docs/screenshots/favicon.png)

---

## Self-hosting

> Pull TOOLSHED off the grid and onto your own box. One script, two flavors —
> Docker for the clean getaway, or bare-metal bun if you like to feel the pavement.

![Safe House — self-hosting docs](docs/screenshots/docs.png)

```bash
git clone https://github.com/criticalconnections/toolshed.git
cd toolshed
./install.sh docker         # containerized, port 8665
# or
./install.sh self-hosted    # bare-metal bun
./install.sh stop           # tear down the docker container
```

Same tools. Same attitude. 100% local, zero telemetry.

---

## Development

[Bun](https://bun.sh) is the package manager. Vite handles the dev server (with
the Cloudflare Workers runtime emulated via `@cloudflare/vite-plugin`).

```bash
bun install
bun run dev        # vite dev server
bun run build      # production build (Cloudflare Workers bundle)
bun run preview    # preview the built bundle
bun run lint       # eslint
bun run format     # prettier
```

### Stack

- **TanStack Start** with file-based routing in `src/routes/`
- **React 19**, **Vite 7**, **Tailwind v4**
- **shadcn/ui** (`new-york` style) under `src/components/ui/`
- **Cloudflare Workers** as the production target (the "server" is a Worker that
  ships the SSR shell — all logic runs in the browser)

### Adding a tool

Tools are top-level routes (`src/routes/<tool>.tsx`). Register the new route both
as a route file and in the `TOOLS` array in `src/routes/index.tsx` so it shows up
on the landing page.

See [`CLAUDE.md`](CLAUDE.md) for the full architectural rundown.

---

## License

MIT. Built with spite & semicolons.

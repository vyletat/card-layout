# Card Layout

A browser app for typesetting your own playing cards onto printable sheets — so that when you print
duplex and flip the paper, **every back lands exactly on top of its front**.

Everything runs on the client. There is no server, no account and no upload: your artwork and projects
stay in the browser's own storage, and output goes through the print dialog or a PDF generated locally.

## The problem it solves

Printing double-sided cards by hand is easy to get wrong. The backs have to be placed in mirrored grid
positions, the mirroring depends on which edge your printer flips along, and even then most printers put
the second side down a fraction of a millimetre off. Card Layout handles all three: it lays out the
sheet, remaps the back cells for your flip mode, and lets you calibrate the offset, scale and rotation
of the back page until the two sides line up on your printer.

## Features

**Sheet layout**
- A4, A3, Letter or a custom paper size, portrait or landscape
- Card presets for the common formats (poker, bridge, US/Euro standard, mini, tarot, square) or any size
  you type in
- Bleed, gutters, corner radius, crop marks, corner registration marks and printed card numbers
- A safe-margin guide showing how far artwork must stay from the trim edge
- Ready-made templates (e.g. poker on A4 with bleed and crop marks) as a starting point

**Editor**
- Canvas preview at true scale with pan, zoom and a front/back toggle
- Frame each image inside its cell: drag, scale, rotate, nudge with the arrow keys, lock the aspect ratio
- Lock a finished card so it can't be nudged by accident
- Undo/redo for framing changes
- A warning when an image's effective print resolution drops below 300 DPI — checked on both sides

**Images and cards**
- Drag-and-drop upload, with automatic front/back pairing based on file names
- An image library and card manager for assigning sides, renaming, reordering and setting copy counts
- One shared back for the whole deck, framed once and reused by every card that has no back of its own
- CSV import for decks maintained in a spreadsheet (name, front, back, count — headers in any of the four
  supported languages)

**Duplex and calibration**
- Short-edge or long-edge flip; the back sheet's cells are remapped accordingly
- A printable calibration sheet with reference marks for measuring your printer's misregistration
- Offset, per-axis scale and rotation corrections applied to the whole back page, marks included

**Output**
- Print directly from the browser at exact millimetre size
- Or download a PDF, generated locally with pdf-lib
- Print or export both sides, only fronts, or only backs — which is what makes manual duplex on a
  single-sided printer practical

**Everything else**
- Projects and images persist in IndexedDB and save themselves as you work
- Multiple projects, each owning its own image library
- Export a project (with its artwork) to a single `.cardproj.zip` file and import it back
- Installable as a PWA and fully usable offline
- Light and dark themes, English / Čeština / Deutsch / Español, keyboard shortcuts (press `?`)

## Getting started

```bash
npm install
npm run dev
```

The dev server runs at <http://localhost:5173>.

```bash
npm run build     # type-check and build to dist/
npm run preview   # serve the production build
npm run lint      # oxlint
npm test          # vitest
```

## Running it with Docker

The app is a static site, so the image builds it and serves it with nginx — nothing else is needed at
runtime.

```bash
docker compose up -d --build
```

It is then on <http://localhost:8080>, or on `http://<your-server>:8080` from elsewhere on your network.
Change the host port in `docker-compose.yml` if 8080 is taken.

Without compose:

```bash
docker build -t card-layout .
docker run -d --name card-layout -p 8080:80 --restart unless-stopped card-layout
```

The image is about 63 MB, serves the SPA with a fallback so deep links work, caches fingerprinted assets
for a year while keeping `index.html` and `sw.js` uncached, and reports a health status.

Two things worth knowing when you host it yourself:

- **Projects live in the browser, not on the server.** Everything is stored in IndexedDB on the machine
  you're using, so the same deployment shows different projects to different devices. Use the project
  export/import to move a deck between them.
- **Offline support and "install as app" need HTTPS.** Browsers only register a service worker on a
  secure origin, and a plain `http://192.168.x.x:8080` isn't one. Put the container behind a reverse
  proxy with a certificate (Caddy, Traefik, Nginx Proxy Manager) to get the PWA features on your LAN.
  Without it the app still works normally — it just won't cache itself for offline use.

## A typical run

1. Pick a template, or set the paper and card size yourself.
2. Drop your artwork in. Files named like `card01-front.png` / `card01-back.png` pair up on their own.
3. Assign fronts and backs in the manager — or set one shared back for the whole deck — and set how many
   copies of each card you want.
4. Frame each image in the canvas and check the DPI warnings.
5. Choose how your printer flips the paper: short edge or long edge.
6. Print the calibration sheet once, measure the offset, and enter the corrections.
7. Print, or export the PDF.

## How it works

All geometry is kept in millimetres and converted only at the edges — to points for the PDF, to pixels
for the canvas, to CSS `mm` for the print view.

The layout pipeline computes how many cells fit the paper, expands the deck (resolving shared backs and
copy counts), then paginates it into front/back sheet pairs. The back sheet's cells are remapped by a
mirroring function: a short-edge flip mirrors rows, a long-edge flip mirrors columns. That function is
its own inverse, which is exactly the property that makes a flipped sheet line up.

The print view and the PDF exporter are two independent renderers of that same layout, so what the
browser prints and what the PDF contains agree.

## Built with

React 19, TypeScript, Vite, Zustand, Konva (canvas editor), pdf-lib (PDF export), JSZip (project files),
idb (IndexedDB), i18next, Vitest.

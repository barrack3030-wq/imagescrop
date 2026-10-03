# Slice6 Photo Cropper

A zero-backend GitHub Pages web app that splits a 3600 × 3000 px image into six 1200 × 1500 px PNGs.

## Features
- Drag & drop or file picker
- Exact 3 × 2 slicing for 3600 × 3000 input
- Six 1200 × 1500 PNG outputs
- Preview all six slices
- Download individual PNGs
- Download all six PNGs
- Download ZIP
- Browser-only processing: source images are not uploaded to a server
- Works as a static GitHub Pages site

## GitHub Pages
Open Settings → Pages, select Deploy from a branch, then choose main and / (root).

ZIP downloading uses JSZip from jsDelivr. The six PNG downloads do not require JSZip.

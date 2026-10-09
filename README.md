# Мастер шин — website

Static site (HTML + CSS + JS, no build step). The 3D wheel is built procedurally with Three.js, so there are no model or image files.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 5173
```

Three.js and the fonts load from CDNs (jsDelivr, Google Fonts), so the visitor needs an internet connection. If WebGL or the CDN is unavailable, the page falls back to a static wheel and everything else still works.

## What to edit

| What | Where |
| --- | --- |
| Texts, phone, address, links | `index.html` |
| Colours, fonts, spacing | `:root` variables at the top of `css/styles.css` |
| Wheel poses per section (position, tilt, spin, effects) | `STORY` array in `js/main.js` |
| Wheel look (tire, rim, spokes, lettering on the sidewall) | `init3D()` in `js/main.js` |

## Facts used (from the 2GIS listing)

Address Переулок Жоламан, 9/8 (Сарыарка, Астана, 1 этаж) · open 24/7 · +7 775 676-78-70 · rating 4.7 · 445 reviews / 569 ratings · 19 branches · 2GIS Awards 2026 nominee · coordinates 51.172517, 71.375835.

## Things to confirm before going live

- **Prices** are not invented: the price list says "уточнить" and links to the 2GIS price tab. Replace it with the real price list when available.
- **WhatsApp** button assumes the phone number is on WhatsApp. Remove it from the contacts block if not.
- Service descriptions are generic; adjust to what the shop actually offers.
- No reviews are quoted on purpose; the page links to the real ones on 2GIS.

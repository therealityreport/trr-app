---
name: extract-ai2html-artboards
description: Extract ai2html artboard dimensions, images, and text overlays.
---

# Extract ai2html Artboards

## Purpose

Parse article HTML that contains ai2html output and extract structured artboard
data: viewport-specific dimensions, background images, text overlays, and badge
elements. Produce an `Ai2htmlData` JSON object that downstream components can
consume to render responsive graphics.

## Input

1. **Page HTML** -- a string or DOM fragment containing one or more ai2html
   containers.
2. **Artboard image URLs** -- an optional map of filenames to resolved CDN URLs.
   When provided, prefer these over the raw `src` values found in the HTML
   (which are often relative paths that will 404 outside the original host).

## Step-by-step Extraction

### 1. Locate ai2html containers

Search the DOM for elements matching **any** of these selectors:

```
.g-artboard
[data-min-width]
[data-max-width]
```

Each matched element is one artboard. If a `.g-artboard` element also carries
`data-min-width` / `data-max-width`, treat it as a single artboard (do not
double-count).

### 2. Read viewport breakpoints

For each artboard element:

| Attribute        | Meaning                                      |
|------------------|----------------------------------------------|
| `data-min-width` | Minimum viewport width this artboard targets |
| `data-max-width` | Maximum viewport width this artboard targets |

Classify into a viewport bucket:

| Bucket    | Rule                                       |
|-----------|--------------------------------------------|
| `mobile`  | `data-max-width` exists and is <= 599      |
| `tablet`  | `data-min-width` >= 600 AND <= 1023        |
| `desktop` | `data-min-width` >= 1024 OR no max-width   |

If neither attribute is present, default to `desktop`.

### 3. Read artboard dimensions

Parse the element's **inline `style`** attribute:

- `width` -- artboard width in pixels (strip `px`).
- `height` -- explicit height if present.
- `padding-bottom` -- percentage-based aspect-ratio encoding (common in ai2html
  output). If `padding-bottom` is present and `height` is absent, derive height
  as `width * (paddingBottomPercent / 100)`.

Calculate aspect ratio string:

```
aspectRatio = ((height / width) * 100).toFixed(4) + "%"
```

### 4. Extract background image

Find the first `<img>` child of the artboard element.

- Read its `src` attribute.
- If an artboard image URL map was provided, resolve the filename against it.
- Store as `backgroundImage`.

### 5. Extract text overlays

Find all absolutely-positioned children (elements whose computed or inline
`position` is `absolute`). For each child:

**Read position styles:**
- `top`, `left` (keep as string values with units, e.g. `"12px"` or `"5%"`)
- `margin-top` if present (as a number, pixels)

**Read typography styles:**
- `font-family`
- `font-size` (as a number, pixels -- strip `px`)
- `font-weight` (as a number)
- `color` (keep original value -- hex, rgb, or named)
- `line-height` (if present)
- `letter-spacing` (if present)

**Read inner text:**
- Use `element.textContent.trim()`.
- Skip elements whose text content is empty after trimming.

**Classify badges:**
If the element (or a direct child) has a `background` or `background-color`
style that is NOT `transparent` and NOT `none`, classify it as a **badge**
instead of a regular text overlay. Badges use this shape:

```json
{
  "text": "LIVE",
  "position": { "top": "10px", "left": "20px" },
  "style": {
    "background": "#e74c3c",
    "color": "#ffffff",
    "fontSize": 11,
    "fontWeight": 700,
    "letterSpacing": "0.05em"
  }
}
```

All other text overlays use:

```json
{
  "text": "Headline goes here",
  "position": { "top": "40px", "left": "20px", "marginTop": 0 },
  "style": {
    "fontFamily": "Georgia, serif",
    "fontSize": 22,
    "fontWeight": 700,
    "color": "#333333"
  }
}
```

### 6. Group by viewport

Collect all artboards into a single array sorted by viewport order:
`mobile` first, then `tablet`, then `desktop`.

## Output Schema

```typescript
interface Ai2htmlData {
  artboards: Array<{
    viewport: "mobile" | "tablet" | "desktop";
    width: number;
    height: number;
    aspectRatio: string;
    backgroundImage: string;
    textOverlays: Array<{
      text: string;
      position: { top: string; left: string; marginTop?: number };
      style: {
        fontFamily: string;
        fontSize: number;
        fontWeight: number;
        color?: string;
      };
    }>;
    badges: Array<{
      text: string;
      position: { top: string; left: string };
      style: {
        background: string;
        color: string;
        fontSize: number;
        fontWeight: number;
        letterSpacing?: string;
      };
    }>;
  }>;
}
```

Return the result as a JSON object conforming to this interface.

---

## CRITICAL WARNING: The "Image Already Has Text" Problem

This is the single most common mistake when working with ai2html output from
production articles. Read this section carefully before generating any rendering
code.

### The problem

ai2html exports artboard backgrounds as **raster PNG images**. In many
production builds, the text and icons that the designer placed in Illustrator are
**baked into the PNG itself** -- they are pixels in the image, not separate HTML
elements. The ai2html HTML _also_ contains absolutely-positioned `<div>` and
`<p>` elements that replicate the same text as an HTML overlay on top of the
image.

When both layers are rendered together, you get **doubled text**: once from the
PNG pixels and once from the HTML overlay sitting on top. The result is blurry,
misaligned, ugly, and immediately obvious.

### How to detect it

Before rendering overlays on top of a background image, determine whether the
PNG already contains visible text:

1. **Visual inspection** -- Open the `backgroundImage` URL directly. If you can
   read headlines, labels, or see icons rendered into the raster, the text is
   baked in.
2. **File size heuristic** -- A background PNG that is mostly flat color or
   vector shapes will be small (< 50 KB for a typical artboard). A PNG with
   rendered text, anti-aliased edges, and photographic elements will be
   significantly larger. This is not definitive but is a useful signal.
3. **Overlay count vs. visible content** -- If the HTML contains many positioned
   text overlays AND the image visually shows the same text, the text is
   duplicated.

### The correct approach

| Scenario | Background has baked-in text? | Rendering strategy |
|----------|-------------------------------|-------------------|
| A        | YES                           | Use a plain `<img>` tag. Do NOT render any text overlays or badges. The image is self-contained. |
| B        | NO (blank / vector-only)      | Use `background-image` on a container with `position: relative`, then render text overlays and badges as absolutely-positioned children. |

**Default assumption for production scraped content: Scenario A.** Most
published ai2html articles ship with baked-in PNGs. Only use Scenario B when you
have confirmed the background is blank or when you are working with raw
Illustrator export output that intentionally separates image and text layers.

### Implementation guard

When generating a component from `Ai2htmlData`:

```
if (artboard.textOverlays.length > 0 || artboard.badges.length > 0) {
  // STOP. Inspect backgroundImage first.
  // If the PNG contains visible text, discard overlays and render <img> only.
  // If the PNG is blank/vector, proceed with overlay rendering.
}
```

Always emit a code comment at the rendering site:

```tsx
{/* WARNING: Check backgroundImage for baked-in text before enabling overlays.
    See extract-ai2html-artboards skill for details. */}
```

### Summary

- Extract ALL data (overlays, badges, dimensions) regardless -- downstream
  consumers may need the structured text for SEO, accessibility, or search.
- But NEVER blindly render overlays on top of the background image without
  verifying the image does not already contain the same content as pixels.
- When in doubt, default to `<img>` only (Scenario A). Doubled text is worse
  than missing HTML overlays.

---

## CRITICAL: ai2html Overlay Positioning Rules

These rules were learned from manually recreating NYT ai2html overlays and MUST be followed:

### 1. Badge text is plain white text, NOT colored backgrounds
The colored bars (red "HASN'T HAPPENED", orange "SOME PROGRESS", green "SO FAR, SO GOOD") are **baked into the background PNG**. The HTML overlay is just white text (`color: #fff`) positioned on top. NEVER add `badge: { bg: "#bc261a" }` — the background color is already in the image.

### 2. Pixel widths must be converted to percentages
ai2html source HTML uses fixed pixel widths (`width: 141px`). These DON'T scale when the container renders at a different size. Convert: `pixel_width / artboard_width * 100 = percentage`. Example: `141px / 600px * 100 = 23.5%`.

### 3. Mobile artboards need SMALLER font sizes
Mobile artboards (320px) use smaller fonts than desktop (600px). Scale down proportionally: desktop 16px → mobile 11px for labels, desktop 10px → mobile 7px for badges. The source CSS may show 14px for mobile, but at our rendered sizes text overflows without scaling.

### 4. `marginTop` is required for point text baseline alignment
ai2html's `g-aiPointText` class uses negative `margin-top` (e.g., `-9.8px`, `-6.2px`) to align text baselines. Without `marginTop`, text appears shifted down from its intended position. Extract this value from every `g-ai*` div's inline style.

### 5. `white-space: nowrap` is default for point text
All ai2html point text uses `white-space: nowrap` (via the `.g-aiPointText p` CSS rule). Without this, text wraps at narrow widths and breaks the layout. Always include `whiteSpace: "nowrap"` in overlay styles.

### 6. Both artboards (mobile + desktop) MUST have overlays
Every ai2html graphic has separate mobile and desktop artboards with DIFFERENT percentage positions. Extract overlay positions for BOTH. The mobile artboard (Artboard_2) uses `g-ai0-*` divs, desktop (Artboard_3) uses `g-ai1-*` divs.

### 7. Extract positions from the EXACT source HTML
Never estimate or approximate positions. Copy `top`, `left`, `margin-top`, and `width` values character-for-character from the source HTML's `g-ai0-*` / `g-ai1-*` div inline styles.

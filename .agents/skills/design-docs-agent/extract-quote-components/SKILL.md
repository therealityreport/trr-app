---
name: extract-quote-components
description: Extract styled quote blocks with CSS specifications.
---

# Extract Quote Components

Extract styled quote/callout blocks from article HTML, capturing the full component structure, text content, and computed CSS for each sub-element. Output a structured `QuoteData` JSON that downstream agents can use to reproduce the component in code.

---

## Input

Raw page HTML (full document or article fragment) containing one or more quote/callout blocks.

---

## Step 1 -- Locate Quote Containers

Search the DOM for elements matching any of these selectors, in priority order:

1. `blockquote`
2. `.quote`
3. `.callout`
4. `.pullquote`
5. `.g-block` that contains a child matching `.quote-text`, `blockquote`, or `h2 + small` structure

Collect every matching element into a list of candidate containers. De-duplicate if a container is nested inside another already-collected container (keep the outermost).

---

## Step 2 -- Extract Sub-Elements per Container

For each container, extract three (optionally four) sub-elements:

### 2a. Citation / Source

Look for the first match among:
- `h4`
- `.citation`
- `.source`
- Element with `text-transform: uppercase` and `font-variant: small-caps` (or class indicating small-caps)
- `<cite>`

Extract the `textContent` trimmed of whitespace.

### 2b. Quote Text

Look for the first match among:
- `h2` inside the container
- `.quote-text`
- `blockquote p`
- Element with `font-style: italic` and `font-size` >= 20px

Extract the `textContent` trimmed of whitespace. If multiple `<p>` tags exist inside the quote body, join them with `\n`.

### 2c. Status Badge (optional)

Look for a `<span>` or `<div>` inside the container whose `textContent`:
- Is 30 characters or fewer
- Is rendered in uppercase (`text-transform: uppercase` or all-caps literal text)
- Has a non-white, non-transparent `background-color`

If found, extract:
- `text`: the trimmed text content
- `color`: the computed `background-color` as a hex string

### 2d. Record CSS for Each Sub-Element

Use `browser.evaluate` to run in-page JS that
calls `getComputedStyle()` on each sub-element and extracts the specific CSS
properties listed in the CSS Properties Reference section below. When working
from static HTML (no live page), fall back to parsing `<style>` blocks and
inline `style` attributes to resolve property values.

---

## Step 3 -- Map Quotes to Article Sections

For each container, walk backwards through preceding siblings and ancestors to find the nearest `<h2>` element that acts as a section subhed. Record its `textContent` as the `section` field. If no `<h2>` is found before reaching another quote container or the top of the article body, set `section` to `"(no section)"`.

---

## Step 4 -- Extract Badge Colors for Status System

After processing all containers, collect the unique set of `{ text, color }` badge pairs. This palette is used downstream to build a status color system. Include it in the top-level output if any badges were found.

---

## CSS Properties Reference

Capture exactly these properties for each sub-element:

### Container
| Property        | Example (NYT reference)       |
|-----------------|-------------------------------|
| border          | `1px solid #363636`           |
| border-radius   | `5px`                         |
| padding         | `15px`                        |
| max-width       | (varies, often `600px`)       |

### Citation
| Property        | Example (NYT reference)       |
|-----------------|-------------------------------|
| font-family     | `nyt-franklin, sans-serif`    |
| font-size       | `14px`                        |
| font-weight     | `400`                         |
| color           | (computed value)              |
| letter-spacing  | (computed value)              |
| text-transform  | `uppercase`                   |

### Quote Text
| Property        | Example (NYT reference)       |
|-----------------|-------------------------------|
| font-family     | `nyt-cheltenham, serif`       |
| font-size       | `25px`                        |
| font-weight     | `300`                         |
| font-style      | `italic`                      |
| color           | (computed value)              |
| line-height     | (computed value)              |

### Badge (when present)
| Property        | Example (NYT reference)       |
|-----------------|-------------------------------|
| font-size       | `12px`                        |
| font-weight     | `600`                         |
| letter-spacing  | (computed value)              |
| border-radius   | (computed value)              |
| padding         | (computed value)              |
| background      | (colored, e.g. `#e2b842`)    |
| color           | (text color, e.g. `#000`)    |

---

## Output Schema

Return a single JSON object conforming to this TypeScript interface:

```typescript
interface QuoteData {
  quoteComponents: Array<{
    /** Nearest preceding h2 section title */
    section: string;
    /** Citation / source line */
    citation: string;
    /** Primary quote body text */
    quoteText: string;
    /** Optional status badge */
    badge?: { text: string; color: string };
    /** Computed CSS for each sub-element */
    css: {
      container: Record<string, string | number>;
      citation: Record<string, string | number>;
      quoteText: Record<string, string | number>;
      badge?: Record<string, string | number>;
    };
  }>;
}
```

### Example Output

```json
{
  "quoteComponents": [
    {
      "section": "The Search for Survivors",
      "citation": "MAYOR ERIC ADAMS, March 2025",
      "quoteText": "We are not going to stop until every person is accounted for.",
      "badge": { "text": "HASN'T HAPPENED", "color": "#e2b842" },
      "css": {
        "container": {
          "border": "1px solid #363636",
          "border-radius": "5px",
          "padding": "15px",
          "max-width": "600px"
        },
        "citation": {
          "font-family": "nyt-franklin, sans-serif",
          "font-size": "14px",
          "font-weight": "400",
          "color": "#999",
          "letter-spacing": "0.05em",
          "text-transform": "uppercase"
        },
        "quoteText": {
          "font-family": "nyt-cheltenham, serif",
          "font-size": "25px",
          "font-weight": "300",
          "font-style": "italic",
          "color": "#333",
          "line-height": "1.4"
        },
        "badge": {
          "font-size": "12px",
          "font-weight": "600",
          "letter-spacing": "0.08em",
          "border-radius": "3px",
          "padding": "2px 8px",
          "background": "#e2b842",
          "color": "#000"
        }
      }
    }
  ]
}
```

---

## Error Handling

- If a container has no identifiable quote text, skip it and log a warning: `"Skipped container at index N -- no quote text found"`.
- If `getComputedStyle` is unavailable (static HTML context), attempt to resolve styles from `<style>` blocks and inline `style` attributes. Properties that cannot be resolved should be recorded as `"unresolved"`.
- If the page has zero matching containers, return `{ "quoteComponents": [] }`.

---

## Notes

- This skill is designed for article pages from editorial / news sites (NYT, WaPo, etc.) but the selector list covers generic patterns.
- The NYT reference CSS values above (nyt-franklin 14px/400, nyt-cheltenham 25px/300/italic, border 1px solid #363636, border-radius 5px, padding 15px, badge 12px/600/uppercase) are baselines. Always prefer the actual computed values from the page over these defaults.
- When running in a browser context, use `browser.evaluate` to execute `getComputedStyle(el).getPropertyValue(prop)` for accuracy. When running against static HTML, fall back to stylesheet + inline style parsing.

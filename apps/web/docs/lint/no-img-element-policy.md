# no-img-element Policy

`@next/next/no-img-element` is enforced as an error.

## Default Rule
- Use `next/image` for all renderable images in app/admin surfaces.
- Prefer explicit `width`/`height` and use `unoptimized` only when needed for dynamic third-party assets (for example, remote favicons).

## Allowed Exceptions
- An exception is allowed only when `next/image` is not technically viable for that render path.
- Every exception must include a local inline disable with a short reason:
  - `// eslint-disable-next-line @next/next/no-img-element -- <reason>`

## Not Allowed
- File-level blanket disables without line-level justification.
- New `<img>` usage in admin pages when `next/image` is viable.

#!/usr/bin/env python3
"""Generate a checked-in catalog for additional TRR-hosted font families.

This fills in hosted families that exist in R2 but are not fully declared in
src/styles/cdn-fonts.css, so admin tooling can still show all discovered
weights and styles for those families.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import quote


OUTPUT_PATH = Path(
    "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/src/lib/fonts/generated/additional-trr-font-catalog.ts"
)
DEFAULT_ENV_FILE = Path("/Users/thomashulihan/Projects/TRR/TRR-Backend/.env")
TRR_PREFIX = "fonts/trr/"
ADDITIONAL_FAMILIES = (
    "Bernhard Modern",
    "Best Bet JNL",
    "Hefring Slab",
    "Madriz",
    "Novecento Slab",
    "Palo Slab",
    "Publica Slab",
    "Rude Icons",
    "Rude Slab",
    "Rude Slab ExtraCondensed",
    "Rude Slab SemiWide",
    "Sharp Slab",
    "Stint Pro",
    "TT Rationalist",
    "Tabac Big Slab",
    "Winner Sans",
)

WEIGHT_ALIASES: tuple[tuple[str, int], ...] = (
    ("thin", 100),
    ("hairline", 100),
    ("extralight", 200),
    ("ultralight", 200),
    ("xlight", 200),
    ("light", 300),
    ("book", 400),
    ("regular", 400),
    ("roman", 400),
    ("normal", 400),
    ("medium", 500),
    ("semibold", 600),
    ("demibold", 600),
    ("demi", 600),
    ("bold", 700),
    ("extrabold", 800),
    ("ultrabold", 800),
    ("heavy", 800),
    ("black", 900),
    ("ultra", 900),
)


@dataclass(frozen=True)
class StyleRecord:
    weight: int
    style: str
    stretch: str | None
    source_url: str
    asset_path: str


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        os.environ.setdefault(key, value)


def build_client():
    try:
        import boto3
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(f"boto3 is required: {exc}") from exc

    required = [
        "OBJECT_STORAGE_ACCESS_KEY_ID",
        "OBJECT_STORAGE_SECRET_ACCESS_KEY",
        "OBJECT_STORAGE_ENDPOINT_URL",
        "OBJECT_STORAGE_BUCKET",
    ]
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        raise SystemExit(f"Missing required env vars: {', '.join(missing)}")

    return boto3.client(
        "s3",
        endpoint_url=os.environ["OBJECT_STORAGE_ENDPOINT_URL"],
        aws_access_key_id=os.environ["OBJECT_STORAGE_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["OBJECT_STORAGE_SECRET_ACCESS_KEY"],
        region_name=os.environ.get("OBJECT_STORAGE_REGION", "auto"),
    )


def iter_keys(client, bucket: str, prefix: str) -> list[str]:
    paginator = client.get_paginator("list_objects_v2")
    keys: list[str] = []
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj.get("Key")
            if key:
                keys.append(key)
    return keys


def encode_asset_path(key: str) -> str:
    return "/" + "/".join(quote(part, safe="") for part in key.split("/"))


def infer_weight(value: str) -> int:
    lowered = normalize_token(value)
    for alias, weight in sorted(WEIGHT_ALIASES, key=lambda entry: len(entry[0]), reverse=True):
        if alias in lowered:
            return weight
    return 400


def infer_stretch(family_name: str, file_name: str) -> str | None:
    lowered = normalize_token(f"{family_name} {file_name}")
    if any(token in lowered for token in ("extracondensed", "compressed")):
        return "extra-condensed"
    if any(token in lowered for token in ("condensed", "narrow")):
        return "condensed"
    if any(token in lowered for token in ("semiwide", "widewide", "expanded", "extended")):
        return "expanded"
    return None


def normalize_token(value: str) -> str:
    return "".join(ch if ch.isalnum() else " " for ch in value).lower().replace(" ", "")


def infer_style(family_name: str, key: str) -> StyleRecord:
    file_name = key.rsplit("/", 1)[-1]
    lowered = file_name.lower()
    style = "italic" if ("italic" in lowered or "oblique" in lowered) else "normal"
    stretch = infer_stretch(family_name, file_name)
    return StyleRecord(
        weight=infer_weight(file_name),
        style=style,
        stretch=stretch,
        source_url=encode_asset_path(key),
        asset_path=encode_asset_path(key),
    )


def sort_styles(styles: Iterable[StyleRecord]) -> list[StyleRecord]:
    return sorted(
        styles,
        key=lambda style: (
            style.weight,
            style.stretch or "normal",
            style.style,
            style.asset_path,
        ),
    )


def build_output(families: list[tuple[str, list[StyleRecord]]]) -> str:
    lines = [
        'import type { HostedFontCatalogFamily } from "../hosted-font-catalog";',
        "",
        "export const GENERATED_ADDITIONAL_TRR_FONT_CATALOG: HostedFontCatalogFamily[] = [",
    ]
    for family_name, styles in families:
        encoded_family = quote(family_name, safe="")
        lines.append("  {")
        lines.append(f'    familyName: {family_name!r},')
        lines.append('    bucket: "trr",')
        lines.append(f'    cdnPath: "/fonts/trr/{encoded_family}/",')
        lines.append("    styles: [")
        for style in styles:
            stretch_line = (
                f'        stretch: "{style.stretch}",'
                if style.stretch
                else None
            )
            lines.append("      {")
            lines.append(f"        weight: {style.weight},")
            lines.append(f'        style: "{style.style}",')
            if stretch_line:
                lines.append(stretch_line)
            lines.append(f'        sourceUrl: "{style.source_url}",')
            lines.append(f'        assetPath: "{style.asset_path}",')
            lines.append("      },")
        lines.append("    ],")
        lines.append("  },")
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    load_env_file(DEFAULT_ENV_FILE)
    client = build_client()
    bucket = os.environ["OBJECT_STORAGE_BUCKET"]

    families: list[tuple[str, list[StyleRecord]]] = []
    for family_name in ADDITIONAL_FAMILIES:
        prefix = f"{TRR_PREFIX}{family_name}/"
        keys = iter_keys(client, bucket, prefix)
        if not keys:
            continue
        styles_by_key: dict[tuple[int, str, str | None, str], StyleRecord] = {}
        for key in keys:
            style = infer_style(family_name, key)
            dedupe_key = (style.weight, style.style, style.stretch, style.asset_path)
            styles_by_key[dedupe_key] = style
        families.append((family_name, sort_styles(styles_by_key.values())))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(build_output(families))
    print(f"Wrote {OUTPUT_PATH}")
    print(f"Families: {len(families)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

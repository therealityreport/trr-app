#!/usr/bin/env python3
"""Upload font files from a local directory to S3 with proper caching headers.

Recursively finds .ttf, .otf, .woff, and .woff2 files under --source,
preserves the directory structure relative to source, and uploads to
s3://<bucket>/<prefix>/... with immutable cache-control headers.

Files already present in S3 (checked via HeadObject) are skipped.

Usage examples::

    # Dry-run against the Monotype Fonts directory
    FONT_SRC="~/Library/Application Support/Monotype Fonts/..."
    python scripts/upload-fonts-to-s3.py \\
        --source "$FONT_SRC" --bucket trr-backend --dry-run

    # Real upload using the 'trr' AWS profile
    AWS_PROFILE=trr python scripts/upload-fonts-to-s3.py \\
        --source "$FONT_SRC" --bucket trr-backend
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# Content-Type mapping for font formats
FONT_CONTENT_TYPES: dict[str, str] = {
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}

SUPPORTED_EXTENSIONS = set(FONT_CONTENT_TYPES.keys())

CACHE_CONTROL = "public, max-age=31536000, immutable"


def find_font_files(source: Path) -> list[Path]:
    """Recursively find all font files under *source*, sorted for deterministic output."""
    fonts: list[Path] = []
    for path in sorted(source.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            fonts.append(path)
    return fonts


def s3_key_for(font_path: Path, source: Path, prefix: str) -> str:
    """Build the S3 object key preserving the relative directory structure.

    Example:
        source  = /foo/bar/
        font    = /foo/bar/hamburg-serial/Bold.otf
        prefix  = fonts
        result  = fonts/hamburg-serial/Bold.otf
    """
    relative = font_path.relative_to(source)
    # Use posixpath-style forward slashes for S3 keys
    return f"{prefix}/{relative.as_posix()}"


def object_exists(s3_client, bucket: str, key: str) -> bool:
    """Return True if an object already exists in S3."""
    from botocore.exceptions import ClientError

    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        if exc.response["Error"]["Code"] == "404":
            return False
        raise


def upload_font(s3_client, font_path: Path, bucket: str, key: str) -> None:
    """Upload a single font file to S3 with correct content-type and caching."""
    content_type = FONT_CONTENT_TYPES[font_path.suffix.lower()]
    s3_client.upload_file(
        Filename=str(font_path),
        Bucket=bucket,
        Key=key,
        ExtraArgs={
            "ContentType": content_type,
            "CacheControl": CACHE_CONTROL,
        },
    )


def build_s3_client(region: str):
    """Create a boto3 S3 client, respecting AWS_PROFILE or key-based auth."""
    try:
        import boto3
    except ImportError:
        print("ERROR: boto3 is required. Install it with: pip install boto3", file=sys.stderr)
        sys.exit(1)

    session_kwargs: dict[str, str] = {}
    profile = os.environ.get("AWS_PROFILE")
    if profile:
        session_kwargs["profile_name"] = profile

    session = boto3.Session(region_name=region, **session_kwargs)
    return session.client("s3")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload font files to S3 with immutable caching headers.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Directory containing font files (searched recursively).",
    )
    parser.add_argument(
        "--bucket",
        required=True,
        help="Target S3 bucket name.",
    )
    parser.add_argument(
        "--prefix",
        default="fonts",
        help="S3 key prefix (default: fonts).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List what would be uploaded without actually uploading.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    source = Path(args.source).expanduser().resolve()
    if not source.is_dir():
        print(f"ERROR: Source directory does not exist: {source}", file=sys.stderr)
        return 1

    # ---- Discover font files ------------------------------------------------
    fonts = find_font_files(source)
    if not fonts:
        print(f"No font files found in {source}")
        return 0

    print(f"Found {len(fonts)} font file(s) in {source}")
    print(f"Target: s3://{args.bucket}/{args.prefix}/")
    if args.dry_run:
        print("Mode: DRY RUN (no uploads will be performed)\n")
    else:
        print()

    # ---- Build S3 client (skip in dry-run) ----------------------------------
    s3_client = None
    if not args.dry_run:
        region = os.environ.get("AWS_REGION", "us-east-1")
        s3_client = build_s3_client(region)

    # ---- Process each font --------------------------------------------------
    uploaded = 0
    skipped = 0
    errors = 0

    for font_path in fonts:
        key = s3_key_for(font_path, source, args.prefix)
        content_type = FONT_CONTENT_TYPES[font_path.suffix.lower()]

        if args.dry_run:
            print(f"  [DRY-RUN] {key}  ({content_type})")
            uploaded += 1
            continue

        try:
            if object_exists(s3_client, args.bucket, key):
                print(f"  [SKIP]   {key}")
                skipped += 1
            else:
                upload_font(s3_client, font_path, args.bucket, key)
                print(f"  [UPLOAD] {key}  ({content_type})")
                uploaded += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  [ERROR]  {key}: {exc}", file=sys.stderr)
            errors += 1

    # ---- Summary ------------------------------------------------------------
    print()
    if args.dry_run:
        print(f"Dry-run summary: {uploaded} file(s) would be uploaded.")
    else:
        parts = [f"{uploaded} uploaded", f"{skipped} skipped"]
        if errors:
            parts.append(f"{errors} errors")
        print(f"Summary: {', '.join(parts)}.")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

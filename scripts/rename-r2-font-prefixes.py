#!/usr/bin/env python3
"""Rename the TRR font prefixes in Cloudflare R2.

Moves:
- fonts/monotype/ -> fonts/trr/
- fonts/realitease/ -> fonts/reference fonts/NYTimes/

The script copies objects first, verifies destination existence, and only then
deletes the source objects when --delete-source is provided.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PrefixRename:
    source_prefix: str
    target_prefix: str


PREFIX_RENAMES = (
    PrefixRename("fonts/monotype/", "fonts/trr/"),
    PrefixRename("fonts/realitease/", "fonts/reference fonts/NYTimes/"),
)


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


def destination_key(source_key: str, rename: PrefixRename) -> str:
    return source_key.replace(rename.source_prefix, rename.target_prefix, 1)


def object_exists(client, bucket: str, key: str) -> bool:
    from botocore.exceptions import ClientError

    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        if exc.response["Error"]["Code"] in {"404", "NoSuchKey", "NotFound"}:
            return False
        raise


def copy_key(client, bucket: str, source_key: str, target_key: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY-RUN] copy {source_key} -> {target_key}")
        return
    client.copy_object(
        Bucket=bucket,
        Key=target_key,
        CopySource={"Bucket": bucket, "Key": source_key},
        MetadataDirective="COPY",
    )


def delete_key(client, bucket: str, key: str, dry_run: bool) -> None:
    if dry_run:
        print(f"[DRY-RUN] delete {key}")
        return
    client.delete_object(Bucket=bucket, Key=key)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--env-file",
        default="/Users/thomashulihan/Projects/TRR/TRR-Backend/.env",
        help="Path to an env file containing OBJECT_STORAGE_* values.",
    )
    parser.add_argument(
        "--delete-source",
        action="store_true",
        help="Delete the source objects after successful copy verification.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Perform the rename. Without this flag the script runs in dry-run mode.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    dry_run = not args.apply
    load_env_file(Path(args.env_file).expanduser())

    client = build_client()
    bucket = os.environ["OBJECT_STORAGE_BUCKET"]

    total_copied = 0
    total_deleted = 0
    for rename in PREFIX_RENAMES:
        keys = iter_keys(client, bucket, rename.source_prefix)
        print(f"{rename.source_prefix} -> {rename.target_prefix} ({len(keys)} objects)")
        for source_key in keys:
            target_key = destination_key(source_key, rename)
            if not object_exists(client, bucket, target_key):
                copy_key(client, bucket, source_key, target_key, dry_run=dry_run)
                total_copied += 1
            else:
                print(f"[SKIP] destination exists {target_key}")

            if args.delete_source:
                if dry_run or object_exists(client, bucket, target_key):
                    delete_key(client, bucket, source_key, dry_run=dry_run)
                    total_deleted += 1
                else:
                    raise SystemExit(f"Refusing to delete {source_key}; destination missing: {target_key}")

    mode = "DRY-RUN" if dry_run else "APPLY"
    print(f"{mode} summary: {total_copied} copied, {total_deleted} deleted")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

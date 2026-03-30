#!/usr/bin/env python3
"""
Claude Computer Use integration for TRR-APP.

A standalone Python script that adds computer use capabilities to the
TRR-APP frontend project. Can be used for:
  - Automated visual testing (screenshot + describe UI state)
  - Browser automation tasks via Claude
  - QA checks on rendered pages

Usage:
    # CLI
    python scripts/computer_use.py "Navigate to localhost:3000 and describe the homepage"
    python scripts/computer_use.py --json "Take a screenshot of the current browser"

    # From Node.js / pnpm scripts
    pnpm exec python3 scripts/computer_use.py "your prompt"
"""

from __future__ import annotations

import argparse
import importlib
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def _load_computer_use_runtime():
    """Import the optional computer-use runtime only when the script is executed."""
    try:
        module = importlib.import_module("claude_computer_use")
    except ImportError as exc:
        raise RuntimeError(
            "claude_computer_use is not installed in this Python environment."
        ) from exc

    computer_use_client = getattr(module, "ComputerUseClient", None)
    sampling_loop = getattr(module, "sampling_loop", None)
    if computer_use_client is None or sampling_loop is None:
        raise RuntimeError(
            "claude_computer_use is installed but does not expose the expected runtime."
        )

    return computer_use_client, sampling_loop


def run(
    prompt: str,
    model: str = "claude-opus-4-6",
    max_iterations: int = 10,
    json_output: bool = False,
) -> dict:
    """Run a computer use task and return results."""
    computer_use_client, sampling_loop = _load_computer_use_runtime()
    client = computer_use_client(
        model=model,
        display_width_px=1440,
        display_height_px=900,
        include_bash=True,
        include_text_editor=True,
    )

    messages = sampling_loop(
        client=client,
        prompt=prompt,
        max_iterations=max_iterations,
    )

    # Extract final text
    final_text = None
    for msg in reversed(messages):
        if msg.get("role") == "assistant":
            for block in msg.get("content", []):
                if isinstance(block, dict) and block.get("type") == "text":
                    final_text = block["text"]
                    break
            if final_text:
                break

    result = {
        "success": True,
        "final_text": final_text,
        "iterations": len([m for m in messages if m.get("role") == "assistant"]),
    }

    if json_output:
        result["messages"] = messages

    return result


def main():
    parser = argparse.ArgumentParser(description="Claude Computer Use for TRR-APP")
    parser.add_argument("prompt", help="Task for Claude to perform")
    parser.add_argument("--model", default="claude-opus-4-6", help="Claude model")
    parser.add_argument("--max-iterations", type=int, default=10, help="Max loop iterations")
    parser.add_argument("--json", action="store_true", help="Output full JSON with message history")
    args = parser.parse_args()

    try:
        result = run(
            prompt=args.prompt,
            model=args.model,
            max_iterations=args.max_iterations,
            json_output=args.json,
        )
    except RuntimeError as exc:
        logger.error("%s", exc)
        raise SystemExit(1) from exc

    if args.json:
        print(json.dumps(result, indent=2, default=str))
    else:
        if result["final_text"]:
            print(result["final_text"])
        else:
            print("(no text response)")


if __name__ == "__main__":
    main()

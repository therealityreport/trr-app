# graphify reference: incremental update and cluster-only

Load this only for an explicit `--update` or `--cluster-only` request. The
trusted `GRAPHIFY_PYTHON` and parsed `INPUT_PATH` environment variables must
already pass the core preflight. Never read an interpreter from `graphify-out/`
and never substitute a path into source text.

## For --update

Run the incremental detector, then preserve its result for the entire update.
Do not save a manifest yet.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
from graphify.detect import detect_incremental

result = detect_incremental(Path(os.environ['INPUT_PATH']))
Path('graphify-out/.graphify_incremental.json').write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
new_total = result.get('new_total', 0)
deleted = list(result.get('deleted_files', []))
if new_total == 0 and not deleted:
    raise SystemExit('No files changed since the last successful manifest.')
print(f'{new_total} new/changed file(s); {len(deleted)} deleted file(s).')
PY
```

Populate the current-run detection file with both changed and complete corpus
lists. `files` is the changed subset; `all_files` is the full corpus. Never
reuse a detection file from a prior run.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json
from pathlib import Path

incremental = json.loads(Path('graphify-out/.graphify_incremental.json').read_text(encoding='utf-8'))
detect = {
    'files': incremental.get('new_files', {}),
    'all_files': incremental.get('files', {}),
    'total_files': incremental.get('new_total', 0),
    'total_words': incremental.get('total_words', 0),
    'skipped_sensitive': incremental.get('skipped_sensitive', []),
}
Path('graphify-out/.graphify_detect.json').write_text(json.dumps(detect, ensure_ascii=False), encoding='utf-8')
PY
```

### Extract the current change set

If only code changed, run the local AST extraction and **also write the empty
`.graphify_semantic.json` artifact** before Part C. Part C reads it
unconditionally; skipping it would make a code-only incremental update fail.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json
from pathlib import Path

Path('graphify-out/.graphify_semantic.json').write_text(
    json.dumps({'nodes': [], 'edges': [], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}),
    encoding='utf-8',
)
PY
```

If any changed path is document, paper, image, or video, follow the core
semantic-policy gate. In this TRR app, external/LLM semantic extraction is
forbidden, so retain the valid empty semantic artifact and report that the
semantic layer is partial. For a permitted local transcriber, follow
`transcribe.md` and append successful transcript paths to `files.document`
before any semantic-dispatch decision.

If the update contains only deletions, materialize an empty extraction before
the merge. Previous cleanup may have removed the prior intermediate, but a
deletion-only merge still needs a correctly shaped current-run input:

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json
from pathlib import Path

Path('graphify-out/.graphify_extract.json').write_text(
    json.dumps({'nodes': [], 'edges': [], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}),
    encoding='utf-8',
)
PY
```

### Snapshot before merge and preserve directed endpoints

Immediately before the merge, save a backup only if an existing graph is
present. The backup must precede `build_merge`, otherwise graph-diff compares the
new graph with itself.

```bash
if [ -f graphify-out/graph.json ]; then
  cp graphify-out/graph.json graphify-out/.graphify_old.json
fi
```

Run `build_merge` with the parsed root and the explicit directed-mode value. Use
only `deleted_files` as `prune_sources`; changed files are replaced by their
fresh extraction. Do not drop `_src`/`_tgt` attributes when serializing edges.
If deletions create a smaller graph, require an explicit user confirmation before
the core build flow writes and atomically replaces the smaller candidate.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
from graphify.build import build_merge

incremental = json.loads(Path('graphify-out/.graphify_incremental.json').read_text(encoding='utf-8'))
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
directed = os.environ.get('GRAPHIFY_DIRECTED', '').lower() == 'true'
graph = build_merge(
    [extraction],
    graph_path='graphify-out/graph.json',
    prune_sources=list(incremental.get('deleted_files', [])) or None,
    root=os.environ['INPUT_PATH'],
    directed=directed,
)
merged = {
    'nodes': [{'id': node, **attrs} for node, attrs in graph.nodes(data=True)],
    'edges': [{**{key: value for key, value in attrs.items() if key not in {'_src', '_tgt', 'source', 'target'}}, 'source': attrs.get('_src', source), 'target': attrs.get('_tgt', target)} for source, target, attrs in graph.edges(data=True)],
    'hyperedges': list(graph.graph.get('hyperedges', [])),
    'input_tokens': extraction.get('input_tokens', 0),
    'output_tokens': extraction.get('output_tokens', 0),
}
Path('graphify-out/.graphify_extract.json').write_text(json.dumps(merged, ensure_ascii=False), encoding='utf-8')
PY
```

Run the core build, integrity check, requested finite exports, and report steps.
If any one fails, stop, preserve the prior graph and manifest, and leave changed
files eligible for retry. After a successful graph is produced, compare the
pre-merge backup with the candidate and show additions, removals, and graph
health. Then remove only `graphify-out/.graphify_old.json`.

### Commit the manifest last

Only after every requested downstream graph, report, and export succeeds, compute
and save the manifest. `_manifest_files`, `_cleared`, and `_scan` must derive
from the extraction that actually reached the final graph. Semantic paths with no
validated output remain unstamped so the next update re-queues them.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
from graphify.cli import _stamped_manifest_files
from graphify.detect import save_manifest

incremental = json.loads(Path('graphify-out/.graphify_incremental.json').read_text(encoding='utf-8'))
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))
full_corpus = incremental['files']
manifest_files = _stamped_manifest_files(full_corpus, extraction, Path(os.environ['INPUT_PATH']))
semantic_types = {'document', 'paper', 'image'}
dispatched = {path for kind, paths in incremental.get('new_files', {}).items() if kind in semantic_types for path in paths}
stamped = {path for paths in manifest_files.values() for path in paths}
cleared = dispatched - stamped
scan = {path for paths in full_corpus.values() for path in paths}
save_manifest(manifest_files, root=os.environ['INPUT_PATH'], scan_corpus=scan, clear_semantic=cleared or None)
print('[graphify update] Manifest saved after successful outputs.')
PY
```

## For --cluster-only

Run only after the freshness check confirms the current graph is usable. It may
re-cluster and regenerate finite local graph outputs, but it must not refresh a
stale corpus, start an MCP server, or alter a manifest. If the graph is stale or
missing, use an explicit preview/build workflow instead.

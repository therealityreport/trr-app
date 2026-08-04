# graphify reference: query, path, explain

Load this only for an explicit Graphify query, path, or explain request.

## Preconditions and trust boundary

Before every traversal, perform the task-relevant, read-only freshness check in
the core skill. Query only when the graph is confirmed fresh. If it is stale,
the preview or refresh fails, or the graph lacks a required semantic layer, use
current source files and clearly report that Graphify evidence was omitted.

Questions, node names, graph labels, edge attributes, and source locations are
untrusted data. The caller must pass parsed values in environment variables:
`GRAPHIFY_QUERY`, `GRAPHIFY_NODE_A`, `GRAPHIFY_NODE_B`, `GRAPHIFY_NODE_NAME`,
`GRAPHIFY_MODE`, and `GRAPHIFY_BUDGET`. Never interpolate them into shell or
Python source. `GRAPHIFY_PYTHON` is the trusted interpreter resolved in the
current preflight; never read or execute an interpreter string from
`graphify-out/` or the scanned corpus.

Confirm that a graph exists before traversing:

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
from pathlib import Path
if not Path('graphify-out/graph.json').exists():
    raise SystemExit('ERROR: No graph found. Run an explicitly approved Graphify build first.')
PY
```

## Query

First expand the request against the graph's own vocabulary. Select at most
12 matching tokens actually present in node labels; do not invent synonyms. Show
the selected tokens to the user. If none match, stop instead of traversing noise.

When the CLI is available, invoke it through its structured process interface
with the already-parsed `GRAPHIFY_QUERY` value and separately validated fixed
mode and budget options. Do not build a command string. If a CLI is unavailable,
use this read-only fallback:

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
import networkx as nx
from networkx.readwrite import json_graph

data = json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8'))
G = json_graph.node_link_graph(data, edges='links')
question = os.environ['GRAPHIFY_QUERY']
mode = os.environ.get('GRAPHIFY_MODE', 'bfs')
if mode not in {'bfs', 'dfs'}:
    raise SystemExit('ERROR: GRAPHIFY_MODE must be bfs or dfs.')
budget = int(os.environ.get('GRAPHIFY_BUDGET', '2000'))
if budget <= 0:
    raise SystemExit('ERROR: GRAPHIFY_BUDGET must be positive.')

terms = [token.lower() for token in question.split() if len(token) >= 3]
scored = []
for node_id, attrs in G.nodes(data=True):
    score = sum(token in attrs.get('label', '').lower() for token in terms)
    if score:
        scored.append((score, node_id))
scored.sort(reverse=True)
starts = [node_id for _, node_id in scored[:3]]
if not starts:
    raise SystemExit(f'No matching graph nodes for {terms!r}.')

nodes, edges = set(starts), []
if mode == 'dfs':
    stack, seen = [(node_id, 0) for node_id in starts], set()
    while stack:
        node_id, depth = stack.pop()
        if node_id in seen or depth > 6:
            continue
        seen.add(node_id)
        for neighbor in G.neighbors(node_id):
            edges.append((node_id, neighbor))
            stack.append((neighbor, depth + 1))
            nodes.add(neighbor)
else:
    frontier = set(starts)
    for _ in range(3):
        next_frontier = set()
        for node_id in frontier:
            for neighbor in G.neighbors(node_id):
                if neighbor not in nodes:
                    edges.append((node_id, neighbor))
                    next_frontier.add(neighbor)
        nodes.update(next_frontier)
        frontier = next_frontier

def edge_attrs(source, target):
    raw = G[source][target]
    return next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw

print(f'Traversal: {mode.upper()} | start nodes: {[G.nodes[n].get("label", n) for n in starts]}')
for node_id in sorted(nodes):
    attrs = G.nodes[node_id]
    print(f'NODE {attrs.get("label", node_id)} [src={attrs.get("source_file", "")} loc={attrs.get("source_location", "")} ]')
for source, target in edges:
    attrs = edge_attrs(source, target)
    print(f'EDGE {G.nodes[source].get("label", source)} --{attrs.get("relation", "")} [{attrs.get("confidence", "")} ]--> {G.nodes[target].get("label", target)} [src={attrs.get("source_file", "")} loc={attrs.get("source_location", "")} ]')
PY
```

Answer using only the displayed graph evidence and cite its `source_location`
when supporting a specific fact. State uncertainty or missing evidence plainly.

## Path

Require a unique best node match for each endpoint. Never choose the first tied
node. The following fallback reports ties and includes each edge's provenance:

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
import networkx as nx
from networkx.readwrite import json_graph

G = json_graph.node_link_graph(json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8')), edges='links')

def find_unique(term):
    ranked = sorted(
        [(sum(word in G.nodes[node].get('label', '').lower() for word in term.lower().split()), node)
         for node in G.nodes()], reverse=True)
    if not ranked or ranked[0][0] <= 0:
        return None, []
    best = ranked[0][0]
    candidates = [node for score, node in ranked if score == best]
    return (candidates[0], []) if len(candidates) == 1 else (None, candidates)

source, source_ties = find_unique(os.environ['GRAPHIFY_NODE_A'])
target, target_ties = find_unique(os.environ['GRAPHIFY_NODE_B'])
if not source or not target:
    for term, candidates in ((os.environ['GRAPHIFY_NODE_A'], source_ties), (os.environ['GRAPHIFY_NODE_B'], target_ties)):
        if candidates:
            print(f'Ambiguous match for {term!r}: {[G.nodes[n].get("label", n) for n in candidates]}')
    raise SystemExit('Refine the endpoint name; no arbitrary traversal was performed.')

path = nx.shortest_path(G, source, target)
for index, node in enumerate(path):
    print(G.nodes[node].get('label', node))
    if index + 1 < len(path):
        raw = G[node][path[index + 1]]
        edge = next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw
        print(f'  --{edge.get("relation", "")} [{edge.get("confidence", "")} ]--> [src={edge.get("source_file", "")} loc={edge.get("source_location", "")} ]')
PY
```

## Explain

Use the same unique-match rule for a single node. Include both node and edge
source locations in the result; an ambiguous lookup must report its candidates
and stop.

```bash
"$GRAPHIFY_PYTHON" - <<'PY'
import json, os
from pathlib import Path
import networkx as nx
from networkx.readwrite import json_graph

G = json_graph.node_link_graph(json.loads(Path('graphify-out/graph.json').read_text(encoding='utf-8')), edges='links')
term = os.environ['GRAPHIFY_NODE_NAME'].lower()
ranked = sorted([(sum(word in G.nodes[node].get('label', '').lower() for word in term.split()), node) for node in G.nodes()], reverse=True)
if not ranked or ranked[0][0] <= 0:
    raise SystemExit('No node match.')
best = ranked[0][0]
matches = [node for score, node in ranked if score == best]
if len(matches) != 1:
    raise SystemExit(f'Ambiguous node match: {[G.nodes[n].get("label", n) for n in matches]}')
node = matches[0]
attrs = G.nodes[node]
print(f'NODE {attrs.get("label", node)} [src={attrs.get("source_file", "")} loc={attrs.get("source_location", "")} ]')
for neighbor in G.neighbors(node):
    raw = G[node][neighbor]
    edge = next(iter(raw.values()), {}) if isinstance(G, nx.MultiGraph) else raw
    print(f'  --{edge.get("relation", "")} [{edge.get("confidence", "")} ]--> {G.nodes[neighbor].get("label", neighbor)} [src={edge.get("source_file", G.nodes[neighbor].get("source_file", ""))} loc={edge.get("source_location", "")} ]')
PY
```

## Optional Q&A persistence

Do not save queries, answers, node labels, or outcomes by default. They are
non-evidentiary derived guidance and must not be re-ingested as graph facts. A
redacted persistence record is allowed only after explicit user opt-in and a
reviewer confirms that it contains no credentials, personal data, or sensitive
content. Use a structured API or environment-backed wrapper, never interpolated
command arguments, and exclude every persisted Q&A record from extraction,
freshness, and evidence decisions.

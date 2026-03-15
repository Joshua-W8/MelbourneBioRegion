"""
PlantFactory Runtime API Probe
==============================
Run inside PlantFactory via:
  /Applications/PlantFactory/PlantFactory.app/Contents/MacOS/PlantFactory \
    --python scripts/plantfactory/pf_runtime_probe.py --

Writes results to scripts/plantfactory/probe_results.txt
"""

import sys
import os
import traceback

# Output file -- write next to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(SCRIPT_DIR, "probe_results.txt")

results = []

def log(msg):
    results.append(msg)
    print(msg)

def test(label, fn):
    """Run a test function, log success or failure."""
    log(f"\n{'='*60}")
    log(f"TEST: {label}")
    log(f"{'='*60}")
    try:
        result = fn()
        log(f"SUCCESS: {result}")
        return result
    except Exception as e:
        log(f"FAILED: {type(e).__name__}: {e}")
        log(traceback.format_exc())
        return None

# ============================================================
# Import eon
# ============================================================
import eon

app = eon.EONApplication()
child = eon.EONChild()

# ============================================================
# Test 1: Get special nodes
# ============================================================
root_node = test("GetSpecialNode('root')", lambda: child.GetSpecialNode("root"))

# Try other special node names
for name in ["Root", "trunk", "Trunk", "main", "plant", "scene"]:
    test(f"GetSpecialNode('{name}')", lambda n=name: child.GetSpecialNode(n))

# ============================================================
# Test 2: Introspect existing scene (NewScene creates a default plant)
# ============================================================
test("NewScene()", lambda: child.NewScene())
root_node = test("GetSpecialNode('root') after NewScene", lambda: child.GetSpecialNode("root"))

# Try to enumerate nodes by index
def enumerate_nodes():
    nodes = []
    for i in range(50):
        try:
            node = child.GetNodeAt(i)
            nodes.append(f"  index {i}: {node} (type: {type(node).__name__})")
        except:
            break
    return f"Found {len(nodes)} nodes:\n" + "\n".join(nodes)

test("Enumerate nodes by index", enumerate_nodes)

# ============================================================
# Test 3: Inspect node objects -- what attributes/methods do they have?
# ============================================================
def inspect_node():
    if root_node is None:
        return "No root node available"
    attrs = [a for a in dir(root_node) if not a.startswith('_')]
    return f"Root node attributes ({len(attrs)}):\n  " + "\n  ".join(attrs)

test("Inspect root node object", inspect_node)

# ============================================================
# Test 4: AddNode() -- try various argument formats
# ============================================================
# Strategy: try node IDs from node_tooltips.xml, string names, and combinations

# Try with integer node type IDs
for node_id in [8037, 8004, 8005, 8006, 8022, 8017, 8011]:
    test(f"AddNode({node_id})", lambda nid=node_id: child.AddNode(nid))

# Try with string names (guessing possible conventions)
for name in ["Segment", "segment", "Ball", "ball", "Hydra", "hydra",
             "Urchin", "urchin", "Warpboard", "warpboard", "Root", "root",
             "Next", "next", "Last", "last", "RandomNumber", "Random Number",
             "Object", "object"]:
    test(f"AddNode('{name}')", lambda n=name: child.AddNode(n))

# Try with two args: (type, name) or (parent, type)
if root_node:
    test("AddNode(root_node, 8037)", lambda: child.AddNode(root_node, 8037))
    test("AddNode(root_node, 'Segment')", lambda: child.AddNode(root_node, "Segment"))
    test("AddNode(8037, 'trunk')", lambda: child.AddNode(8037, "trunk"))

# ============================================================
# Test 5: AddAndConnectNode() -- try various argument formats
# ============================================================
if root_node:
    test("AddAndConnectNode(root_node, 8037)",
         lambda: child.AddAndConnectNode(root_node, 8037))
    test("AddAndConnectNode(root_node, 'Segment')",
         lambda: child.AddAndConnectNode(root_node, "Segment"))
    test("AddAndConnectNode(8037, root_node)",
         lambda: child.AddAndConnectNode(8037, root_node))

# ============================================================
# Test 6: NodeSetParam() -- try on root node
# ============================================================
if root_node:
    # Try various param name formats from node_tooltips.xml
    for param in ["segment/length", "SbCount", "BranchAngle",
                  "length", "radius", "height"]:
        test(f"NodeSetParam(root, '{param}', 5.0)",
             lambda p=param: child.NodeSetParam(root_node, p, 5.0))

    # Try with integer index
    for idx in [0, 1, 2]:
        test(f"NodeSetParam(root, {idx}, 5.0)",
             lambda i=idx: child.NodeSetParam(root_node, i, 5.0))

# ============================================================
# Test 7: ConnectOutputToInput() -- try argument formats
# ============================================================
def test_connect():
    # First try to get two nodes
    try:
        n0 = child.GetNodeAt(0)
        n1 = child.GetNodeAt(1)
        return child.ConnectOutputToInput(n0, n1)
    except Exception as e:
        return f"Could not test: {e}"

test("ConnectOutputToInput(node0, node1)", test_connect)

# Try with output/input indices
def test_connect_indexed():
    try:
        n0 = child.GetNodeAt(0)
        n1 = child.GetNodeAt(1)
        return child.ConnectOutputToInput(n0, 0, n1, 0)
    except Exception as e:
        return f"Could not test: {e}"

test("ConnectOutputToInput(node0, 0, node1, 0)", test_connect_indexed)

# ============================================================
# Test 8: JsonRPC -- discover available methods
# ============================================================
def test_jsonrpc_help():
    import json
    msg = json.dumps({"jsonrpc": "2.0", "method": "help", "id": 1, "params": {}})
    return eon.JsonRPC(msg)

test("JsonRPC('help')", test_jsonrpc_help)

def test_jsonrpc_list():
    import json
    msg = json.dumps({"jsonrpc": "2.0", "method": "system.listMethods", "id": 2, "params": {}})
    return eon.JsonRPC(msg)

test("JsonRPC('system.listMethods')", test_jsonrpc_list)

def test_jsonrpc_getmethods():
    import json
    msg = json.dumps({"jsonrpc": "2.0", "method": "getMethods", "id": 3, "params": {}})
    return eon.JsonRPC(msg)

test("JsonRPC('getMethods')", test_jsonrpc_getmethods)

# Try some plausible JSON-RPC methods
for method in ["getNodeTypes", "listNodeTypes", "getNodes", "listNodes",
               "getParams", "getNodeParams", "getScene", "introspect"]:
    test(f"JsonRPC('{method}')",
         lambda m=method: eon.JsonRPC(
             __import__('json').dumps({"jsonrpc": "2.0", "method": m, "id": 99, "params": {}})
         ))

# ============================================================
# Test 9: Plant metrics on default scene
# ============================================================
test("GetPlantHeight()", lambda: child.GetPlantHeight())
test("GetNumberOfPolygons()", lambda: child.GetNumberOfPolygons())
test("GetLeafNumber()", lambda: child.GetLeafNumber())
test("GetPrimitiveNumber()", lambda: child.GetPrimitiveNumber())

# ============================================================
# Test 10: Global parameter functions
# ============================================================
test("GetAgeRatio()", lambda: child.GetAgeRatio())
test("GetHealth()", lambda: child.GetHealth())
test("GetSeason()", lambda: child.GetSeason())

# ============================================================
# Test 11: Inspect eon module for any undocumented functions
# ============================================================
def inspect_eon_module():
    attrs = [a for a in dir(eon) if not a.startswith('_')]
    return f"eon module attributes ({len(attrs)}):\n  " + "\n  ".join(attrs)

test("Inspect eon module", inspect_eon_module)

# Check if JsonRPC exists at module level
test("hasattr(eon, 'JsonRPC')", lambda: hasattr(eon, 'JsonRPC'))

# ============================================================
# Write results to file
# ============================================================
log(f"\n\n{'='*60}")
log("PROBE COMPLETE")
log(f"{'='*60}")

with open(OUTPUT, 'w') as f:
    f.write("\n".join(results))

log(f"\nResults written to: {OUTPUT}")

# Exit PlantFactory
app.Exit(False)

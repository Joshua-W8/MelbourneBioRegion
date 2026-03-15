"""
PlantFactory Runtime API Probe - Round 2
========================================
Follow-up to discover:
1. The correct string name for Segment node (8037)
2. Names for flow control nodes (Next, Last, Repeat, etc.)
3. NodeSetParam() on geometry nodes
4. ConnectOutputToInput() with string-based names
5. AddAndConnectNode() behaviour

Run via:
  "/Applications/PlantFactory/PlantFactory.app/Contents/MacOS/PlantFactory" \
    --python "scripts/plantfactory/pf_runtime_probe_2.py" --
"""

import sys
import os
import traceback

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(SCRIPT_DIR, "probe_results_2.txt")

results = []

def log(msg):
    results.append(str(msg))
    print(msg)

def test(label, fn):
    log(f"\n--- {label}")
    try:
        result = fn()
        log(f"  OK: {result}")
        return result
    except Exception as e:
        log(f"  FAIL: {type(e).__name__}: {e}")
        return None

def save():
    with open(OUTPUT, 'w') as f:
        f.write("\n".join(results))

import eon
app = eon.EONApplication()
child = eon.EONChild()

# Start clean
child.NewScene()
root = child.GetSpecialNode("root")
log("=== Root node acquired ===")

# ============================================================
# PART 1: Find the Segment node name
# ============================================================
log("\n\n========== PART 1: SEGMENT NODE NAME HUNT ==========")

# Try every plausible name. The node_tooltips.xml calls it "Segment" (ID 8037)
# but that failed. Try internal/legacy names.
segment_candidates = [
    # Direct variations
    "Segment", "segment",
    # PlantFactory legacy names
    "Branch", "branch",
    "Trunk", "trunk",
    "Stem", "stem",
    "Cylinder", "cylinder",
    "Pipe", "pipe",
    "Tube", "tube",
    # e-on/VUE heritage names
    "SolidGrowth", "solidgrowth",
    "VUESegment", "TreeSegment",
    "Plant", "plant",
    "Growth", "growth",
    "Spline", "spline",
    "Axis", "axis",
    # Maybe it needs a prefix
    "GeomSegment", "Geom_Segment",
    "TPF_Segment", "TPFSegment",
    "Node_Segment",
    # French origins (e-on is French company)
    "Branche", "Tige", "Tronc",
    # From the UI breadcrumb "Geometry / Urchin" seen in screenshot
    "Geometry", "geometry",
    # Node ID as string
    "8037",
    # Compound names from tooltips
    "SegmentNode", "BranchNode",
    # Maybe the actual internal class name
    "SolidGrowthNode", "TreeBranch",
    # More variations
    "stick", "Stick", "Rod", "rod",
    "Limb", "limb", "Bough", "bough",
    "Twig", "twig", "Shoot", "shoot",
    "Beam", "beam", "Bar", "bar",
    "line", "Line", "path", "Path",
    "curve", "Curve", "arc", "Arc",
    # Maybe it's called by its geometry type
    "Generalized_Cylinder", "GCylinder",
    "Extrusion", "extrusion",
    "Sweep", "sweep",
    "SweepMesh", "sweepmesh",
]

segment_node = None
for name in segment_candidates:
    result = test(f"AddNode('{name}')", lambda n=name: child.AddNode(n))
    if result is not None:
        segment_node = result
        log(f"\n  *** FOUND WORKING NAME: '{name}' ***\n")
        # Don't break -- keep testing to find all valid names

save()  # Save intermediate results

# ============================================================
# PART 2: Find flow control node names
# ============================================================
log("\n\n========== PART 2: FLOW CONTROL NODE NAMES ==========")

flow_candidates = [
    # From node_tooltips.xml
    "Next", "next", "Last", "last",
    "All but last", "AllButLast", "allbutlast",
    "Repeat", "repeat",
    "Iteration", "iteration", "Iteration n",
    "Random inputs", "RandomInputs", "randominputs",
    "Select 2 children", "Select2Children",
    # Data nodes
    "Random Number", "RandomNumber", "randomnumber", "Random", "random",
    "Primal", "primal",
    "Section angle", "SectionAngle", "sectionangle",
    "Parent parameters", "ParentParameters", "parentparameters",
    "Multicurve", "multicurve",
    "Maturity", "maturity",
    "Season", "season",
    "Health", "health",
    "Item age", "ItemAge", "itemage",
    "Random range", "RandomRange", "randomrange",
    # Axis/shape nodes
    "Section splines set", "SectionSplinesSet",
    "Axis spline", "AxisSpline",
    # Maybe numbered
    "Select 2", "Select2",
]

for name in flow_candidates:
    test(f"AddNode('{name}')", lambda n=name: child.AddNode(n))

save()

# ============================================================
# PART 3: NodeSetParam() on a known good node
# ============================================================
log("\n\n========== PART 3: NodeSetParam ON GEOMETRY NODES ==========")

# Reset scene to avoid memory issues from Part 1/2
child.NewScene()
root = child.GetSpecialNode("root")

# Create a single Ball node
ball = test("AddNode('Ball')", lambda: child.AddNode("Ball"))

if ball:
    # Try various parameter formats
    # From node_tooltips.xml, common transformation params include scale, offset, rotation
    param_tests = [
        # Segment-specific params (may not apply to Ball)
        ("SbCount", 5),
        ("BranchAngle", 45.0),
        ("BranchStart", 0.2),
        # Common params that should exist on all geometry nodes
        ("Scale", 2.0),
        ("ScaleX", 2.0),
        ("ScaleY", 2.0),
        ("ScaleZ", 2.0),
        ("scale", 2.0),
        ("Radius", 0.5),
        ("radius", 0.5),
        ("Number", 12),
        ("number", 12),
        # UI label style
        ("Scale X", 2.0),
        ("Offset X", 1.0),
        # Path style
        ("transformations/scale", 2.0),
        ("children/number", 12),
        ("geometry/radius", 0.5),
        # Lowercase path
        ("scale/x", 2.0),
    ]

    for param, val in param_tests:
        test(f"NodeSetParam(ball, '{param}', {val})",
             lambda p=param, v=val: child.NodeSetParam(ball, p, v))

    # Try integer index (overload 2: "for nodes which have only one param")
    # The error said "PyObject is not an integer but a float" -- try int
    for idx in [0, 1, 2]:
        test(f"NodeSetParam(ball, {idx}, 5)",
             lambda i=idx: child.NodeSetParam(ball, i, 5))
        test(f"NodeSetParam(ball, {idx}, 5.0)",
             lambda i=idx: child.NodeSetParam(ball, i, 5.0))

save()

# Create an Urchin node and test its params (we saw them in the UI)
child.NewScene()
root = child.GetSpecialNode("root")
urchin = test("AddNode('Urchin')", lambda: child.AddNode("Urchin"))

if urchin:
    # From screenshot: Urchin params are Number, Radius, Scale, Distribution, Angle 1/2/3, Soft insert
    urchin_params = [
        ("Number", 12),
        ("number", 12),
        ("Radius", 0.5),
        ("radius", 0.5),
        ("Scale", 2.0),
        ("scale", 2.0),
        ("Distribution", 0.5),
        ("distribution", 0.5),
        ("Angle 1", 45.0),
        ("Angle1", 45.0),
        ("angle1", 45.0),
        ("Angle 2", 0.0),
        ("Angle 3", 0.0),
        ("Soft insert", 0),
        ("SoftInsert", 0),
        # Children section header style
        ("children/Number", 8),
        ("Children/Number", 8),
        ("CHILDREN/Number", 8),
    ]

    for param, val in urchin_params:
        test(f"NodeSetParam(urchin, '{param}', {val})",
             lambda p=param, v=val: child.NodeSetParam(urchin, p, v))

save()

# ============================================================
# PART 4: ConnectOutputToInput()
# ============================================================
log("\n\n========== PART 4: ConnectOutputToInput ==========")

child.NewScene()
root = child.GetSpecialNode("root")

ball1 = test("AddNode('Ball') #1", lambda: child.AddNode("Ball"))
ball2 = test("AddNode('Ball') #2", lambda: child.AddNode("Ball"))

if ball1 and ball2:
    # Prototype: ConnectOutputToInput(node, node) — default to default
    test("Connect ball1 -> root (default)",
         lambda: child.ConnectOutputToInput(ball1, root))

    # Prototype: ConnectOutputToInput(node, string, node, string)
    # Need to guess input/output names
    for out_name in ["Output", "output", "Geometry", "geometry", "Out", "out", "0"]:
        for in_name in ["Input", "input", "Input 1", "input 1", "In", "in", "0", "1"]:
            test(f"Connect ball1('{out_name}') -> root('{in_name}')",
                 lambda o=out_name, i=in_name:
                     child.ConnectOutputToInput(ball1, o, root, i))

    # Prototype: ConnectOutputToInput(node, node, string) — default out → named in
    for in_name in ["Input", "input", "Input 1", "input 1", "0", "1",
                    "Input1", "Input2", "Geometry", "Child", "child"]:
        test(f"Connect ball2 -> root('{in_name}')",
             lambda i=in_name: child.ConnectOutputToInput(ball2, root, i))

save()

# ============================================================
# PART 5: AddAndConnectNode() behaviour
# ============================================================
log("\n\n========== PART 5: AddAndConnectNode ==========")

child.NewScene()
root = child.GetSpecialNode("root")

# Same signature as AddNode: (string) or (string, size_t)
test("AddAndConnectNode('Ball')",
     lambda: child.AddAndConnectNode("Ball"))

test("AddAndConnectNode('Ball', 0)",
     lambda: child.AddAndConnectNode("Ball", 0))

test("AddAndConnectNode('Ball', 1)",
     lambda: child.AddAndConnectNode("Ball", 1))

test("AddAndConnectNode('Urchin', 0)",
     lambda: child.AddAndConnectNode("Urchin", 0))

test("AddAndConnectNode('Hydra', 0)",
     lambda: child.AddAndConnectNode("Hydra", 0))

# Check how many nodes exist now
def count_nodes():
    nodes = []
    for i in range(50):
        try:
            node = child.GetNodeAt(i)
            nodes.append(i)
        except:
            break
    return f"{len(nodes)} nodes in scene"

test("Count nodes after AddAndConnectNode calls", count_nodes)

save()

# ============================================================
# PART 6: Enumerate all eon module attributes for undiscovered node types
# ============================================================
log("\n\n========== PART 6: EON MODULE CONTENTS ==========")

attrs = sorted([a for a in dir(eon) if not a.startswith('_')])
log(f"All {len(attrs)} eon module attributes:")
for a in attrs:
    val = getattr(eon, a, "???")
    if not callable(val):
        log(f"  {a} = {val}")
    else:
        log(f"  {a}()")

save()

# ============================================================
# DONE
# ============================================================
log(f"\n\n{'='*60}")
log("PROBE 2 COMPLETE")
log(f"Results at: {OUTPUT}")
log(f"{'='*60}")

save()
app.Exit(False)

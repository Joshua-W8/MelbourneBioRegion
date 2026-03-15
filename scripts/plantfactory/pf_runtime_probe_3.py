"""
PlantFactory Runtime API Probe - Round 3 (Safe)
================================================
Resets scene after EVERY AddNode test to prevent memory blowout.
Saves after every test.

Run via:
  "/Applications/PlantFactory/PlantFactory.app/Contents/MacOS/PlantFactory" \
    --python "scripts/plantfactory/pf_runtime_probe_3.py" --
"""

import sys
import os
import traceback

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(SCRIPT_DIR, "probe_results_3.txt")

results = []

def log(msg):
    results.append(str(msg))

def save():
    with open(OUTPUT, 'w') as f:
        f.write("\n".join(results))

def test(label, fn):
    log(f"--- {label}")
    try:
        result = fn()
        log(f"  OK: {result}")
        save()
        return result
    except Exception as e:
        log(f"  FAIL: {type(e).__name__}: {e}")
        save()
        return None

import eon
app = eon.EONApplication()
child = eon.EONChild()

log("=== PROBE 3 START ===")
save()

# ============================================================
# PART 1: Find the Segment node name
# Reset scene after EACH attempt to avoid memory issues
# ============================================================
log("\n== PART 1: SEGMENT NODE NAME ==")

segment_candidates = [
    "Branch", "branch", "Trunk", "trunk", "Stem", "stem",
    "Cylinder", "cylinder", "Pipe", "pipe", "Tube", "tube",
    "SolidGrowth", "solidgrowth", "Growth", "growth",
    "Spline", "spline", "Axis", "axis",
    "Shoot", "shoot", "Twig", "twig", "Limb", "limb",
    "Stick", "stick", "Rod", "rod", "Bar", "bar",
    "Line", "line", "Path", "path", "Curve", "curve",
    "Arc", "arc", "Sweep", "sweep", "Extrusion", "extrusion",
    "Geometry", "geometry",
    "Branche", "Tige", "Tronc",
    "8037",
    "SegmentNode", "BranchNode", "TreeBranch", "SolidGrowthNode",
    "GCylinder", "SweepMesh", "sweepmesh",
    "Beam", "beam", "Bough", "bough",
    "GeomSegment", "Geom_Segment", "TPF_Segment", "TPFSegment",
    "Node_Segment", "node_segment",
    "VUESegment", "TreeSegment",
    "Plant", "plant",
]

found_names = []
for name in segment_candidates:
    child.NewScene()
    result = test(f"AddNode('{name}')", lambda n=name: child.AddNode(n))
    if result is not None:
        found_names.append(name)
        log(f"  *** FOUND: '{name}' ***")
        save()

log(f"\nPart 1 summary - working names: {found_names}")
save()

# ============================================================
# PART 2: Flow control node names
# ============================================================
log("\n== PART 2: FLOW CONTROL NODES ==")

flow_candidates = [
    "Next", "next", "Last", "last",
    "AllButLast", "allbutlast", "All but last",
    "Repeat", "repeat",
    "Iteration", "iteration", "Iteration n",
    "RandomInputs", "randominputs", "Random inputs",
    "Select2Children", "Select 2 children",
    "Random Number", "RandomNumber", "randomnumber",
    "Random", "random",
    "Primal", "primal",
    "SectionAngle", "sectionangle", "Section angle",
    "ParentParameters", "parentparameters", "Parent parameters",
    "Multicurve", "multicurve",
    "Maturity", "maturity",
    "RandomRange", "randomrange", "Random range",
    "ItemAge", "itemage", "Item age",
    "SectionSplinesSet", "Section splines set",
    "AxisSpline", "Axis spline",
    "AxisSplineFunction", "Axis spline - Function",
    "AxisSplineManual", "Axis spline - Manual",
    "ParentPrimitiveInstanceParameters",
    "Select2", "Select 2",
]

flow_found = []
for name in flow_candidates:
    child.NewScene()
    result = test(f"AddNode('{name}')", lambda n=name: child.AddNode(n))
    if result is not None:
        flow_found.append(name)
        log(f"  *** FOUND: '{name}' ***")
        save()

log(f"\nPart 2 summary - working names: {flow_found}")
save()

# ============================================================
# PART 3: NodeSetParam() on Urchin
# We know Urchin works and we saw its params in the UI
# ============================================================
log("\n== PART 3: NodeSetParam ON URCHIN ==")

child.NewScene()
urchin = test("AddNode('Urchin')", lambda: child.AddNode("Urchin"))

if urchin:
    params_to_try = [
        # Exact UI labels from screenshot
        ("Number", 8), ("number", 8),
        ("Radius", 0.5), ("radius", 0.5),
        ("Scale", 2.0), ("scale", 2.0),
        ("Distribution", 0.5), ("distribution", 0.5),
        ("Angle 1", 45.0), ("Angle1", 45.0), ("angle1", 45.0),
        ("Angle 2", 10.0), ("Angle2", 10.0),
        ("Angle 3", 0.0), ("Angle3", 0.0),
        ("Soft insert", 1), ("SoftInsert", 1), ("softinsert", 1),
        # Path-style
        ("children/Number", 8), ("Children/Number", 8),
        ("CHILDREN/Number", 8), ("children/number", 8),
        ("transformations/Scale", 2.0),
        # Integer index with int value (not float)
        # Overload 2 is "for nodes which have only one param"
    ]

    param_found = []
    for param, val in params_to_try:
        result = test(f"NodeSetParam(urchin, '{param}', {val})",
                     lambda p=param, v=val: child.NodeSetParam(urchin, p, v))
        if result is not None:
            param_found.append(param)
            log(f"  *** PARAM WORKS: '{param}' ***")
            save()

    # Try integer index with integer value
    for idx in range(5):
        result = test(f"NodeSetParam(urchin, {idx}, 5)",
                     lambda i=idx: child.NodeSetParam(urchin, i, 5))
        if result is not None:
            param_found.append(f"index_{idx}")
            save()

    log(f"\nPart 3 summary - working params: {param_found}")
    save()

# ============================================================
# PART 4: NodeSetParam() on Ball
# ============================================================
log("\n== PART 4: NodeSetParam ON BALL ==")

child.NewScene()
ball = test("AddNode('Ball')", lambda: child.AddNode("Ball"))

if ball:
    ball_params = [
        ("Radius", 0.5), ("radius", 0.5),
        ("Scale", 2.0), ("scale", 2.0),
        ("ScaleX", 2.0), ("ScaleY", 2.0), ("ScaleZ", 2.0),
        ("Scale X", 2.0), ("Scale Y", 2.0), ("Scale Z", 2.0),
        ("Number", 8), ("number", 8),
        ("Offset", 1.0), ("offset", 1.0),
        ("OffsetX", 1.0), ("Offset X", 1.0),
        ("Rotation", 45.0), ("rotation", 45.0),
        ("Flexibility", 0.5), ("flexibility", 0.5),
        ("MinLOD", 1), ("MaxLOD", 5),
        ("Min LOD", 1), ("Max LOD", 5),
    ]

    ball_param_found = []
    for param, val in ball_params:
        result = test(f"NodeSetParam(ball, '{param}', {val})",
                     lambda p=param, v=val: child.NodeSetParam(ball, p, v))
        if result is not None:
            ball_param_found.append(param)
            log(f"  *** PARAM WORKS: '{param}' ***")
            save()

    log(f"\nPart 4 summary - working params: {ball_param_found}")
    save()

# ============================================================
# PART 5: ConnectOutputToInput
# ============================================================
log("\n== PART 5: ConnectOutputToInput ==")

child.NewScene()
root = child.GetSpecialNode("root")
ball = test("AddNode('Ball')", lambda: child.AddNode("Ball"))

if ball and root:
    # 4-arg: (src_node, output_name, dst_node, input_name)
    connect_tests = [
        ("Output", "Input"),
        ("output", "input"),
        ("Geometry", "Input"),
        ("Geometry", "Geometry"),
        ("Out", "In"),
        ("0", "0"),
        ("Output", "Input 1"),
        ("Output", "Input1"),
        ("Geometry", "Input 1"),
        ("", ""),
        ("Output", "0"),
        ("0", "Input"),
    ]

    for out_n, in_n in connect_tests:
        test(f"Connect ball('{out_n}') -> root('{in_n}')",
             lambda o=out_n, i=in_n:
                 child.ConnectOutputToInput(ball, o, root, i))

    # 3-arg: (src, dst, input_name)
    for in_n in ["Input", "input", "Input 1", "0", "1", "Geometry",
                 "Child", "child", "Children", "children"]:
        test(f"Connect ball -> root('{in_n}') [3-arg]",
             lambda i=in_n: child.ConnectOutputToInput(ball, root, i))

    # 2-arg: (src, dst) -- default to default
    test("Connect ball -> root [2-arg]",
         lambda: child.ConnectOutputToInput(ball, root))

save()

# ============================================================
# PART 6: AddAndConnectNode
# ============================================================
log("\n== PART 6: AddAndConnectNode ==")

child.NewScene()

anc = test("AddAndConnectNode('Ball')", lambda: child.AddAndConnectNode("Ball"))
if anc:
    log("  AddAndConnectNode works with just string name")

child.NewScene()
anc2 = test("AddAndConnectNode('Ball', 0)", lambda: child.AddAndConnectNode("Ball", 0))
if anc2:
    log("  AddAndConnectNode works with (name, index)")

child.NewScene()
anc3 = test("AddAndConnectNode('Urchin', 0)", lambda: child.AddAndConnectNode("Urchin", 0))

child.NewScene()
anc4 = test("AddAndConnectNode('Hydra', 0)", lambda: child.AddAndConnectNode("Hydra", 0))

child.NewScene()
anc5 = test("AddAndConnectNode('Warpboard', 0)", lambda: child.AddAndConnectNode("Warpboard", 0))

save()

# ============================================================
# DONE
# ============================================================
log("\n\n=== PROBE 3 COMPLETE ===")
save()

app.Exit(False)

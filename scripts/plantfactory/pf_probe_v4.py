"""
Run via Scripts > Run Python File.
Results at /tmp/pf_probe4.txt

Key insight: NewScene() wipes context needed for AddNode().
This script calls NewScene() ONCE then tests on that scene.
"""
import eon

OUT = "/tmp/pf_probe4.txt"
R = []

def log(msg):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

app = eon.EONApplication()
child = eon.EONChild()

log("=== PROBE V4 START ===")
save()

# --- Setup: single NewScene, then work on it ---
child.NewScene()
root = child.GetSpecialNode("root")
log(f"Root: {root}")
save()

# --- PART 1: What nodes exist after NewScene? ---
log("\n[PART 1] Nodes after NewScene")
for i in range(20):
    try:
        n = child.GetNodeAt(i)
        log(f"  node[{i}] = {n}")
    except:
        log(f"  node count = {i}")
        break
save()

# --- PART 2: Try AddNode for segment-like names (NO NewScene between) ---
# Only try a few to avoid memory issues
log("\n[PART 2] AddNode - geometry nodes (single scene)")
geo_names = [
    "Ball", "Hydra", "Urchin", "Warpboard", "Object",
    "Segment", "Branch", "Trunk", "Stem",
]
for name in geo_names:
    try:
        n = child.AddNode(name)
        log(f"  AddNode('{name}') -> OK: {n}")
    except Exception as e:
        msg = str(e).split('\n')[0]
        log(f"  AddNode('{name}') -> FAIL: {msg}")
    save()

# --- PART 3: Try flow control names ---
log("\n[PART 3] AddNode - flow/data nodes")
flow_names = [
    "Next", "Last", "Repeat", "AllButLast", "All but last",
    "Iteration", "Iteration n", "Random", "RandomInputs",
    "Random inputs", "Select2", "Select 2 children",
    "RandomNumber", "Random Number",
    "Primal", "Multicurve", "Maturity",
    "RandomRange", "Random range",
    "ItemAge", "Item age",
    "ParentParameters", "Parent parameters",
]
for name in flow_names:
    try:
        n = child.AddNode(name)
        log(f"  AddNode('{name}') -> OK: {n}")
    except Exception as e:
        msg = str(e).split('\n')[0]
        log(f"  AddNode('{name}') -> FAIL: {msg}")
    save()

# --- PART 4: NodeSetParam on nodes we know exist ---
# Get nodes by index - some were created by AddNode above
log("\n[PART 4] NodeSetParam tests")

# First, find a Ball or Urchin node
# From probe 1, Ball was at various indices. Let's get all nodes.
all_nodes = []
for i in range(50):
    try:
        all_nodes.append((i, child.GetNodeAt(i)))
    except:
        break
log(f"  Total nodes: {len(all_nodes)}")

# Try params on each node
if len(all_nodes) > 4:
    # Nodes 0-3 are Age/Root/Season/Health from NewScene
    # Nodes 4+ are ones we added
    test_node = all_nodes[4][1]  # First added node (should be Ball)
    idx = all_nodes[4][0]
    log(f"  Testing params on node[{idx}]")

    params = [
        ("Number", 8), ("number", 8),
        ("Radius", 0.5), ("radius", 0.5),
        ("Scale", 2.0), ("scale", 2.0),
        ("ScaleX", 2.0), ("Scale X", 2.0),
        ("Distribution", 0.5),
        ("Angle 1", 45.0), ("Angle1", 45.0),
        ("Flexibility", 0.5),
        ("SbCount", 5), ("BranchAngle", 45.0),
        ("children/Number", 8), ("Children/Number", 8),
        ("transformations/Scale", 2.0),
        ("Min LOD", 1), ("MinLOD", 1),
        ("Max LOD", 5), ("MaxLOD", 5),
    ]

    param_ok = []
    for p, v in params:
        try:
            child.NodeSetParam(test_node, p, v)
            log(f"  SetParam('{p}', {v}) -> OK")
            param_ok.append(p)
        except Exception as e:
            msg = str(e).split('\n')[0]
            log(f"  SetParam('{p}', {v}) -> FAIL: {msg}")
        save()

    log(f"\n  Working params: {param_ok}")

    # Try on second added node too (Hydra)
    if len(all_nodes) > 5:
        test_node2 = all_nodes[5][1]
        idx2 = all_nodes[5][0]
        log(f"\n  Testing params on node[{idx2}] (Hydra)")
        for p, v in params:
            try:
                child.NodeSetParam(test_node2, p, v)
                log(f"  SetParam('{p}', {v}) -> OK")
            except Exception as e:
                msg = str(e).split('\n')[0]
                log(f"  SetParam('{p}', {v}) -> FAIL: {msg}")
            save()

save()

# --- PART 5: ConnectOutputToInput ---
log("\n[PART 5] ConnectOutputToInput")
if len(all_nodes) > 4:
    src = all_nodes[4][1]  # Ball

    # 2-arg
    try:
        child.ConnectOutputToInput(src, root)
        log("  Connect(ball, root) 2-arg -> OK")
    except Exception as e:
        log(f"  Connect(ball, root) 2-arg -> FAIL: {e}")
    save()

    # 3-arg: (src, dst, input_name)
    for iname in ["Input", "input", "Input 1", "Input1", "0", "1",
                  "Geometry", "Child", "Children"]:
        try:
            child.ConnectOutputToInput(src, root, iname)
            log(f"  Connect 3-arg dst='{iname}' -> OK")
        except Exception as e:
            msg = str(e).split('\n')[0]
            log(f"  Connect 3-arg dst='{iname}' -> FAIL: {msg}")
        save()

    # 4-arg: (src, out_name, dst, in_name)
    for oname, iname in [("Output","Input"), ("output","input"),
                          ("Geometry","Input"), ("Geometry","Geometry"),
                          ("0","0"), ("Output","Input 1"),
                          ("Output","0"), ("0","Input")]:
        try:
            child.ConnectOutputToInput(src, oname, root, iname)
            log(f"  Connect 4-arg('{oname}','{iname}') -> OK")
        except Exception as e:
            msg = str(e).split('\n')[0]
            log(f"  Connect 4-arg('{oname}','{iname}') -> FAIL: {msg}")
        save()

# --- PART 6: AddAndConnectNode ---
log("\n[PART 6] AddAndConnectNode (no NewScene)")
for name in ["Ball", "Urchin", "Hydra", "Warpboard"]:
    try:
        n = child.AddAndConnectNode(name)
        log(f"  AddAndConnectNode('{name}') -> OK")
    except Exception as e:
        msg = str(e).split('\n')[0]
        log(f"  AddAndConnectNode('{name}') -> FAIL: {msg}")
    save()

# --- PART 7: Check plant metrics ---
log("\n[PART 7] Plant metrics")
try: log(f"  Height: {child.GetPlantHeight()}")
except: log("  Height: FAIL")
try: log(f"  Polygons: {child.GetNumberOfPolygons()}")
except: log("  Polygons: FAIL")
try: log(f"  Leaves: {child.GetLeafNumber()}")
except: log("  Leaves: FAIL")
try: log(f"  Age: {child.GetAgeRatio()}")
except: log("  Age: FAIL")
save()

log("\n=== PROBE V4 COMPLETE ===")
save()
print(f"Done! Results at {OUT}")

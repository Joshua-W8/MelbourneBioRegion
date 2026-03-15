"""
Run via PlantFactory's Scripts > Run Python File menu.
Results written to /tmp/pf_probe.txt
"""
import eon

OUT = "/tmp/pf_probe.txt"
R = []

def log(msg):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

def try_add(name):
    try:
        child.NewScene()
        n = child.AddNode(name)
        log(f"  AddNode('{name}') -> OK")
        return True
    except:
        log(f"  AddNode('{name}') -> FAIL")
        return False

def try_param(node, param, val):
    try:
        child.NodeSetParam(node, param, val)
        log(f"  SetParam('{param}', {val}) -> OK")
        return True
    except Exception as e:
        log(f"  SetParam('{param}', {val}) -> FAIL: {e}")
        return False

def try_connect(src, dst):
    try:
        child.ConnectOutputToInput(src, dst)
        log(f"  Connect 2-arg -> OK")
        return True
    except Exception as e:
        log(f"  Connect 2-arg -> FAIL: {e}")
        return False

def try_connect3(src, dst, name):
    try:
        child.ConnectOutputToInput(src, dst, name)
        log(f"  Connect 3-arg('{name}') -> OK")
        return True
    except Exception as e:
        log(f"  Connect 3-arg('{name}') -> FAIL: {e}")
        return False

def try_connect4(src, oname, dst, iname):
    try:
        child.ConnectOutputToInput(src, oname, dst, iname)
        log(f"  Connect 4-arg('{oname}','{iname}') -> OK")
        return True
    except Exception as e:
        log(f"  Connect 4-arg('{oname}','{iname}') -> FAIL: {e}")
        return False

def try_anc(name):
    try:
        child.NewScene()
        n = child.AddAndConnectNode(name)
        log(f"  AddAndConnectNode('{name}') -> OK")
        return True
    except:
        log(f"  AddAndConnectNode('{name}') -> FAIL")
        return False

app = eon.EONApplication()
child = eon.EONChild()

log("=== PF PROBE START ===")
save()

# --- PART 1: Find Segment node name ---
log("\n[PART 1] Segment node name hunt")
names = [
    "Branch", "branch", "Trunk", "trunk", "Stem", "stem",
    "Cylinder", "cylinder", "Pipe", "pipe", "Tube", "tube",
    "SolidGrowth", "Growth", "growth", "Shoot", "shoot",
    "Spline", "spline", "Axis", "axis", "Curve", "curve",
    "Sweep", "sweep", "Extrusion", "Line", "line",
    "Path", "path", "Stick", "stick", "Rod", "rod",
    "Twig", "twig", "Limb", "limb", "Beam", "beam",
    "Branche", "Tige", "Tronc",
    "8037", "SegmentNode", "BranchNode", "TreeBranch",
    "SolidGrowthNode", "GCylinder", "Geometry", "geometry",
    "Plant", "plant", "Bough", "bough", "Arc", "arc",
    "Bar", "bar",
]
seg_found = []
for n in names:
    if try_add(n):
        seg_found.append(n)
save()
log(f"\nSegment hunt results: {seg_found}")
save()

# --- PART 2: Flow control node names ---
log("\n[PART 2] Flow control nodes")
flow_names = [
    "Next", "next", "Last", "last", "Repeat", "repeat",
    "AllButLast", "All but last", "Iteration", "Iteration n",
    "RandomInputs", "Random inputs", "Random", "random",
    "Select2Children", "Select 2 children", "Select 2",
    "RandomNumber", "Random Number",
    "Primal", "primal", "SectionAngle", "Section angle",
    "ParentParameters", "Parent parameters",
    "Multicurve", "multicurve", "Maturity", "maturity",
    "RandomRange", "Random range", "ItemAge", "Item age",
    "SectionSplinesSet", "Section splines set",
    "AxisSpline", "Axis spline",
]
flow_found = []
for n in flow_names:
    if try_add(n):
        flow_found.append(n)
save()
log(f"\nFlow control results: {flow_found}")
save()

# --- PART 3: NodeSetParam on Urchin ---
log("\n[PART 3] NodeSetParam on Urchin")
child.NewScene()
urchin = child.AddNode("Urchin")
params = [
    ("Number", 8), ("number", 8),
    ("Radius", 0.5), ("radius", 0.5),
    ("Scale", 2.0), ("scale", 2.0),
    ("Distribution", 0.5), ("distribution", 0.5),
    ("Angle 1", 45.0), ("Angle1", 45.0), ("angle1", 45.0),
    ("Angle 2", 10.0), ("Angle2", 10.0),
    ("Angle 3", 0.0), ("Angle3", 0.0),
    ("Soft insert", 1), ("SoftInsert", 1),
    ("children/Number", 8), ("Children/Number", 8),
    ("CHILDREN/Number", 8), ("children/number", 8),
    ("transformations/Scale", 2.0),
    ("ScaleX", 2.0), ("Scale X", 2.0),
    ("OffsetX", 1.0), ("Offset X", 1.0),
    ("Flexibility", 0.5),
    ("Min LOD", 1), ("MinLOD", 1),
    ("Max LOD", 5), ("MaxLOD", 5),
]
param_found = []
for p, v in params:
    if try_param(urchin, p, v):
        param_found.append(p)
save()
log(f"\nUrchin param results: {param_found}")
save()

# --- PART 4: NodeSetParam integer index ---
log("\n[PART 4] NodeSetParam integer index on Urchin")
for i in range(5):
    try_param(urchin, i, 5)
save()

# --- PART 5: ConnectOutputToInput ---
log("\n[PART 5] ConnectOutputToInput")
child.NewScene()
root = child.GetSpecialNode("root")
b = child.AddNode("Ball")

try_connect(b, root)

for iname in ["Input", "input", "Input 1", "Input1", "0", "1",
              "Geometry", "Child", "child", "Children"]:
    try_connect3(b, root, iname)

for oname in ["Output", "output", "Geometry", "0"]:
    for iname in ["Input", "input", "Input 1", "0"]:
        try_connect4(b, oname, root, iname)
save()

# --- PART 6: AddAndConnectNode ---
log("\n[PART 6] AddAndConnectNode")
for n in ["Ball", "Urchin", "Hydra", "Warpboard", "Object"]:
    try_anc(n)
save()

log("\n=== PROBE COMPLETE ===")
log(f"Segment names found: {seg_found}")
log(f"Flow control found: {flow_found}")
log(f"Urchin params found: {param_found}")
save()
print(f"\nDone! Results at {OUT}")

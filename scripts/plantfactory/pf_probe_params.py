"""
Test ONLY NodeSetParam and ConnectOutputToInput on known-good nodes.
No Segment/Object/flow control attempts. Minimal node creation.
Results at /tmp/pf_params.txt
"""
import eon

OUT = "/tmp/pf_params.txt"
R = []

def log(msg):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

app = eon.EONApplication()
child = eon.EONChild()

child.NewScene()
root = child.GetSpecialNode("root")
log("=== PARAM PROBE START ===")
save()

# Create just two nodes
ball = child.AddNode("Ball")
log(f"Ball created: {ball}")
urchin = child.AddNode("Urchin")
log(f"Urchin created: {urchin}")
save()

# --- NodeSetParam on Ball ---
log("\n[Ball] NodeSetParam tests:")
ball_params = [
    ("Number", 8), ("number", 8),
    ("Radius", 0.5), ("radius", 0.5),
    ("Scale", 2.0), ("scale", 2.0),
    ("ScaleX", 2.0), ("ScaleY", 2.0), ("ScaleZ", 2.0),
    ("Scale X", 2.0), ("Scale Y", 2.0),
    ("Flexibility", 0.5), ("flexibility", 0.5),
    ("Min LOD", 1), ("MinLOD", 1), ("Min_LOD", 1),
    ("Max LOD", 5), ("MaxLOD", 5),
    ("Offset X", 1.0), ("OffsetX", 1.0),
    ("SbCount", 5), ("BranchAngle", 45.0),
    ("children/Number", 8),
    ("transformations/Scale", 2.0),
]
ball_ok = []
for p, v in ball_params:
    try:
        child.NodeSetParam(ball, p, v)
        log(f"  '{p}' = {v} -> OK")
        ball_ok.append(p)
    except Exception as e:
        msg = str(e).split('\n')[0][:80]
        log(f"  '{p}' = {v} -> FAIL: {msg}")
    save()
log(f"\nBall working params: {ball_ok}")
save()

# --- NodeSetParam on Urchin ---
log("\n[Urchin] NodeSetParam tests:")
urchin_params = [
    ("Number", 8), ("number", 8),
    ("Radius", 0.5), ("radius", 0.5),
    ("Scale", 2.0), ("scale", 2.0),
    ("Distribution", 0.5), ("distribution", 0.5),
    ("Angle 1", 45.0), ("Angle1", 45.0), ("angle1", 45.0),
    ("Angle 2", 10.0), ("Angle2", 10.0),
    ("Angle 3", 0.0), ("Angle3", 0.0),
    ("Soft insert", 1), ("SoftInsert", 1),
    ("ScaleX", 2.0), ("Scale X", 2.0),
    ("Flexibility", 0.5),
    ("children/Number", 8),
    ("transformations/Scale", 2.0),
]
urchin_ok = []
for p, v in urchin_params:
    try:
        child.NodeSetParam(urchin, p, v)
        log(f"  '{p}' = {v} -> OK")
        urchin_ok.append(p)
    except Exception as e:
        msg = str(e).split('\n')[0][:80]
        log(f"  '{p}' = {v} -> FAIL: {msg}")
    save()
log(f"\nUrchin working params: {urchin_ok}")
save()

# --- ConnectOutputToInput ---
log("\n[Connect] ConnectOutputToInput tests:")

# 2-arg
try:
    child.ConnectOutputToInput(ball, root)
    log("  (ball, root) 2-arg -> OK")
except Exception as e:
    log(f"  (ball, root) 2-arg -> FAIL: {str(e)[:80]}")
save()

# 3-arg
for iname in ["Input", "input", "Input 1", "Input1",
              "0", "1", "Geometry", "Child"]:
    try:
        child.ConnectOutputToInput(ball, root, iname)
        log(f"  3-arg(ball, root, '{iname}') -> OK")
    except Exception as e:
        log(f"  3-arg(ball, root, '{iname}') -> FAIL: {str(e)[:80]}")
    save()

# 4-arg
for oname, iname in [("Output","Input"), ("output","input"),
                      ("Geometry","Input"), ("0","0"),
                      ("Output","Input 1"), ("Output","0")]:
    try:
        child.ConnectOutputToInput(ball, oname, root, iname)
        log(f"  4-arg('{oname}','{iname}') -> OK")
    except Exception as e:
        log(f"  4-arg('{oname}','{iname}') -> FAIL: {str(e)[:80]}")
    save()

# --- AddAndConnectNode ---
log("\n[AddAndConnect] tests:")
try:
    child.AddAndConnectNode("Ball")
    log("  AddAndConnectNode('Ball') -> OK")
except Exception as e:
    log(f"  AddAndConnectNode('Ball') -> FAIL: {str(e)[:80]}")
save()

try:
    child.AddAndConnectNode("Ball", 0)
    log("  AddAndConnectNode('Ball', 0) -> OK")
except Exception as e:
    log(f"  AddAndConnectNode('Ball', 0) -> FAIL: {str(e)[:80]}")
save()

# --- LoadPlant test (can we load a .tpf and get its nodes?) ---
log("\n[LoadPlant] Can we load and inspect?")
try:
    # Check if any .tpf files exist
    import glob
    tpfs = glob.glob("/Users/joshuawait/Documents/e-on software/PlantFactory/Species/**/*.tpf", recursive=True)
    log(f"  Found {len(tpfs)} .tpf files in user dir")
    for t in tpfs[:5]:
        log(f"    {t}")
except:
    log("  No .tpf scan")
save()

log("\n=== PARAM PROBE COMPLETE ===")
save()
print(f"Done! Results at {OUT}")

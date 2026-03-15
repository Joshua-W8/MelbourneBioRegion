"""
Probe the Red Currant template to study its node graph structure,
parameter values, and child distribution settings.

USAGE: Open "Red Currant.tpf" in PlantFactory, then run via Scripts > Run Python File.
Results saved to /tmp/pf_red_currant_probe.txt
"""
import eon

OUT = "/tmp/pf_red_currant_probe.txt"
R = []

def log(msg=""):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

app = eon.EONApplication()
child = eon.EONChild()

log("=" * 70)
log("RED CURRANT TEMPLATE - NODE GRAPH PROBE")
log("=" * 70)

# --- 1. Discover all nodes ---
log("\n### NODE INDEX SCAN ###\n")
nodes = []
for i in range(30):
    try:
        node = child.GetNodeAt(i)
        nodes.append((i, node))
        log(f"  Node {i}: {node}")
    except Exception as e:
        log(f"  Node {i}: -- end of graph --")
        break
save()

# --- 2. Try GetSpecialNode for known names ---
log("\n### SPECIAL NODES ###\n")
special_names = ["root", "Root", "age", "Age", "season", "Season",
                 "health", "Health", "trunk", "Trunk"]
for name in special_names:
    try:
        sn = child.GetSpecialNode(name)
        log(f"  GetSpecialNode('{name}'): {sn}")
    except Exception as e:
        log(f"  GetSpecialNode('{name}'): FAILED - {str(e).split(chr(10))[0][:60]}")
save()

# --- 3. Probe parameters on each node ---
log("\n### PARAMETER PROBE PER NODE ###\n")

# Common segment parameters
segment_params = [
    "Length", "Minimum length", "Radius", "Radius mode",
    "Inherit ratio", "Minimum radius", "Tropism", "Section",
    "Skin",
]

# Child distribution parameters
child_params = [
    "Number", "Start", "End", "Randomness",
    "Arrangement", "Angle", "Coil", "Move out", "Roll",
    "Cone Angle",
]

# Influence parameters
influence_params = [
    "Strength", "Frequency", "Make planar",
    "Bending", "Smoothness", "Zigzag strength",
]

# Inherited / scale
inherited_params = [
    "Scale", "Density", "Soft insert", "Min LOD",
]

# Transformation params
transform_params = [
    "Depth", "Offset", "Rotation Angles",
]

# Setup params (scene-level)
setup_params = [
    "Seed", "Max age", "Age", "Health", "Gravity strength", "Season",
]

all_test_params = (
    [("SEGMENT", p) for p in segment_params]
    + [("CHILD", p) for p in child_params]
    + [("INFLUENCE", p) for p in influence_params]
    + [("INHERITED", p) for p in inherited_params]
    + [("TRANSFORM", p) for p in transform_params]
    + [("SETUP", p) for p in setup_params]
)

for idx, node in nodes:
    log(f"\n--- Node {idx}: {node} ---")
    found = []
    for category, param in all_test_params:
        try:
            val = child.NodeGetParam(node, param)
            found.append((category, param, val))
            log(f"  [{category}] {param} = {val}")
        except Exception:
            pass  # skip params that don't apply to this node

    if not found:
        log(f"  (no readable parameters found)")
    save()

# --- 4. Try to read child count / connections ---
log("\n### NODE CONNECTION PROBE ###\n")
for idx, node in nodes:
    log(f"\n--- Node {idx}: {node} ---")
    # Try GetInputCount / GetOutputCount if available
    for method_name in ["GetInputCount", "GetOutputCount", "GetChildCount",
                        "GetInputNode", "GetOutputNode"]:
        try:
            method = getattr(node, method_name, None)
            if method:
                result = method()
                log(f"  {method_name}() = {result}")
        except Exception as e:
            log(f"  {method_name}() FAILED: {str(e)[:50]}")
    save()

# --- 5. Summary ---
log("\n" + "=" * 70)
log("SUMMARY")
log("=" * 70)
log(f"Total nodes discovered: {len(nodes)}")
log(f"\nNode list:")
for idx, node in nodes:
    log(f"  [{idx}] {node}")
log(f"\nResults saved to: {OUT}")
save()

"""
Red Currant probe v2 - uses NodeGetParamName to discover actual parameter names,
then reads their values. Also tries to identify node types.

USAGE: Open "Red Currant.tpf" in PlantFactory, then Scripts > Run Python File.
Results saved to /tmp/pf_red_currant_v2.txt
"""
import eon

OUT = "/tmp/pf_red_currant_v2.txt"
R = []

def log(msg=""):
    R.append(str(msg))
    print(str(msg))

def save():
    with open(OUT, "w") as f:
        f.write("\n".join(R))

child = eon.EONChild()

log("=" * 70)
log("RED CURRANT - FULL PARAMETER DISCOVERY")
log("=" * 70)

# Discover all nodes
nodes = []
for i in range(40):
    try:
        node = child.GetNodeAt(i)
        nodes.append((i, node))
    except:
        break

log(f"\nTotal nodes: {len(nodes)}")

# For each node, discover parameter names by index
for idx, node in nodes:
    log(f"\n{'='*60}")
    log(f"NODE {idx}")
    log(f"{'='*60}")

    # Try to get node name/label
    for attr in ["GetName", "GetLabel", "GetType", "GetClassName",
                 "GetNodeName", "GetTypeName", "name", "label"]:
        try:
            method = getattr(node, attr, None)
            if method:
                if callable(method):
                    result = method()
                else:
                    result = method
                if result:
                    log(f"  {attr}: {result}")
        except:
            pass

    # Discover parameters by index using NodeGetParamName
    param_count = 0
    for p_idx in range(200):  # try up to 200 params per node
        try:
            param_name = child.NodeGetParamName(node, p_idx)
            if param_name:
                # Try to read the value
                try:
                    val = child.NodeGetParam(node, param_name)
                    log(f"  [{p_idx:3d}] {param_name} = {val}")
                except:
                    log(f"  [{p_idx:3d}] {param_name} = (unreadable)")
                param_count += 1
        except Exception as e:
            # Once we hit an error, likely end of params for this node
            if p_idx > 0:
                break
            # If first param fails, try a few more before giving up
            if p_idx == 0:
                continue

    if param_count == 0:
        # Fallback: try a massive list of known param names
        known_params = [
            "Length", "length", "Radius", "radius", "Scale", "scale",
            "Number", "number", "Angle", "angle", "Start", "start",
            "End", "end", "Tropism", "tropism", "Coil", "coil",
            "Randomness", "randomness", "Strength", "strength",
            "Frequency", "frequency", "Density", "density",
            "Seed", "seed", "Age", "age", "Health", "health",
            "Season", "season", "Gravity strength",
            "Inherit ratio", "Minimum radius", "Minimum length",
            "Soft insert", "Min LOD", "Max age",
            "Move out", "Roll", "Rotation",
            "Bending", "Smoothness", "Zigzag strength",
            "Shrink radius", "Force subdivision",
            "Upper width", "Lower width", "Child width",
            "Move away", "Blend materials",
            "Cut probability", "Cut length", "Radius Reduction",
            "Depth", "Offset",
        ]
        found_any = False
        for pname in known_params:
            try:
                val = child.NodeGetParam(node, pname)
                log(f"  (fallback) {pname} = {val}")
                found_any = True
            except:
                pass
        if not found_any:
            log(f"  (no parameters discovered)")

    save()

# Also try to discover node type via special node matching
log(f"\n{'='*60}")
log("SPECIAL NODE IDENTIFICATION")
log(f"{'='*60}")

special_names = [
    "root", "Root", "trunk", "Trunk",
    "season", "Season", "health", "Health",
    "age", "Age", "wind", "Wind",
    "leaves", "Leaves", "leaf", "Leaf",
    "flower", "Flower", "fruit", "Fruit",
    "berry", "Berry", "branch", "Branch",
    "twig", "Twig",
]

for name in special_names:
    try:
        sn = child.GetSpecialNode(name)
        # Find which node index this matches
        for idx, node in nodes:
            if str(sn) == str(node):
                log(f"  '{name}' -> Node {idx}")
                break
        else:
            log(f"  '{name}' -> found (no index match)")
    except:
        pass

save()
log(f"\nResults saved to: {OUT}")
save()

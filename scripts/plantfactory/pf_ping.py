import os
with open("/tmp/pf_ping.txt", "w") as f:
    f.write("PlantFactory Python is alive\n")
    f.write(f"__file__ = {__file__}\n")
    f.write(f"cwd = {os.getcwd()}\n")
print("PING: script executed")

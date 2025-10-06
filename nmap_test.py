import subprocess
import shlex

print("[*] Starting direct Nmap test using subprocess...")
target = "45.33.32.156"
# This is our final, corrected Nmap command
nmap_args = [
    "nmap",
    "-sV",
    "-Pn",
    "--script",
    "vuln and not smb-*",
    target
]

print(f"[*] Running command: {' '.join(nmap_args)}")

try:
    # Run the command directly, with a long timeout
    result = subprocess.run(
        nmap_args,
        capture_output=True,
        text=True,
        timeout=600  # 10-minute timeout
    )

    print("\n--- Nmap STDOUT ---")
    print(result.stdout)
    print("\n--- Nmap STDERR ---")
    print(result.stderr)
    print(f"\n[*] Test finished with exit code: {result.returncode}")

except subprocess.TimeoutExpired:
    print("\n[!!!] TEST FAILED: The Nmap command timed out after 10 minutes.")
except Exception as e:
    print(f"\n[!!!] TEST FAILED: An unexpected error occurred: {e}")
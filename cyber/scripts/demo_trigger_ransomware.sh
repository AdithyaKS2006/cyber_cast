#!/bin/bash
# ==============================================================================
# CrimeCast - Simulated Ransomware Trigger
# ==============================================================================
# This script simulates a ransomware/malware establishing a C2 beacon to a 
# suspicious IP. It will keep the connection attempt alive so that the local 
# CrimeCast agent detects it via network telemetry.
# ==============================================================================

MALICIOUS_IP="185.15.247.140"
PORT="4444"

echo "[*] Initiating simulated ransomware C2 beacon..."
echo "[*] Target Malicious IP: $MALICIOUS_IP:$PORT"
echo "[*] This process will remain active. The CrimeCast agent will detect it"
echo "[*] on its next cycle and report it to the backend."
echo ""
echo "[*] Keep this terminal open. Watch your Dashboard to see the threat appear,"
echo "[*] and wait for the agent's next cycle to automatically block it via UFW!"
echo ""

# Loop to maintain active connection attempts using built-in bash features (no 'nc' required)
while true; do
    # This will hang in SYN_SENT state, which the agent will pick up
    timeout 5 bash -c "echo > /dev/tcp/$MALICIOUS_IP/$PORT" 2>/dev/null
    sleep 1
done

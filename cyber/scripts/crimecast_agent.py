#!/usr/bin/env python3
"""
CrimeCast Agent v1.0 — DEMO VERSION
=======================================
Lightweight server monitoring agent.

HOW TO RUN ON ANY LAPTOP:
  python3 crimecast_agent.py \
    --id   AGENT_UUID \
    --key  API_KEY \
    --server http://YOUR_SERVER_IP:8000

REQUIREMENTS: Python 3.6+ only. No pip install needed.
WORKS ON: Linux, macOS, Windows (with Python)
"""

import argparse, json, platform, socket, subprocess
import sys, time, logging, urllib.request, urllib.error
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format='[CS-Agent %(asctime)s] %(message)s',
    datefmt='%H:%M:%S'
)
log = logging.getLogger('cs-agent')

PRIVATE_PREFIXES = ('10.', '172.', '192.168.', '127.', '::1', 'fe80', '169.')

def is_public_ip(ip):
    return ip and not any(ip.startswith(p) for p in PRIVATE_PREFIXES)

# ─── Collectors (safe, read-only, no root needed) ─────────────────────────────

def collect_network_connections():
    events = []
    try:
        # Works on Linux and macOS
        cmd = ['ss', '-tnp'] if platform.system() != 'Darwin' else ['netstat', '-tn']
        out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines()[1:]:
            parts = line.split()
            if len(parts) < 5:
                continue
            peer = parts[4] if platform.system() != 'Darwin' else parts[4]
            if ':' not in peer:
                continue
            remote_ip = peer.rsplit(':', 1)[0].strip('[]')
            remote_port = peer.rsplit(':', 1)[1] if ':' in peer else '0'
            
            # Whitelist standard web traffic and FCM to prevent false positives
            if remote_port in ['80', '443', '5228', '5229', '5230']:
                continue
                
            if is_public_ip(remote_ip):
                process = parts[5] if len(parts) > 5 else 'unknown'
                events.append({
                    'type':        'connection',
                    'remote_ip':   remote_ip,
                    'remote_port': remote_port,
                    'process':     process,
                    'timestamp':   datetime.now(timezone.utc).isoformat(),
                })
    except Exception as e:
        log.debug(f'Network collector: {e}')
    return events

def collect_failed_logins():
    events = []
    log_paths = ['/var/log/auth.log', '/var/log/secure', '/var/log/messages']
    for log_path in log_paths:
        try:
            out = subprocess.check_output(
                ['grep', 'Failed password', log_path],
                text=True, stderr=subprocess.DEVNULL
            )
            ip_counts = {}
            for line in out.splitlines()[-200:]:
                parts = line.split()
                for i, p in enumerate(parts):
                    if p == 'from' and i + 1 < len(parts):
                        src_ip = parts[i + 1]
                        if is_public_ip(src_ip):
                            ip_counts[src_ip] = ip_counts.get(src_ip, 0) + 1
            for ip, count in ip_counts.items():
                if count >= 5:
                    events.append({
                        'type':      'failed_login',
                        'source_ip': ip,
                        'count':     count,
                        'user':      'root',
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                    })
            break
        except Exception:
            continue
    return events

def collect_suspicious_processes():
    events = []
    SUSPICIOUS = ['nc ', 'ncat', 'nmap', 'masscan', 'xmrig', 'minerd',
                  'msfconsole', 'metasploit', 'python3 -c', 'bash -i']
    try:
        out = subprocess.check_output(['ps', 'aux'], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines()[1:]:
            parts = line.split(None, 10)
            if len(parts) < 11:
                continue
            cmdline = parts[10]
            for sus in SUSPICIOUS:
                if sus in cmdline:
                    events.append({
                        'type':      'suspicious_process',
                        'name':      parts[10].split()[0],
                        'cmdline':   cmdline[:200],
                        'pid':       parts[1],
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                    })
                    break
    except Exception as e:
        log.debug(f'Process collector: {e}')
    return events

# ─── API communication ────────────────────────────────────────────────────────

def api_call(server, path, api_key, payload=None):
    url = f'{server.rstrip("/")}{path}'
    data = json.dumps(payload or {}).encode()
    req = urllib.request.Request(
        url, data=data, method='POST',
        headers={'Content-Type': 'application/json', 'X-Agent-Key': api_key}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        log.warning(f'API HTTP {e.code}: {e.reason}')
    except Exception as e:
        log.warning(f'API error: {e}')
    return None

def get_telemetry():
    telemetry = {}
    telemetry = {}
    
    # Try to get OS version
    try:
        if platform.system() == 'Linux':
            with open('/etc/os-release') as f:
                for line in f:
                    if line.startswith('PRETTY_NAME='):
                        telemetry['os_version'] = line.split('=')[1].strip().strip('"')
                        break
        elif platform.system() == 'Windows':
            telemetry['os_version'] = f"Windows {platform.release()}"
        elif platform.system() == 'Darwin':
            telemetry['os_version'] = f"macOS {platform.mac_ver()[0]}"
    except Exception:
        telemetry['os_version'] = platform.platform()

    # Try to get CPU/Mem usage using psutil if available
    try:
        import psutil
        telemetry['cpu_usage'] = psutil.cpu_percent(interval=0.1)
        telemetry['memory_usage'] = psutil.virtual_memory().percent
        
        # Battery if available
        if hasattr(psutil, 'sensors_battery'):
            batt = psutil.sensors_battery()
            if batt:
                telemetry['battery_level'] = int(batt.percent)
                telemetry['is_charging'] = batt.power_plugged
    except ImportError:
        # Fallback if psutil is not installed
        telemetry['cpu_usage'] = 0.0
        telemetry['memory_usage'] = 0.0
        
    telemetry['vulnerabilities'] = collect_vulnerabilities()
    return telemetry


def collect_vulnerabilities():
    vulns = []
    # 1. Check UFW (Firewall)
    try:
        if platform.system() == 'Linux':
            out = subprocess.check_output(['ufw', 'status'], text=True, stderr=subprocess.DEVNULL)
            if 'inactive' in out:
                vulns.append({
                    'id': 'VULN-UFW-001',
                    'name': 'UFW Firewall Disabled',
                    'severity': 'High',
                    'description': 'The Uncomplicated Firewall is inactive, leaving ports exposed.'
                })
    except Exception:
        pass
    
    # 2. Check Root SSH Login
    try:
        if platform.system() == 'Linux':
            out = subprocess.check_output(['grep', '^PermitRootLogin', '/etc/ssh/sshd_config'], text=True, stderr=subprocess.DEVNULL)
            if 'yes' in out:
                vulns.append({
                    'id': 'VULN-SSH-001',
                    'name': 'Root SSH Login Enabled',
                    'severity': 'Critical',
                    'description': 'Root is allowed to login via SSH, which is highly insecure.'
                })
    except Exception:
        pass
    return vulns


def handle_commands(commands, server, api_key, agent_id):
    for cmd in commands:
        action = cmd.get('action')
        vuln_id = cmd.get('vuln_id')
        log.info(f"Received command from server: {action} {vuln_id if vuln_id else ''}")
        
        if action == 'fix_vulnerability':
            if vuln_id == 'VULN-UFW-001':
                try:
                    subprocess.check_call(['sudo', 'ufw', '--force', 'enable'])
                    log.info("Fixed VULN-UFW-001: Enabled UFW")
                except Exception as e:
                    log.error(f"Failed to fix UFW: {e}")
            elif vuln_id == 'VULN-SSH-001':
                try:
                    subprocess.check_call(['sudo', 'sed', '-i', 's/^PermitRootLogin yes/PermitRootLogin no/g', '/etc/ssh/sshd_config'])
                    subprocess.check_call(['sudo', 'systemctl', 'restart', 'sshd'])
                    log.info("Fixed VULN-SSH-001: Disabled Root SSH")
                except Exception as e:
                    log.error(f"Failed to fix SSH: {e}")
            
            # Immediately send updated state back to server after fixing
            send_heartbeat(server, api_key, agent_id)
        elif action == 'scan_vulnerabilities':
            log.info("Triggering real-time vulnerability scan...")
            send_heartbeat(server, api_key, agent_id)
        elif action == 'block_ip':
            ip = cmd.get('ip')
            threat_id = cmd.get('threat_id')
            log.info(f"Triggering IP block for {ip}...")
            
            # Send immediate event about the block status
            status_event = {
                'type': 'block_failed',
                'ip': ip,
                'threat_id': threat_id,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            try:
                # Try real sudo block
                subprocess.check_call(['sudo', '-n', 'ufw', 'deny', 'out', 'to', ip])
                log.info(f"Blocked outbound traffic to {ip}")
                status_event['type'] = 'block_success'
            except Exception as e:
                log.warning(f"Agent not running as root (or UFW disabled). Reporting failure for {ip}")
            
            send_events(server, api_key, agent_id, [status_event])


def send_events(server, api_key, agent_id, events):
    if not events:
        return
    payload = {
        'hostname':   socket.gethostname(),
        'ip_address': socket.gethostbyname(socket.gethostname()),
        'os':         platform.system(),
        'telemetry':  get_telemetry(),
        'events':     events,
    }
    result = api_call(server, f'/api/v1/agents/{agent_id}/data/', api_key, payload)
    if result:
        new = result.get('new_threats_created', 0)
        log.info(f'✅ Sent {len(events)} events → {new} new threats in CrimeCast')
        for t in result.get('new_threats', []):
            log.warning(f'  🚨 [{t["severity"].upper()} {t["score"]}/100] {t["ip"]} — {t["attack_class"]}')
        handle_commands(result.get('commands', []), server, api_key, agent_id)
    else:
        log.warning('Could not reach CrimeCast — check --server URL')

def send_heartbeat(server, api_key, agent_id):
    payload = {
        'telemetry': get_telemetry()
    }
    result = api_call(server, f'/api/v1/agents/{agent_id}/heartbeat/', api_key, payload)
    if result:
        log.info('💓 Heartbeat sent — agent showing ONLINE in CrimeCast')
        handle_commands(result.get('commands', []), server, api_key, agent_id)

# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='CrimeCast Monitoring Agent — connects this machine to CrimeCast',
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument('--id',       required=True, help='Agent UUID from CrimeCast System Connections page')
    parser.add_argument('--key',      required=True, help='API key from CrimeCast System Connections page')
    parser.add_argument('--server',   required=True, help='CrimeCast URL e.g. http://192.168.1.45:8000')
    parser.add_argument('--interval', type=int, default=30, help='Seconds between checks (default: 30)')
    args = parser.parse_args()

    print('=' * 55)
    print('   CrimeCast Monitoring Agent v1.0')
    print('=' * 55)
    print(f'  Server:   {args.server}')
    print(f'  Hostname: {socket.gethostname()}')
    print(f'  OS:       {platform.system()} {platform.release()}')
    print(f'  Interval: every {args.interval}s')
    print('=' * 55)
    print('  Open CrimeCast → System Connections to see this')
    print('  machine go ONLINE and threats appear in real-time.')
    print('=' * 55)

    cycle = 0
    while True:
        cycle += 1
        log.info(f'─── Check #{cycle} ───')

        events = []
        events.extend(collect_network_connections())
        events.extend(collect_failed_logins())
        events.extend(collect_suspicious_processes())
        log.info(f'Found {len(events)} events to report')

        if events:
            send_events(args.server, args.key, args.id, events)
        else:
            send_heartbeat(args.server, args.key, args.id)

        log.info(f'Next check in {args.interval}s...\n')
        time.sleep(args.interval)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n[CS-Agent] Stopped. This machine is now OFFLINE in CrimeCast.')
        sys.exit(0)

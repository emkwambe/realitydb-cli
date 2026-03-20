#!/usr/bin/env python3
"""Generate enriched cybersecurity.sql"""
import random
from datetime import datetime, timedelta
random.seed(42)

out = []

out.append("""-- Cybersecurity / security operations schema and sample data
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL,
  os VARCHAR(100) NOT NULL,
  asset_type VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  criticality VARCHAR(20) NOT NULL DEFAULT 'medium',
  last_scan_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  cve_id VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  cvss_score NUMERIC(3,1) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  discovered_at TIMESTAMP NOT NULL DEFAULT now(),
  remediated_at TIMESTAMP
);

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  attack_type VARCHAR(100) NOT NULL,
  source_ip VARCHAR(45),
  affected_asset_id UUID REFERENCES assets(id),
  description TEXT NOT NULL,
  detected_at TIMESTAMP NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP
);

CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  scan_type VARCHAR(50) NOT NULL,
  findings_count INTEGER NOT NULL,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  scanned_at TIMESTAMP NOT NULL DEFAULT now()
);""")

def uid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"

def esc(s):
    return s.replace("'", "''")

def fmt_ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')

base_date = datetime(2023, 6, 1)
end_date = datetime(2026, 2, 28)
total_days = (end_date - base_date).days

def random_date():
    if random.random() < 0.6:
        d = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 365))
        if d > end_date:
            d = end_date - timedelta(days=random.randint(0, 60))
        return d
    return base_date + timedelta(days=random.randint(0, total_days))

# Assets (80)
asset_types_dist = ['server']*24 + ['workstation']*20 + ['network_device']*12 + ['cloud_instance']*12 + ['mobile']*8 + ['iot']*4
criticality_dist = ['critical']*12 + ['high']*20 + ['medium']*32 + ['low']*16
departments = ['Engineering', 'IT', 'Human Resources', 'Finance', 'Marketing', 'Sales', 'Executive', 'Operations']

server_os = ['Ubuntu 22.04 LTS', 'Red Hat Enterprise Linux 9', 'Ubuntu 24.04 LTS', 'Debian 12', 'CentOS Stream 9']
ws_os = ['Windows 11 Pro', 'macOS 14 Sonoma', 'macOS 15 Sequoia', 'Windows 11 Enterprise', 'Ubuntu 22.04 LTS']
net_os = ['Palo Alto PAN-OS 11.1', 'Cisco IOS XE 17.9', 'Juniper Junos 23.4', 'Arista EOS 4.31', 'FortiOS 7.4']
cloud_os = ['Amazon Linux 2023', 'Ubuntu 22.04 LTS', 'Debian 12', 'Container-Optimized OS', 'Windows Server 2022']
mobile_os = ['iOS 17', 'iOS 18', 'Android 14', 'Android 15']
iot_os = ['Custom Firmware 2.1', 'Embedded Linux 5.15', 'FreeRTOS 10.5', 'Zephyr RTOS 3.5']

assets = []
server_count = ws_count = net_count = cloud_count = mobile_count = iot_count = 0

for i in range(1, 81):
    atype = asset_types_dist[i-1]
    crit = criticality_dist[i-1]
    dept = departments[(i-1) % 8]

    if atype == 'server':
        server_count += 1
        prefixes = ['prod-web', 'prod-api', 'prod-db', 'staging-web', 'staging-api', 'staging-db', 'dev-web', 'prod-cache', 'prod-queue', 'prod-search', 'prod-auth', 'prod-cdn']
        hostname = f"{prefixes[(server_count-1) % len(prefixes)]}-{(server_count-1)//len(prefixes)+1:02d}"
        ip = f"10.0.{(server_count-1)//10+1}.{10 + (server_count-1)%10}"
        os_name = server_os[(server_count-1) % len(server_os)]
    elif atype == 'workstation':
        ws_count += 1
        dept_prefix = {'Engineering': 'eng', 'IT': 'it', 'Human Resources': 'hr', 'Finance': 'fin', 'Marketing': 'mkt', 'Sales': 'sales', 'Executive': 'exec', 'Operations': 'ops'}
        p = dept_prefix.get(dept, 'gen')
        hostname = f"{p}-ws-{ws_count:03d}"
        ip = f"10.2.{(ws_count-1)//20+1}.{10 + (ws_count-1)%20}"
        os_name = ws_os[(ws_count-1) % len(ws_os)]
    elif atype == 'network_device':
        net_count += 1
        prefixes = ['fw-edge', 'sw-core', 'sw-access', 'vpn-gw', 'lb-prod', 'wap-floor', 'rt-border', 'sw-dist', 'fw-dmz', 'ids-inline', 'sw-mgmt', 'wlc-main']
        hostname = f"{prefixes[(net_count-1) % len(prefixes)]}-{(net_count-1)//len(prefixes)+1:02d}"
        ip = f"10.0.0.{net_count}"
        os_name = net_os[(net_count-1) % len(net_os)]
        dept = 'IT'
    elif atype == 'cloud_instance':
        cloud_count += 1
        prefixes = ['aws-ec2-prod', 'aws-ec2-staging', 'gcp-gke-prod', 'gcp-gke-staging', 'aws-rds-prod', 'aws-lambda-prod', 'azure-vm-prod', 'aws-ecs-prod', 'gcp-compute-dev', 'aws-eks-prod', 'azure-aks-prod', 'aws-ec2-dev']
        hostname = f"{prefixes[(cloud_count-1) % len(prefixes)]}-{(cloud_count-1)//len(prefixes)+1:02d}"
        ip = f"172.16.{(cloud_count-1)//10+1}.{10 + (cloud_count-1)%10}"
        os_name = cloud_os[(cloud_count-1) % len(cloud_os)]
    elif atype == 'mobile':
        mobile_count += 1
        prefixes = ['mobile-exec', 'mobile-sales', 'mobile-field', 'mobile-eng', 'mobile-mgr', 'mobile-support', 'mobile-admin', 'mobile-ops']
        hostname = f"{prefixes[(mobile_count-1) % len(prefixes)]}-{mobile_count:03d}"
        ip = f"10.3.0.{mobile_count}"
        os_name = mobile_os[(mobile_count-1) % len(mobile_os)]
    else:  # iot
        iot_count += 1
        prefixes = ['iot-camera', 'iot-sensor-temp', 'iot-badge-reader', 'iot-hvac-ctrl']
        hostname = f"{prefixes[(iot_count-1) % len(prefixes)]}-{iot_count:03d}"
        ip = f"10.4.0.{iot_count}"
        os_name = iot_os[(iot_count-1) % len(iot_os)]

    created = datetime(2023, 1, 1) + timedelta(days=random.randint(0, 700))
    scan = created + timedelta(days=random.randint(30, 900))
    if scan > end_date:
        scan = end_date - timedelta(days=random.randint(0, 30))
    scan_str = f"'{fmt_ts(scan)}'" if atype not in ('mobile', 'iot') or random.random() > 0.4 else "NULL"

    assets.append((i, hostname, ip, os_name, atype, dept, crit, scan_str, fmt_ts(created)))

out.append("\n-- Assets (80)")
for batch_start in range(0, len(assets), 50):
    batch = assets[batch_start:batch_start+50]
    vals = []
    for a in batch:
        vals.append(f"('{uid('e0000000', a[0])}', '{a[1]}', '{a[2]}', '{esc(a[3])}', '{a[4]}', '{a[5]}', '{a[6]}', {a[7]}, '{a[8]}')")
    out.append(f"INSERT INTO assets (id, hostname, ip_address, os, asset_type, department, criticality, last_scan_at, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Vulnerabilities (150)
sev_dist = ['critical']*8 + ['high']*23 + ['medium']*60 + ['low']*59
status_dist = ['open']*45 + ['patched']*67 + ['mitigated']*23 + ['accepted_risk']*15

vuln_descs = {
    'critical': [
        'Remote code execution via buffer overflow in network stack',
        'Authentication bypass allowing unauthorized admin access',
        'SQL injection in login endpoint allowing data exfiltration',
        'Unauthenticated remote code execution via deserialization',
        'Privilege escalation to root via kernel vulnerability',
        'Remote command injection through management interface',
        'Critical memory corruption in SSL/TLS implementation',
        'Zero-day exploit in web application framework',
    ],
    'high': [
        'Cross-site scripting (XSS) in web application',
        'Server-side request forgery (SSRF) in API endpoint',
        'Insecure direct object reference allowing data access',
        'Missing authentication on administrative API',
        'Path traversal vulnerability in file upload',
        'XML external entity injection in document parser',
        'Broken access control in user management module',
        'Insufficient logging and monitoring of auth events',
        'Hardcoded credentials in configuration file',
        'Unpatched OpenSSH vulnerability allowing remote access',
    ],
    'medium': [
        'Information disclosure through verbose error messages',
        'Missing Content-Security-Policy header',
        'TLS 1.0/1.1 still enabled on server',
        'Weak password policy enforcement',
        'Missing rate limiting on authentication endpoint',
        'Outdated third-party library with known issues',
        'CORS misconfiguration allowing unauthorized origins',
        'Session tokens not invalidated on logout',
        'Missing HTTP Strict-Transport-Security header',
        'Unencrypted sensitive data in transit',
    ],
    'low': [
        'Information leakage via HTTP response headers',
        'Missing X-Frame-Options header',
        'Cookie without Secure flag',
        'Directory listing enabled on web server',
        'Verbose server banner information disclosure',
        'Missing X-Content-Type-Options header',
        'Autocomplete enabled on sensitive form fields',
        'HTTP method TRACE/TRACK enabled',
        'Missing Referrer-Policy header',
        'Clickjacking potential due to missing headers',
    ]
}

out.append("\n-- Vulnerabilities (150)")
vuln_rows = []
for i in range(1, 151):
    sev = sev_dist[i-1]
    stat = status_dist[i-1]
    asset_id = uid('e0000000', random.randint(1, 80))

    year = random.choice([2023]*20 + [2024]*50 + [2025]*30)
    cve_num = random.randint(10000, 59999)
    cve = f"CVE-{year}-{cve_num}"

    if sev == 'critical': cvss = round(random.uniform(9.0, 10.0), 1)
    elif sev == 'high': cvss = round(random.uniform(7.0, 8.9), 1)
    elif sev == 'medium': cvss = round(random.uniform(4.0, 6.9), 1)
    else: cvss = round(random.uniform(0.1, 3.9), 1)

    desc = random.choice(vuln_descs[sev])
    discovered = random_date()
    if stat in ('patched', 'mitigated'):
        rem = discovered + timedelta(days=random.randint(1, 60))
        rem_str = f"'{fmt_ts(rem)}'"
    else:
        rem_str = "NULL"

    vuln_rows.append((uid('f0000000', i), asset_id, cve, sev, cvss, desc, stat, fmt_ts(discovered), rem_str))

for batch_start in range(0, len(vuln_rows), 50):
    batch = vuln_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', '{r[3]}', {r[4]}, '{esc(r[5])}', '{r[6]}', '{r[7]}', {r[8]})")
    out.append(f"INSERT INTO vulnerabilities (id, asset_id, cve_id, severity, cvss_score, description, status, discovered_at, remediated_at) VALUES\n" + ",\n".join(vals) + ";")

# Incidents (60)
inc_sev_dist = ['critical']*5 + ['high']*12 + ['medium']*24 + ['low']*19
inc_stat_dist = ['resolved']*27 + ['investigating']*15 + ['contained']*9 + ['open']*9
attack_types = ['brute_force', 'phishing', 'sql_injection', 'ransomware', 'ddos', 'privilege_escalation',
                'data_exfiltration', 'credential_stuffing', 'lateral_movement', 'supply_chain',
                'cryptomining', 'reconnaissance', 'malware', 'insider_threat']

inc_titles = {
    'brute_force': 'Brute force attack on {asset}',
    'phishing': 'Phishing campaign targeting {dept} department',
    'sql_injection': 'SQL injection attempt on {asset}',
    'ransomware': 'Ransomware indicator detected on {asset}',
    'ddos': 'DDoS attack on public infrastructure',
    'privilege_escalation': 'Unauthorized privilege escalation on {asset}',
    'data_exfiltration': 'Suspicious data exfiltration from {asset}',
    'credential_stuffing': 'Credential stuffing attack on {asset}',
    'lateral_movement': 'Lateral movement detected from {asset}',
    'supply_chain': 'Supply chain compromise in CI/CD pipeline',
    'cryptomining': 'Cryptominer detected on {asset}',
    'reconnaissance': 'Port scan from external IP',
    'malware': 'Malware detected on {asset}',
    'insider_threat': 'Suspicious insider activity on {asset}',
}

inc_descs = {
    'brute_force': 'Detected multiple failed login attempts from external IP. Rate limiting applied and IP blocked at firewall.',
    'phishing': 'Credential harvesting emails sent to department members. Affected users identified and credentials reset.',
    'sql_injection': 'WAF detected and blocked SQL injection attempts against application endpoints. Attack signatures updated.',
    'ransomware': 'EDR flagged suspicious file encryption patterns. System isolated immediately for investigation.',
    'ddos': 'Volumetric DDoS attack detected. Mitigated via upstream provider traffic scrubbing.',
    'privilege_escalation': 'Unauthorized attempt to escalate privileges detected. Account disabled and credentials rotated.',
    'data_exfiltration': 'Anomalous outbound data transfer detected. Network flow analysis initiated.',
    'credential_stuffing': 'Automated credential stuffing using leaked database. Rate limiting and account lockout applied.',
    'lateral_movement': 'EDR detected remote execution tools being used across network segments. Investigation in progress.',
    'supply_chain': 'Malicious dependency detected in build pipeline. Build artifacts quarantined for analysis.',
    'cryptomining': 'Unusual CPU utilization spike detected. Cryptomining process identified and terminated.',
    'reconnaissance': 'Full TCP port scan detected from known scanner IP. No exposed services found.',
    'malware': 'Antivirus detected malicious binary. File quarantined and system scan initiated.',
    'insider_threat': 'Unusual data access patterns detected from authorized user account. Activity logged for review.',
}

out.append("\n-- Incidents (60)")
inc_rows = []
for i in range(1, 61):
    sev = inc_sev_dist[i-1]
    stat = inc_stat_dist[i-1]
    attack = attack_types[(i-1) % len(attack_types)]
    asset_idx = random.randint(1, 80)
    asset_hostname = assets[asset_idx-1][1]
    asset_dept = assets[asset_idx-1][5]
    asset_id = uid('e0000000', asset_idx)

    title = inc_titles[attack].format(asset=asset_hostname, dept=asset_dept)
    desc = inc_descs[attack]

    if attack in ('lateral_movement', 'insider_threat', 'privilege_escalation'):
        src_ip = f"10.{random.randint(0,4)}.{random.randint(0,10)}.{random.randint(1,254)}"
    elif attack == 'reconnaissance':
        src_ip = f"{random.randint(100,220)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"
    elif attack in ('supply_chain',):
        src_ip = "NULL"
    else:
        src_ip = f"{random.randint(45,220)}.{random.randint(1,254)}.{random.randint(1,254)}.{random.randint(1,254)}"

    detected = random_date()
    if stat == 'resolved':
        resolved = detected + timedelta(hours=random.randint(1, 72))
        resolved_str = f"'{fmt_ts(resolved)}'"
    else:
        resolved_str = "NULL"

    src_ip_str = f"'{src_ip}'" if src_ip != "NULL" else "NULL"

    inc_rows.append((uid('11000000', i), title, sev, stat, attack, src_ip_str, asset_id, desc, fmt_ts(detected), resolved_str))

for batch_start in range(0, len(inc_rows), 50):
    batch = inc_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{esc(r[1])}', '{r[2]}', '{r[3]}', '{r[4]}', {r[5]}, '{r[6]}', '{esc(r[7])}', '{r[8]}', {r[9]})")
    out.append(f"INSERT INTO incidents (id, title, severity, status, attack_type, source_ip, affected_asset_id, description, detected_at, resolved_at) VALUES\n" + ",\n".join(vals) + ";")

# Scan Results (200)
scan_type_dist = ['vulnerability']*120 + ['compliance']*50 + ['penetration_test']*30

out.append("\n-- Scan Results (200)")
scan_rows = []
for i in range(1, 201):
    asset_idx = ((i-1) % 80) + 1
    asset_id = uid('e0000000', asset_idx)
    stype = scan_type_dist[i-1]
    crit_c = random.choices([0,0,0,0,0,1,1,2], k=1)[0]
    high_c = random.randint(0, 5)
    med_c = random.randint(1, 8)
    low_c = random.randint(1, 10)
    total = crit_c + high_c + med_c + low_c
    scanned = random_date()
    scan_rows.append((uid('12000000', i), asset_id, stype, total, crit_c, high_c, med_c, low_c, fmt_ts(scanned)))

for batch_start in range(0, len(scan_rows), 50):
    batch = scan_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', {r[3]}, {r[4]}, {r[5]}, {r[6]}, {r[7]}, '{r[8]}')")
    out.append(f"INSERT INTO scan_results (id, asset_id, scan_type, findings_count, critical_count, high_count, medium_count, low_count, scanned_at) VALUES\n" + ",\n".join(vals) + ";")

with open('/home/user/databox/apps/sandbox/public/data/cybersecurity.sql', 'w') as f:
    f.write('\n\n'.join(out) + '\n')
print("Generated cybersecurity.sql")

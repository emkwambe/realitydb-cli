-- Cybersecurity / security operations schema and sample data
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
);

-- Assets (10)
INSERT INTO assets (id, hostname, ip_address, os, asset_type, department, criticality, last_scan_at, created_at) VALUES
('e0000000-0000-0000-0000-000000000001', 'prod-web-01', '10.0.1.10', 'Ubuntu 22.04 LTS', 'server', 'Engineering', 'critical', '2024-09-20 02:00:00', '2024-01-15 09:00:00'),
('e0000000-0000-0000-0000-000000000002', 'prod-web-02', '10.0.1.11', 'Ubuntu 22.04 LTS', 'server', 'Engineering', 'critical', '2024-09-20 02:15:00', '2024-01-15 09:00:00'),
('e0000000-0000-0000-0000-000000000003', 'prod-db-01', '10.0.2.10', 'Red Hat Enterprise Linux 9', 'database', 'Engineering', 'critical', '2024-09-20 02:30:00', '2024-01-20 10:00:00'),
('e0000000-0000-0000-0000-000000000004', 'prod-api-01', '10.0.1.20', 'Ubuntu 22.04 LTS', 'server', 'Engineering', 'high', '2024-09-20 02:45:00', '2024-02-01 08:00:00'),
('e0000000-0000-0000-0000-000000000005', 'corp-dc-01', '10.1.0.5', 'Windows Server 2022', 'domain_controller', 'IT', 'critical', '2024-09-19 22:00:00', '2024-01-10 08:00:00'),
('e0000000-0000-0000-0000-000000000006', 'corp-mail-01', '10.1.0.20', 'Windows Server 2022', 'server', 'IT', 'high', '2024-09-19 22:15:00', '2024-01-12 08:00:00'),
('e0000000-0000-0000-0000-000000000007', 'dev-ws-042', '10.2.5.42', 'macOS 14 Sonoma', 'workstation', 'Engineering', 'medium', '2024-09-18 12:00:00', '2024-03-10 09:00:00'),
('e0000000-0000-0000-0000-000000000008', 'hr-ws-015', '10.2.3.15', 'Windows 11 Pro', 'workstation', 'Human Resources', 'medium', '2024-09-18 12:15:00', '2024-03-15 10:00:00'),
('e0000000-0000-0000-0000-000000000009', 'fw-edge-01', '10.0.0.1', 'Palo Alto PAN-OS 11.1', 'firewall', 'IT', 'critical', '2024-09-20 01:00:00', '2024-01-05 08:00:00'),
('e0000000-0000-0000-0000-000000000010', 'vpn-gw-01', '10.0.0.5', 'Cisco IOS XE 17.9', 'network', 'IT', 'high', '2024-09-20 01:30:00', '2024-01-05 08:30:00');

-- Vulnerabilities (20)
INSERT INTO vulnerabilities (id, asset_id, cve_id, severity, cvss_score, description, status, discovered_at, remediated_at) VALUES
('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'CVE-2024-3094', 'critical', 10.0, 'XZ Utils backdoor allowing unauthorized remote access via SSH', 'remediated', '2024-03-29 08:00:00', '2024-03-30 14:00:00'),
('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'CVE-2024-3094', 'critical', 10.0, 'XZ Utils backdoor allowing unauthorized remote access via SSH', 'remediated', '2024-03-29 08:00:00', '2024-03-30 14:30:00'),
('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'CVE-2024-21626', 'high', 8.6, 'runc container breakout via leaked file descriptor in /sys/fs/cgroup', 'remediated', '2024-02-01 10:00:00', '2024-02-05 16:00:00'),
('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'CVE-2024-6387', 'high', 8.1, 'OpenSSH regreSSHion race condition allowing remote code execution', 'remediated', '2024-07-01 06:00:00', '2024-07-02 10:00:00'),
('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000002', 'CVE-2024-6387', 'high', 8.1, 'OpenSSH regreSSHion race condition allowing remote code execution', 'remediated', '2024-07-01 06:00:00', '2024-07-02 10:30:00'),
('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000004', 'CVE-2024-6387', 'high', 8.1, 'OpenSSH regreSSHion race condition allowing remote code execution', 'remediated', '2024-07-01 06:30:00', '2024-07-02 11:00:00'),
('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000005', 'CVE-2024-30080', 'critical', 9.8, 'Microsoft Message Queuing remote code execution vulnerability', 'remediated', '2024-06-11 08:00:00', '2024-06-13 09:00:00'),
('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000006', 'CVE-2024-30080', 'critical', 9.8, 'Microsoft Message Queuing remote code execution vulnerability', 'remediated', '2024-06-11 08:00:00', '2024-06-13 09:30:00'),
('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000009', 'CVE-2024-3400', 'critical', 10.0, 'Palo Alto PAN-OS GlobalProtect command injection', 'remediated', '2024-04-12 06:00:00', '2024-04-12 18:00:00'),
('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000010', 'CVE-2024-20353', 'high', 8.6, 'Cisco ASA and FTD denial-of-service vulnerability', 'remediated', '2024-04-24 10:00:00', '2024-04-26 14:00:00'),
('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', 'CVE-2024-4577', 'critical', 9.8, 'PHP-CGI argument injection on Windows servers', 'not_applicable', '2024-06-07 08:00:00', NULL),
('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000007', 'CVE-2024-23222', 'high', 8.8, 'Apple WebKit type confusion leading to arbitrary code execution', 'remediated', '2024-01-22 09:00:00', '2024-01-25 11:00:00'),
('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000008', 'CVE-2024-21351', 'high', 7.6, 'Windows SmartScreen security feature bypass', 'remediated', '2024-02-13 08:00:00', '2024-02-15 16:00:00'),
('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000001', 'CVE-2024-47176', 'high', 8.3, 'CUPS remote code execution via crafted IPP request', 'open', '2024-09-26 12:00:00', NULL),
('f0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000002', 'CVE-2024-47176', 'high', 8.3, 'CUPS remote code execution via crafted IPP request', 'open', '2024-09-26 12:00:00', NULL),
('f0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000004', 'CVE-2024-47176', 'high', 8.3, 'CUPS remote code execution via crafted IPP request', 'open', '2024-09-26 12:30:00', NULL),
('f0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000003', 'CVE-2024-36971', 'medium', 6.5, 'Linux kernel use-after-free in network route management', 'in_progress', '2024-08-05 10:00:00', NULL),
('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000005', 'CVE-2024-38063', 'critical', 9.8, 'Windows TCP/IP IPv6 remote code execution', 'open', '2024-08-13 08:00:00', NULL),
('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000008', 'CVE-2024-38063', 'critical', 9.8, 'Windows TCP/IP IPv6 remote code execution', 'in_progress', '2024-08-13 08:00:00', NULL),
('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000006', 'CVE-2024-38063', 'critical', 9.8, 'Windows TCP/IP IPv6 remote code execution', 'open', '2024-08-13 08:30:00', NULL);

-- Incidents (12)
INSERT INTO incidents (id, title, severity, status, attack_type, source_ip, affected_asset_id, description, detected_at, resolved_at) VALUES
('11000000-0000-0000-0000-000000000001', 'Brute force SSH attack on prod-web-01', 'high', 'resolved', 'brute_force', '185.220.101.34', 'e0000000-0000-0000-0000-000000000001', 'Detected 15,000+ failed SSH login attempts from known Tor exit node over 2 hours. IP blocked at firewall.', '2024-03-15 03:22:00', '2024-03-15 03:45:00'),
('11000000-0000-0000-0000-000000000002', 'Phishing campaign targeting HR department', 'critical', 'resolved', 'phishing', '91.234.56.78', 'e0000000-0000-0000-0000-000000000008', 'Credential harvesting email impersonating benefits portal sent to 12 HR employees. Two users clicked link, credentials reset.', '2024-04-10 09:15:00', '2024-04-10 14:30:00'),
('11000000-0000-0000-0000-000000000003', 'Suspicious outbound DNS traffic from dev workstation', 'medium', 'resolved', 'data_exfiltration', NULL, 'e0000000-0000-0000-0000-000000000007', 'Anomalous DNS query volume (5x baseline) detected from dev-ws-042. Investigation revealed misconfigured development tool, not malicious.', '2024-05-02 14:30:00', '2024-05-02 17:00:00'),
('11000000-0000-0000-0000-000000000004', 'SQL injection attempt on API endpoint', 'high', 'resolved', 'sql_injection', '103.45.67.89', 'e0000000-0000-0000-0000-000000000004', 'WAF detected and blocked 340 SQL injection attempts against /api/v2/search endpoint. Attacker probing for union-based injection.', '2024-05-20 18:45:00', '2024-05-20 19:30:00'),
('11000000-0000-0000-0000-000000000005', 'Ransomware indicator detected on mail server', 'critical', 'resolved', 'ransomware', '45.89.127.201', 'e0000000-0000-0000-0000-000000000006', 'EDR flagged suspicious file encryption pattern on corp-mail-01. Isolated immediately. Root cause: malicious attachment opened by service account. No data encrypted.', '2024-06-08 02:10:00', '2024-06-08 08:45:00'),
('11000000-0000-0000-0000-000000000006', 'DDoS attack on public web infrastructure', 'critical', 'resolved', 'ddos', '198.51.100.0', 'e0000000-0000-0000-0000-000000000001', 'Volumetric DDoS attack peaking at 45 Gbps targeting prod-web-01 and prod-web-02. Mitigated via upstream provider scrubbing.', '2024-07-04 11:00:00', '2024-07-04 13:30:00'),
('11000000-0000-0000-0000-000000000007', 'Unauthorized access attempt on domain controller', 'critical', 'resolved', 'privilege_escalation', '10.2.5.42', 'e0000000-0000-0000-0000-000000000005', 'Kerberoasting attack detected originating from dev-ws-042. Compromised developer account used to request service tickets. Account disabled and credentials rotated.', '2024-07-22 16:00:00', '2024-07-22 20:15:00'),
('11000000-0000-0000-0000-000000000008', 'Cryptominer detected on database server', 'high', 'resolved', 'cryptomining', '10.0.2.10', 'e0000000-0000-0000-0000-000000000003', 'Unusual CPU spike on prod-db-01. Investigation found xmrig binary deployed via compromised container. Container image updated and server cleaned.', '2024-08-14 04:30:00', '2024-08-14 09:00:00'),
('11000000-0000-0000-0000-000000000009', 'Port scan from external IP on firewall', 'low', 'resolved', 'reconnaissance', '178.62.44.123', 'e0000000-0000-0000-0000-000000000009', 'Full TCP port scan detected from known scanner IP. No exposed services found. IP added to threat intelligence blocklist.', '2024-08-30 06:15:00', '2024-08-30 06:45:00'),
('11000000-0000-0000-0000-000000000010', 'Credential stuffing on VPN gateway', 'high', 'open', 'credential_stuffing', '203.0.113.55', 'e0000000-0000-0000-0000-000000000010', 'Automated credential stuffing attack using leaked database credentials targeting VPN portal. 5,200 attempts in 30 minutes. Rate limiting applied.', '2024-09-18 22:00:00', NULL),
('11000000-0000-0000-0000-000000000011', 'Lateral movement detected from compromised workstation', 'critical', 'investigating', 'lateral_movement', '10.2.3.15', 'e0000000-0000-0000-0000-000000000008', 'EDR detected PsExec and WMI remote execution from hr-ws-015 to three other workstations. Investigating scope of compromise.', '2024-09-25 10:30:00', NULL),
('11000000-0000-0000-0000-000000000012', 'Malicious npm package in CI/CD pipeline', 'high', 'investigating', 'supply_chain', NULL, 'e0000000-0000-0000-0000-000000000004', 'Dependency confusion attack detected. Malicious package typosquatting internal library name pulled during build. Build artifacts quarantined.', '2024-09-28 14:00:00', NULL);

-- Scan Results (15)
INSERT INTO scan_results (id, asset_id, scan_type, findings_count, critical_count, high_count, medium_count, low_count, scanned_at) VALUES
('12000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'vulnerability', 8, 1, 3, 2, 2, '2024-07-15 02:00:00'),
('12000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'vulnerability', 6, 0, 2, 3, 1, '2024-07-15 02:15:00'),
('12000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'vulnerability', 4, 0, 1, 2, 1, '2024-07-15 02:30:00'),
('12000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000005', 'vulnerability', 12, 2, 4, 3, 3, '2024-07-15 22:00:00'),
('12000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000009', 'compliance', 3, 0, 1, 1, 1, '2024-08-01 01:00:00'),
('12000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000001', 'vulnerability', 5, 0, 2, 2, 1, '2024-08-15 02:00:00'),
('12000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000004', 'vulnerability', 7, 0, 3, 2, 2, '2024-08-15 02:45:00'),
('12000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000006', 'vulnerability', 9, 1, 3, 3, 2, '2024-08-15 22:15:00'),
('12000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000007', 'compliance', 2, 0, 0, 1, 1, '2024-08-20 12:00:00'),
('12000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000008', 'compliance', 5, 0, 1, 2, 2, '2024-08-20 12:15:00'),
('12000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000001', 'vulnerability', 6, 1, 2, 2, 1, '2024-09-20 02:00:00'),
('12000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000002', 'vulnerability', 5, 1, 2, 1, 1, '2024-09-20 02:15:00'),
('12000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000003', 'vulnerability', 3, 0, 1, 1, 1, '2024-09-20 02:30:00'),
('12000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000005', 'vulnerability', 10, 1, 3, 4, 2, '2024-09-19 22:00:00'),
('12000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000010', 'compliance', 4, 0, 1, 2, 1, '2024-09-20 01:30:00');

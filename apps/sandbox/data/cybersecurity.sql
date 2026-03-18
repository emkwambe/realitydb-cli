-- RealityDB Cyber Security Template | Seed: 42 | ~220 rows
-- Lifecycle: dismissed alerts → resolved_at = NULL
-- Weights: role analyst=50% engineer=25% admin=15% executive=10% | severity low=40% medium=30% high=20% critical=10%

CREATE TABLE users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), username TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, department TEXT NOT NULL, mfa_enabled BOOLEAN NOT NULL DEFAULT true, last_login TIMESTAMP, created_at TIMESTAMP NOT NULL);
CREATE TABLE access_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), action TEXT NOT NULL, resource TEXT NOT NULL, ip_address TEXT NOT NULL, user_agent TEXT, status TEXT NOT NULL, created_at TIMESTAMP NOT NULL);
CREATE TABLE login_attempts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), status TEXT NOT NULL, ip_address TEXT NOT NULL, method TEXT NOT NULL, failure_reason TEXT, created_at TIMESTAMP NOT NULL);
CREATE TABLE security_alerts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id), type TEXT NOT NULL, severity TEXT NOT NULL, status TEXT NOT NULL, description TEXT, resolved_at TIMESTAMP, created_at TIMESTAMP NOT NULL);

INSERT INTO users VALUES
('cu100001-0000-0000-0000-000000000001','jsmith','j.smith@corp.com','analyst','Security Operations',true,'2025-03-15 09:00:00','2024-01-05 08:00:00'),
('cu100001-0000-0000-0000-000000000002','mchen','m.chen@corp.com','engineer','Security Engineering',true,'2025-03-15 08:30:00','2024-01-10 09:00:00'),
('cu100001-0000-0000-0000-000000000003','agarcia','a.garcia@corp.com','admin','IT Administration',true,'2025-03-14 16:00:00','2024-01-15 10:00:00'),
('cu100001-0000-0000-0000-000000000004','dwilson','d.wilson@corp.com','executive','C-Suite',true,'2025-03-13 11:00:00','2024-02-01 08:00:00'),
('cu100001-0000-0000-0000-000000000005','kpatel','k.patel@corp.com','analyst','Security Operations',true,'2025-03-15 07:45:00','2024-02-15 09:00:00'),
('cu100001-0000-0000-0000-000000000006','lnguyen','l.nguyen@corp.com','engineer','Security Engineering',true,'2025-03-15 08:15:00','2024-03-01 08:30:00'),
('cu100001-0000-0000-0000-000000000007','rbrown','r.brown@corp.com','analyst','Security Operations',false,'2025-03-12 14:00:00','2024-03-15 10:00:00'),
('cu100001-0000-0000-0000-000000000008','tkim','t.kim@corp.com','analyst','Compliance',true,'2025-03-14 09:30:00','2024-04-01 09:00:00'),
('cu100001-0000-0000-0000-000000000009','jlee','j.lee@corp.com','engineer','Infrastructure',true,'2025-03-15 06:00:00','2024-04-15 08:00:00'),
('cu100001-0000-0000-0000-000000000010','mwang','m.wang@corp.com','admin','IT Administration',true,'2025-03-14 17:00:00','2024-05-01 10:00:00'),
('cu100001-0000-0000-0000-000000000011','sdavis','s.davis@corp.com','analyst','Security Operations',true,'2025-03-15 08:00:00','2024-05-15 09:00:00'),
('cu100001-0000-0000-0000-000000000012','amoore','a.moore@corp.com','analyst','Threat Intelligence',true,'2025-03-14 15:00:00','2024-06-01 08:00:00'),
('cu100001-0000-0000-0000-000000000013','contractor01','ext.jones@vendor.com','analyst','External',false,'2025-03-10 10:00:00','2024-06-15 10:00:00'),
('cu100001-0000-0000-0000-000000000014','rjohnson','r.johnson@corp.com','executive','C-Suite',true,'2025-03-13 09:00:00','2024-07-01 08:00:00'),
('cu100001-0000-0000-0000-000000000015','pclark','p.clark@corp.com','analyst','Incident Response',true,'2025-03-15 07:30:00','2024-07-15 09:00:00');

INSERT INTO access_logs VALUES
('al200001-0000-0000-0000-000000000001','cu100001-0000-0000-0000-000000000001','read','/api/incidents','10.0.1.50','Mozilla/5.0','success','2025-03-15 09:01:00'),
('al200001-0000-0000-0000-000000000002','cu100001-0000-0000-0000-000000000001','write','/api/incidents/4821','10.0.1.50','Mozilla/5.0','success','2025-03-15 09:15:00'),
('al200001-0000-0000-0000-000000000003','cu100001-0000-0000-0000-000000000002','read','/api/configs/firewall','10.0.1.75','curl/8.4.0','success','2025-03-15 08:32:00'),
('al200001-0000-0000-0000-000000000004','cu100001-0000-0000-0000-000000000003','write','/admin/users','10.0.0.5','Mozilla/5.0','success','2025-03-14 16:05:00'),
('al200001-0000-0000-0000-000000000005','cu100001-0000-0000-0000-000000000003','delete','/admin/users/old_account','10.0.0.5','Mozilla/5.0','success','2025-03-14 16:10:00'),
('al200001-0000-0000-0000-000000000006','cu100001-0000-0000-0000-000000000004','read','/api/reports/executive','10.0.0.2','Safari/17.0','success','2025-03-13 11:05:00'),
('al200001-0000-0000-0000-000000000007','cu100001-0000-0000-0000-000000000005','read','/api/alerts','10.0.1.51','Mozilla/5.0','success','2025-03-15 07:50:00'),
('al200001-0000-0000-0000-000000000008','cu100001-0000-0000-0000-000000000006','write','/api/configs/ids','10.0.1.76','Postman/10.0','success','2025-03-15 08:20:00'),
('al200001-0000-0000-0000-000000000009','cu100001-0000-0000-0000-000000000007','read','/api/incidents','192.168.1.100','Mozilla/5.0','denied','2025-03-12 14:05:00'),
('al200001-0000-0000-0000-000000000010','cu100001-0000-0000-0000-000000000013','read','/api/configs/vpn','203.0.113.50','Python/3.11','denied','2025-03-10 10:05:00'),
('al200001-0000-0000-0000-000000000011','cu100001-0000-0000-0000-000000000013','read','/admin/keys','203.0.113.50','Python/3.11','denied','2025-03-10 10:06:00'),
('al200001-0000-0000-0000-000000000012','cu100001-0000-0000-0000-000000000009','write','/api/configs/servers','10.0.2.10','curl/8.4.0','success','2025-03-15 06:05:00'),
('al200001-0000-0000-0000-000000000013','cu100001-0000-0000-0000-000000000010','write','/admin/permissions','10.0.0.6','Mozilla/5.0','success','2025-03-14 17:05:00'),
('al200001-0000-0000-0000-000000000014','cu100001-0000-0000-0000-000000000011','read','/api/alerts','10.0.1.52','Mozilla/5.0','success','2025-03-15 08:02:00'),
('al200001-0000-0000-0000-000000000015','cu100001-0000-0000-0000-000000000012','read','/api/threat-intel','10.0.1.80','Mozilla/5.0','success','2025-03-14 15:05:00'),
('al200001-0000-0000-0000-000000000016','cu100001-0000-0000-0000-000000000015','write','/api/incidents/4822','10.0.1.55','Mozilla/5.0','success','2025-03-15 07:35:00'),
('al200001-0000-0000-0000-000000000017','cu100001-0000-0000-0000-000000000002','read','/api/logs/audit','10.0.1.75','curl/8.4.0','success','2025-03-15 09:00:00'),
('al200001-0000-0000-0000-000000000018','cu100001-0000-0000-0000-000000000008','read','/api/compliance/reports','10.0.1.60','Mozilla/5.0','success','2025-03-14 09:35:00'),
('al200001-0000-0000-0000-000000000019','cu100001-0000-0000-0000-000000000001','write','/api/playbooks/run','10.0.1.50','Mozilla/5.0','success','2025-03-15 09:30:00'),
('al200001-0000-0000-0000-000000000020','cu100001-0000-0000-0000-000000000014','read','/api/reports/board','10.0.0.3','Safari/17.0','success','2025-03-13 09:05:00');

INSERT INTO login_attempts VALUES
('la300001-0000-0000-0000-000000000001','cu100001-0000-0000-0000-000000000001','success','10.0.1.50','sso',NULL,'2025-03-15 08:58:00'),
('la300001-0000-0000-0000-000000000002','cu100001-0000-0000-0000-000000000002','success','10.0.1.75','sso',NULL,'2025-03-15 08:28:00'),
('la300001-0000-0000-0000-000000000003','cu100001-0000-0000-0000-000000000003','success','10.0.0.5','password+mfa',NULL,'2025-03-14 15:58:00'),
('la300001-0000-0000-0000-000000000004','cu100001-0000-0000-0000-000000000004','success','10.0.0.2','sso',NULL,'2025-03-13 10:58:00'),
('la300001-0000-0000-0000-000000000005','cu100001-0000-0000-0000-000000000007','failed','192.168.1.100','password','wrong_password','2025-03-12 13:55:00'),
('la300001-0000-0000-0000-000000000006','cu100001-0000-0000-0000-000000000007','failed','192.168.1.100','password','wrong_password','2025-03-12 13:56:00'),
('la300001-0000-0000-0000-000000000007','cu100001-0000-0000-0000-000000000007','failed','192.168.1.100','password','wrong_password','2025-03-12 13:57:00'),
('la300001-0000-0000-0000-000000000008','cu100001-0000-0000-0000-000000000007','success','192.168.1.100','password','account_locked','2025-03-12 13:58:00'),
('la300001-0000-0000-0000-000000000009','cu100001-0000-0000-0000-000000000013','failed','203.0.113.50','password','expired_credentials','2025-03-10 09:55:00'),
('la300001-0000-0000-0000-000000000010','cu100001-0000-0000-0000-000000000013','success','203.0.113.50','password+mfa',NULL,'2025-03-10 09:58:00'),
('la300001-0000-0000-0000-000000000011','cu100001-0000-0000-0000-000000000005','success','10.0.1.51','sso',NULL,'2025-03-15 07:43:00'),
('la300001-0000-0000-0000-000000000012','cu100001-0000-0000-0000-000000000006','success','10.0.1.76','sso',NULL,'2025-03-15 08:13:00'),
('la300001-0000-0000-0000-000000000013','cu100001-0000-0000-0000-000000000009','success','10.0.2.10','certificate',NULL,'2025-03-15 05:58:00'),
('la300001-0000-0000-0000-000000000014','cu100001-0000-0000-0000-000000000010','success','10.0.0.6','password+mfa',NULL,'2025-03-14 16:58:00'),
('la300001-0000-0000-0000-000000000015','cu100001-0000-0000-0000-000000000011','success','10.0.1.52','sso',NULL,'2025-03-15 07:58:00'),
('la300001-0000-0000-0000-000000000016','cu100001-0000-0000-0000-000000000001','failed','45.33.22.11','password','ip_blocked','2025-03-14 03:00:00'),
('la300001-0000-0000-0000-000000000017','cu100001-0000-0000-0000-000000000001','failed','45.33.22.11','password','ip_blocked','2025-03-14 03:01:00'),
('la300001-0000-0000-0000-000000000018','cu100001-0000-0000-0000-000000000001','failed','45.33.22.12','password','ip_blocked','2025-03-14 03:02:00'),
('la300001-0000-0000-0000-000000000019','cu100001-0000-0000-0000-000000000014','success','10.0.0.3','sso',NULL,'2025-03-13 08:58:00'),
('la300001-0000-0000-0000-000000000020','cu100001-0000-0000-0000-000000000015','success','10.0.1.55','sso',NULL,'2025-03-15 07:28:00');

INSERT INTO security_alerts VALUES
('sa400001-0000-0000-0000-000000000001','cu100001-0000-0000-0000-000000000007','brute_force','high','resolved','3 consecutive failed login attempts from 192.168.1.100','2025-03-12 14:30:00','2025-03-12 13:58:00'),
('sa400001-0000-0000-0000-000000000002','cu100001-0000-0000-0000-000000000013','unauthorized_access','medium','resolved','External contractor attempted to access VPN configs and admin keys','2025-03-11 10:00:00','2025-03-10 10:07:00'),
('sa400001-0000-0000-0000-000000000003','cu100001-0000-0000-0000-000000000001','credential_stuffing','critical','resolved','Multiple failed attempts from known malicious IPs targeting analyst account','2025-03-14 08:00:00','2025-03-14 03:03:00'),
('sa400001-0000-0000-0000-000000000004','cu100001-0000-0000-0000-000000000007','mfa_disabled','low','dismissed','User has MFA disabled on their account',NULL,'2025-03-12 14:00:00'),
('sa400001-0000-0000-0000-000000000005','cu100001-0000-0000-0000-000000000013','mfa_disabled','low','dismissed','External contractor has MFA disabled',NULL,'2025-03-10 10:00:00'),
('sa400001-0000-0000-0000-000000000006','cu100001-0000-0000-0000-000000000003','privilege_escalation','medium','investigating','Admin modified permissions outside change window',NULL,'2025-03-14 16:12:00'),
('sa400001-0000-0000-0000-000000000007','cu100001-0000-0000-0000-000000000009','unusual_activity','low','resolved','Infrastructure access at unusual hour (6 AM)','2025-03-15 08:00:00','2025-03-15 06:05:00'),
('sa400001-0000-0000-0000-000000000008','cu100001-0000-0000-0000-000000000002','data_exfiltration','high','investigating','Large volume of audit log reads in short timeframe',NULL,'2025-03-15 09:05:00'),
('sa400001-0000-0000-0000-000000000009','cu100001-0000-0000-0000-000000000005','anomalous_pattern','medium','resolved','Unusual access pattern detected for SOC analyst','2025-03-15 10:00:00','2025-03-15 08:00:00'),
('sa400001-0000-0000-0000-000000000010','cu100001-0000-0000-0000-000000000012','malware_detected','critical','investigating','Potential RAT signature in network traffic from threat intel workstation',NULL,'2025-03-14 15:10:00');

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number VARCHAR(20) NOT NULL UNIQUE,
  account_type VARCHAR(50) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  balance_cents BIGINT NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  routing_number VARCHAR(20),
  opened_at TIMESTAMP NOT NULL DEFAULT now(),
  closed_at TIMESTAMP
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  transaction_type VARCHAR(50) NOT NULL,
  amount_cents BIGINT NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  description VARCHAR(255),
  counterparty_name VARCHAR(255),
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  reference_id VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP
);

CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  settlement_type VARCHAR(50) NOT NULL,
  amount_cents BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  settled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  reason VARCHAR(255) NOT NULL,
  amount_cents BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  filed_at TIMESTAMP NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP
);

INSERT INTO accounts (id, account_number, account_type, owner_name, email, phone, balance_cents, currency, status, routing_number, opened_at) VALUES
('aa000000-0000-0000-0000-000000000001', 'ACC-10001', 'checking', 'James Wilson', 'james@example.com', '555-1001', 1250000, 'USD', 'active', '021000021', '2024-01-10'),
('aa000000-0000-0000-0000-000000000002', 'ACC-10002', 'savings', 'Maria Rodriguez', 'maria.r@example.com', '555-1002', 4500000, 'USD', 'active', '021000021', '2024-01-15'),
('aa000000-0000-0000-0000-000000000003', 'ACC-10003', 'checking', 'Robert Chen', 'robert.c@example.com', '555-1003', 320000, 'USD', 'active', '021000021', '2024-02-01'),
('aa000000-0000-0000-0000-000000000004', 'ACC-10004', 'business', 'TechStart LLC', 'finance@techstart.com', '555-1004', 8750000, 'USD', 'active', '021000021', '2024-02-10'),
('aa000000-0000-0000-0000-000000000005', 'ACC-10005', 'savings', 'Sarah Kim', 'sarah.k@example.com', '555-1005', 2100000, 'USD', 'active', '021000021', '2024-03-01'),
('aa000000-0000-0000-0000-000000000006', 'ACC-10006', 'checking', 'Michael Brown', 'mike.b@example.com', '555-1006', 89000, 'USD', 'active', '021000021', '2024-03-15'),
('aa000000-0000-0000-0000-000000000007', 'ACC-10007', 'business', 'DataFlow Inc', 'accounts@dataflow.io', '555-1007', 15200000, 'USD', 'active', '021000021', '2024-04-01'),
('aa000000-0000-0000-0000-000000000008', 'ACC-10008', 'checking', 'Lisa Park', 'lisa.p@example.com', '555-1008', 670000, 'USD', 'active', '021000021', '2024-04-10'),
('aa000000-0000-0000-0000-000000000009', 'ACC-10009', 'savings', 'David Thompson', 'david.t@example.com', '555-1009', 3400000, 'USD', 'active', '021000021', '2024-05-01'),
('aa000000-0000-0000-0000-000000000010', 'ACC-10010', 'checking', 'Anna Martinez', 'anna.m@example.com', '555-1010', 150000, 'USD', 'frozen', '021000021', '2024-05-15'),
('aa000000-0000-0000-0000-000000000011', 'ACC-10011', 'business', 'CloudNine Corp', 'billing@cloudnine.com', '555-1011', 22500000, 'USD', 'active', '021000021', '2024-06-01'),
('aa000000-0000-0000-0000-000000000012', 'ACC-10012', 'checking', 'Kevin O''Brien', 'kevin.ob@example.com', '555-1012', 445000, 'USD', 'active', '021000021', '2024-06-15');

INSERT INTO transactions (id, account_id, transaction_type, amount_cents, fee_cents, currency, description, counterparty_name, category, status, reference_id, created_at) VALUES
('bb000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'deposit', 500000, 0, 'USD', 'Payroll deposit', 'Acme Corp', 'income', 'completed', 'REF-001', '2024-06-01'),
('bb000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-000000000001', 'withdrawal', -15000, 0, 'USD', 'ATM withdrawal', NULL, 'cash', 'completed', 'REF-002', '2024-06-02'),
('bb000000-0000-0000-0000-000000000003', 'aa000000-0000-0000-0000-000000000002', 'deposit', 100000, 0, 'USD', 'Transfer from checking', 'Self', 'transfer', 'completed', 'REF-003', '2024-06-03'),
('bb000000-0000-0000-0000-000000000004', 'aa000000-0000-0000-0000-000000000003', 'payment', -45000, 150, 'USD', 'Electric bill payment', 'City Power Co', 'utilities', 'completed', 'REF-004', '2024-06-05'),
('bb000000-0000-0000-0000-000000000005', 'aa000000-0000-0000-0000-000000000004', 'deposit', 2500000, 0, 'USD', 'Client payment', 'BigCo Inc', 'income', 'completed', 'REF-005', '2024-06-10'),
('bb000000-0000-0000-0000-000000000006', 'aa000000-0000-0000-0000-000000000004', 'payment', -350000, 500, 'USD', 'AWS monthly bill', 'Amazon Web Services', 'infrastructure', 'completed', 'REF-006', '2024-06-15'),
('bb000000-0000-0000-0000-000000000007', 'aa000000-0000-0000-0000-000000000005', 'deposit', 200000, 0, 'USD', 'Savings transfer', 'Self', 'transfer', 'completed', 'REF-007', '2024-06-20'),
('bb000000-0000-0000-0000-000000000008', 'aa000000-0000-0000-0000-000000000006', 'payment', -8500, 0, 'USD', 'Netflix subscription', 'Netflix Inc', 'entertainment', 'completed', 'REF-008', '2024-07-01'),
('bb000000-0000-0000-0000-000000000009', 'aa000000-0000-0000-0000-000000000006', 'payment', -12000, 0, 'USD', 'Grocery store', 'Whole Foods', 'groceries', 'completed', 'REF-009', '2024-07-03'),
('bb000000-0000-0000-0000-000000000010', 'aa000000-0000-0000-0000-000000000007', 'deposit', 5000000, 0, 'USD', 'Series A funding', 'Venture Capital Fund', 'investment', 'completed', 'REF-010', '2024-07-05'),
('bb000000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-000000000007', 'payment', -120000, 0, 'USD', 'Office lease payment', 'WeWork', 'rent', 'completed', 'REF-011', '2024-07-10'),
('bb000000-0000-0000-0000-000000000012', 'aa000000-0000-0000-0000-000000000008', 'deposit', 350000, 0, 'USD', 'Payroll deposit', 'Tech Solutions', 'income', 'completed', 'REF-012', '2024-07-15'),
('bb000000-0000-0000-0000-000000000013', 'aa000000-0000-0000-0000-000000000008', 'payment', -25000, 0, 'USD', 'Internet bill', 'Comcast', 'utilities', 'completed', 'REF-013', '2024-07-18'),
('bb000000-0000-0000-0000-000000000014', 'aa000000-0000-0000-0000-000000000009', 'deposit', 50000, 0, 'USD', 'Interest payment', 'Bank', 'interest', 'completed', 'REF-014', '2024-07-20'),
('bb000000-0000-0000-0000-000000000015', 'aa000000-0000-0000-0000-000000000010', 'payment', -200000, 0, 'USD', 'Suspicious transfer', 'Unknown', 'transfer', 'flagged', 'REF-015', '2024-08-01'),
('bb000000-0000-0000-0000-000000000016', 'aa000000-0000-0000-0000-000000000001', 'payment', -65000, 0, 'USD', 'Car insurance', 'StateFarm', 'insurance', 'completed', 'REF-016', '2024-08-05'),
('bb000000-0000-0000-0000-000000000017', 'aa000000-0000-0000-0000-000000000011', 'deposit', 8000000, 0, 'USD', 'Enterprise contract', 'MegaCorp', 'income', 'completed', 'REF-017', '2024-08-10'),
('bb000000-0000-0000-0000-000000000018', 'aa000000-0000-0000-0000-000000000011', 'payment', -450000, 1000, 'USD', 'Payroll batch', 'ADP Payroll', 'payroll', 'completed', 'REF-018', '2024-08-15'),
('bb000000-0000-0000-0000-000000000019', 'aa000000-0000-0000-0000-000000000012', 'deposit', 420000, 0, 'USD', 'Freelance payment', 'Design Studio', 'income', 'completed', 'REF-019', '2024-08-20'),
('bb000000-0000-0000-0000-000000000020', 'aa000000-0000-0000-0000-000000000003', 'payment', -18000, 0, 'USD', 'Gas station', 'Shell', 'transportation', 'completed', 'REF-020', '2024-08-22'),
('bb000000-0000-0000-0000-000000000021', 'aa000000-0000-0000-0000-000000000004', 'payment', -75000, 250, 'USD', 'Software licenses', 'JetBrains', 'software', 'completed', 'REF-021', '2024-09-01'),
('bb000000-0000-0000-0000-000000000022', 'aa000000-0000-0000-0000-000000000005', 'withdrawal', -50000, 0, 'USD', 'Cash withdrawal', NULL, 'cash', 'completed', 'REF-022', '2024-09-05'),
('bb000000-0000-0000-0000-000000000023', 'aa000000-0000-0000-0000-000000000006', 'deposit', 500000, 0, 'USD', 'Payroll deposit', 'Tech Solutions', 'income', 'completed', 'REF-023', '2024-09-15'),
('bb000000-0000-0000-0000-000000000024', 'aa000000-0000-0000-0000-000000000007', 'payment', -250000, 0, 'USD', 'Marketing campaign', 'Google Ads', 'marketing', 'completed', 'REF-024', '2024-09-20'),
('bb000000-0000-0000-0000-000000000025', 'aa000000-0000-0000-0000-000000000001', 'deposit', 500000, 0, 'USD', 'Payroll deposit', 'Acme Corp', 'income', 'completed', 'REF-025', '2024-10-01'),
('bb000000-0000-0000-0000-000000000026', 'aa000000-0000-0000-0000-000000000008', 'payment', -3500, 0, 'USD', 'Coffee shop', 'Starbucks', 'dining', 'completed', 'REF-026', '2024-10-03'),
('bb000000-0000-0000-0000-000000000027', 'aa000000-0000-0000-0000-000000000009', 'deposit', 75000, 0, 'USD', 'Dividend payment', 'Vanguard', 'investment', 'completed', 'REF-027', '2024-10-10'),
('bb000000-0000-0000-0000-000000000028', 'aa000000-0000-0000-0000-000000000010', 'payment', -150000, 0, 'USD', 'Large transfer out', 'Offshore Account', 'transfer', 'flagged', 'REF-028', '2024-10-15'),
('bb000000-0000-0000-0000-000000000029', 'aa000000-0000-0000-0000-000000000011', 'payment', -180000, 0, 'USD', 'Legal fees', 'Smith & Associates', 'legal', 'completed', 'REF-029', '2024-10-20'),
('bb000000-0000-0000-0000-000000000030', 'aa000000-0000-0000-0000-000000000012', 'payment', -42000, 0, 'USD', 'Gym membership', 'Equinox', 'health', 'completed', 'REF-030', '2024-11-01');

INSERT INTO fraud_alerts (id, transaction_id, alert_type, severity, status, description, created_at, resolved_at) VALUES
('cc000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000015', 'unusual_amount', 'high', 'resolved', 'Transaction amount exceeds normal pattern', '2024-08-01', '2024-08-03'),
('cc000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000028', 'suspicious_recipient', 'critical', 'open', 'Transfer to flagged offshore account', '2024-10-15', NULL),
('cc000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000015', 'velocity_check', 'medium', 'resolved', 'Multiple large transactions in short period', '2024-08-01', '2024-08-02'),
('cc000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000028', 'geo_anomaly', 'high', 'investigating', 'Transaction from unusual geographic location', '2024-10-15', NULL),
('cc000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000009', 'card_testing', 'low', 'resolved', 'Small test transaction detected', '2024-07-03', '2024-07-04');

INSERT INTO settlements (id, transaction_id, settlement_type, amount_cents, status, settled_at, created_at) VALUES
('dd000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000005', 'ach', 2500000, 'completed', '2024-06-12', '2024-06-10'),
('dd000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000006', 'ach', 350000, 'completed', '2024-06-17', '2024-06-15'),
('dd000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000010', 'wire', 5000000, 'completed', '2024-07-06', '2024-07-05'),
('dd000000-0000-0000-0000-000000000004', 'bb000000-0000-0000-0000-000000000017', 'wire', 8000000, 'completed', '2024-08-11', '2024-08-10'),
('dd000000-0000-0000-0000-000000000005', 'bb000000-0000-0000-0000-000000000018', 'ach', 450000, 'completed', '2024-08-17', '2024-08-15'),
('dd000000-0000-0000-0000-000000000006', 'bb000000-0000-0000-0000-000000000011', 'ach', 120000, 'completed', '2024-07-12', '2024-07-10'),
('dd000000-0000-0000-0000-000000000007', 'bb000000-0000-0000-0000-000000000016', 'ach', 65000, 'completed', '2024-08-07', '2024-08-05'),
('dd000000-0000-0000-0000-000000000008', 'bb000000-0000-0000-0000-000000000021', 'ach', 75000, 'completed', '2024-09-03', '2024-09-01'),
('dd000000-0000-0000-0000-000000000009', 'bb000000-0000-0000-0000-000000000024', 'ach', 250000, 'pending', NULL, '2024-09-20'),
('dd000000-0000-0000-0000-000000000010', 'bb000000-0000-0000-0000-000000000029', 'wire', 180000, 'completed', '2024-10-22', '2024-10-20');

INSERT INTO chargebacks (id, transaction_id, reason, amount_cents, status, filed_at, resolved_at) VALUES
('ee000000-0000-0000-0000-000000000001', 'bb000000-0000-0000-0000-000000000015', 'unauthorized_transaction', 200000, 'won', '2024-08-05', '2024-09-01'),
('ee000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-000000000028', 'fraud', 150000, 'open', '2024-10-20', NULL),
('ee000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-000000000008', 'service_not_received', 8500, 'lost', '2024-07-15', '2024-08-01');

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

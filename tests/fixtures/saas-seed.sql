CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  industry VARCHAR(100),
  employee_count INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'starter',
  price_cents INTEGER NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL DEFAULT 'paid',
  due_date TIMESTAMP NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded',
  failure_reason VARCHAR(255),
  paid_at TIMESTAMP NOT NULL DEFAULT now()
);

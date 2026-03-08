CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL,
  interval VARCHAR(20) NOT NULL DEFAULT 'monthly'
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  paid_at TIMESTAMP NOT NULL DEFAULT now(),
  status VARCHAR(50) NOT NULL DEFAULT 'succeeded'
);

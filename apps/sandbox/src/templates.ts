export interface SuggestedQuery {
  label: string;
  sql: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concept: string;
  // Grading fields
  checkable?: boolean;
  requiredClauses?: string[];
  checkOrder?: boolean;
  trapHint?: string;
  correctHint?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tables: string[];
  rowsPerTable: number;
  suggestedQueries: SuggestedQuery[];
}

export const templates: Template[] = [
  {
    id: 'saas',
    name: 'SaaS Startup',
    description: 'Multi-tenant SaaS platform with organizations, users, plans, subscriptions, and billing.',
    icon: '\u{1F680}',
    category: 'STARTUP',
    tables: ['organizations', 'users', 'plans', 'subscriptions'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Count users by plan',
        sql: `SELECT p.name AS plan, COUNT(s.id) AS subscriptions FROM plans p LEFT JOIN subscriptions s ON p.id = s.plan_id GROUP BY p.name ORDER BY subscriptions DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Users with org names',
        sql: `SELECT u.full_name, u.email, o.name AS organization FROM users u JOIN organizations o ON u.org_id = o.id ORDER BY o.name`,
        difficulty: 'beginner',
        concept: 'JOIN',
      },
      {
        label: 'Challenge: Plans with no subscribers',
        sql: `SELECT p.name AS plan, p.price_cents / 100.0 AS price\nFROM plans p\nLEFT JOIN subscriptions s ON p.id = s.plan_id\nWHERE s.id IS NULL\nORDER BY p.name;`,
        difficulty: 'intermediate',
        concept: 'LEFT JOIN + IS NULL',
        checkable: true,
        requiredClauses: ['LEFT JOIN', 'IS NULL'],
        trapHint: 'If you used INNER JOIN or NOT IN, you may get incorrect results or miss edge cases. Use LEFT JOIN with IS NULL to find plans that have zero subscriptions.',
        correctHint: 'Correct! LEFT JOIN + IS NULL is the standard anti-join pattern for finding unmatched rows.',
      },
      {
        label: 'Challenge: Revenue by plan (include free plans)',
        sql: `SELECT p.name AS plan, p.price_cents / 100.0 AS price, COUNT(s.id) AS subscribers, (p.price_cents * COUNT(s.id)) / 100.0 AS total_revenue FROM plans p LEFT JOIN subscriptions s ON p.id = s.plan_id GROUP BY p.name, p.price_cents ORDER BY total_revenue DESC`,
        difficulty: 'intermediate',
        concept: 'aggregation',
        checkable: true,
        requiredClauses: ['LEFT JOIN', 'GROUP BY'],
        checkOrder: true,
        trapHint: 'If you used JOIN instead of LEFT JOIN, free plans with zero subscribers will be missing from your results. Make sure every plan appears in the output.',
        correctHint: 'You correctly used LEFT JOIN to include all plans, even those with no subscribers. COUNT(s.id) returns 0 for unmatched rows.',
      },
      {
        label: 'Active subscriptions',
        sql: `SELECT s.*, p.name AS plan_name FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.status = 'active'`,
        difficulty: 'beginner',
        concept: 'WHERE',
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Store',
    description: 'Online retail platform with customers, products, orders, and reviews.',
    icon: '\u{1F6D2}',
    category: 'COMMERCE',
    tables: ['customers', 'categories', 'products', 'orders', 'order_items', 'reviews'],
    rowsPerTable: 20,
    suggestedQueries: [
      {
        label: 'Orders by status',
        sql: `SELECT status, COUNT(*) AS order_count FROM orders GROUP BY status ORDER BY order_count DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Challenge: Customer spending (all customers)',
        sql: `SELECT c.first_name || ' ' || c.last_name AS customer, COUNT(o.id) AS orders, COALESCE(SUM(o.total_cents), 0) / 100.0 AS total_spent FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.first_name, c.last_name ORDER BY total_spent DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN+aggregation',
        checkable: true,
        requiredClauses: ['LEFT JOIN', 'GROUP BY'],
        checkOrder: true,
        trapHint: 'Your results are missing customers who never placed an order. Use LEFT JOIN instead of JOIN, and COALESCE to handle NULL sums.',
        correctHint: 'Correct! LEFT JOIN includes all customers, and COALESCE handles NULL sums for customers with zero orders.',
      },
      {
        label: 'Shipping performance',
        sql: `SELECT status, COUNT(*) AS count, ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - ordered_at)) / 86400), 1) AS avg_days FROM orders WHERE delivered_at IS NOT NULL GROUP BY status`,
        difficulty: 'intermediate',
        concept: 'date functions',
      },
      {
        label: 'Challenge: Products with no reviews',
        sql: `SELECT p.name, p.price\nFROM products p\nLEFT JOIN reviews r ON p.id = r.product_id\nWHERE r.id IS NULL\nORDER BY p.name;`,
        difficulty: 'intermediate',
        concept: 'LEFT JOIN anti-pattern',
        checkable: true,
        requiredClauses: ['LEFT JOIN', 'IS NULL'],
        trapHint: 'Using NOT IN or INNER JOIN will not correctly find products without reviews. Use LEFT JOIN with WHERE r.id IS NULL to find unmatched products.',
        correctHint: 'Correct! The LEFT JOIN + IS NULL anti-join pattern is the standard way to find rows with no matching counterpart.',
      },
    ],
  },
  {
    id: 'fintech',
    name: 'FinTech Payments',
    description: 'Payment processing platform with accounts, transactions, fraud detection, and settlements.',
    icon: '\u{1F4B0}',
    category: 'FINANCE',
    tables: ['accounts', 'transactions', 'fraud_alerts', 'settlements', 'chargebacks'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Transactions by type',
        sql: `SELECT type, COUNT(*) AS tx_count, SUM(amount_cents) / 100.0 AS total_amount FROM transactions GROUP BY type ORDER BY total_amount DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Account balances with fraud count',
        sql: `SELECT a.name, a.balance_cents / 100.0 AS balance, COUNT(f.id) AS fraud_alerts FROM accounts a LEFT JOIN transactions t ON a.id = t.account_id LEFT JOIN fraud_alerts f ON t.id = f.transaction_id GROUP BY a.id, a.name, a.balance_cents ORDER BY fraud_alerts DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN+aggregation',
      },
      {
        label: 'High-value transactions',
        sql: `SELECT t.id, a.name AS account, t.type, t.amount_cents / 100.0 AS amount, t.status, t.created_at FROM transactions t JOIN accounts a ON t.account_id = a.id WHERE t.amount_cents > 50000 ORDER BY t.amount_cents DESC`,
        difficulty: 'beginner',
        concept: 'WHERE+JOIN',
      },
      {
        label: 'Settlement summary',
        sql: `SELECT s.status, COUNT(*) AS count, SUM(s.amount_cents) / 100.0 AS total_settled FROM settlements s GROUP BY s.status ORDER BY total_settled DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
      },
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare System',
    description: 'Electronic health records with patients, providers, encounters, diagnoses, and billing.',
    icon: '\u{1F3E5}',
    category: 'HEALTH',
    tables: ['patients', 'providers', 'encounters', 'diagnoses', 'billing', 'medications', 'vitals'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Challenge: Encounters by provider (include all)',
        sql: `SELECT p.first_name || ' ' || p.last_name AS provider, p.specialty, COUNT(e.id) AS encounters FROM providers p LEFT JOIN encounters e ON p.id = e.provider_id GROUP BY p.id, p.first_name, p.last_name, p.specialty ORDER BY encounters DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
        checkable: true,
        requiredClauses: ['LEFT JOIN', 'GROUP BY'],
        checkOrder: true,
        trapHint: 'If you used JOIN instead of LEFT JOIN, providers with zero encounters will be missing. Use LEFT JOIN and COUNT(e.id) to include all providers.',
        correctHint: 'Correct! LEFT JOIN ensures all providers appear, even those with no encounters yet.',
      },
      {
        label: 'Patient medications with diagnoses',
        sql: `SELECT pt.first_name || ' ' || pt.last_name AS patient, m.name AS medication, m.dosage, d.code AS diagnosis_code, d.description AS diagnosis FROM medications m JOIN patients pt ON m.patient_id = pt.id JOIN diagnoses d ON m.diagnosis_id = d.id ORDER BY pt.last_name`,
        difficulty: 'intermediate',
        concept: 'multi-table JOIN',
      },
      {
        label: 'Challenge: Billing summary by status',
        sql: `SELECT b.status, COUNT(*) AS claims, SUM(b.amount_cents) / 100.0 AS total_amount, ROUND(AVG(b.amount_cents) / 100.0, 2) AS avg_amount FROM billing b GROUP BY b.status ORDER BY total_amount DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
        checkable: true,
        requiredClauses: ['GROUP BY'],
        checkOrder: true,
        trapHint: 'Make sure you are grouping by status and ordering by total_amount descending. Check that your column aliases match.',
        correctHint: 'Correct! You properly aggregated billing data by status with accurate totals and averages.',
      },
      {
        label: 'Recent vitals by patient',
        sql: `SELECT pt.first_name || ' ' || pt.last_name AS patient, v.heart_rate, v.systolic_bp, v.diastolic_bp, v.temperature, v.recorded_at FROM vitals v JOIN patients pt ON v.patient_id = pt.id ORDER BY v.recorded_at DESC LIMIT 20`,
        difficulty: 'beginner',
        concept: 'JOIN+ORDER BY',
      },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics & Supply Chain',
    description: 'Warehouse and shipping management with inventory tracking and route optimization.',
    icon: '\u{1F4E6}',
    category: 'OPERATIONS',
    tables: ['warehouses', 'shipments', 'inventory', 'routes'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Inventory by warehouse',
        sql: `SELECT w.name AS warehouse, w.city, COUNT(i.id) AS items, SUM(i.quantity) AS total_units FROM warehouses w LEFT JOIN inventory i ON w.id = i.warehouse_id GROUP BY w.id, w.name, w.city ORDER BY total_units DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Shipment status overview',
        sql: `SELECT s.status, COUNT(*) AS shipment_count, ROUND(AVG(s.weight_kg), 1) AS avg_weight FROM shipments s GROUP BY s.status ORDER BY shipment_count DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
      },
      {
        label: 'Route efficiency',
        sql: `SELECT r.origin, r.destination, r.distance_km, COUNT(s.id) AS shipments, ROUND(AVG(EXTRACT(EPOCH FROM (s.delivered_at - s.shipped_at)) / 3600), 1) AS avg_hours FROM routes r LEFT JOIN shipments s ON r.id = s.route_id WHERE s.delivered_at IS NOT NULL GROUP BY r.id, r.origin, r.destination, r.distance_km ORDER BY avg_hours ASC`,
        difficulty: 'intermediate',
        concept: 'JOIN+date functions',
      },
      {
        label: 'Low stock items',
        sql: `SELECT i.product_name, w.name AS warehouse, i.quantity, i.reorder_level FROM inventory i JOIN warehouses w ON i.warehouse_id = w.id WHERE i.quantity <= i.reorder_level ORDER BY i.quantity ASC`,
        difficulty: 'beginner',
        concept: 'WHERE+JOIN',
      },
    ],
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity Operations',
    description: 'Security operations center with asset tracking, vulnerability management, and incident response.',
    icon: '\u{1F512}',
    category: 'SECURITY',
    tables: ['assets', 'vulnerabilities', 'incidents', 'scan_results'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Vulnerabilities by severity',
        sql: `SELECT severity, COUNT(*) AS vuln_count FROM vulnerabilities GROUP BY severity ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Assets with open incidents',
        sql: `SELECT a.hostname, a.ip_address, a.asset_type, COUNT(i.id) AS open_incidents FROM assets a JOIN incidents i ON a.id = i.asset_id WHERE i.status = 'open' GROUP BY a.id, a.hostname, a.ip_address, a.asset_type ORDER BY open_incidents DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN+aggregation',
      },
      {
        label: 'Recent scan findings',
        sql: `SELECT sr.scanned_at, a.hostname, v.cve_id, v.severity, sr.status FROM scan_results sr JOIN assets a ON sr.asset_id = a.id JOIN vulnerabilities v ON sr.vulnerability_id = v.id ORDER BY sr.scanned_at DESC LIMIT 20`,
        difficulty: 'beginner',
        concept: 'multi-table JOIN',
      },
      {
        label: 'Incident response times',
        sql: `SELECT i.severity, COUNT(*) AS incidents, ROUND(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600), 1) AS avg_resolution_hours FROM incidents i WHERE i.resolved_at IS NOT NULL GROUP BY i.severity ORDER BY avg_resolution_hours DESC`,
        difficulty: 'intermediate',
        concept: 'date functions+aggregation',
      },
    ],
  },
  {
    id: 'ai-events',
    name: 'AI/ML Platform',
    description: 'Machine learning operations platform with model tracking, experiments, deployments, and event logging.',
    icon: '\u{1F916}',
    category: 'AI/ML',
    tables: ['models', 'experiments', 'deployments', 'events'],
    rowsPerTable: 15,
    suggestedQueries: [
      {
        label: 'Models by framework',
        sql: `SELECT framework, COUNT(*) AS model_count, ROUND(AVG(accuracy * 100), 1) AS avg_accuracy_pct FROM models GROUP BY framework ORDER BY model_count DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Experiment results by model',
        sql: `SELECT m.name AS model, m.framework, COUNT(e.id) AS experiments, ROUND(MAX(e.metric_value), 4) AS best_metric FROM models m JOIN experiments e ON m.id = e.model_id GROUP BY m.id, m.name, m.framework ORDER BY best_metric DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN+aggregation',
      },
      {
        label: 'Active deployments',
        sql: `SELECT d.environment, m.name AS model, d.status, d.replicas, d.created_at FROM deployments d JOIN models m ON d.model_id = m.id WHERE d.status = 'active' ORDER BY d.created_at DESC`,
        difficulty: 'beginner',
        concept: 'WHERE+JOIN',
      },
      {
        label: 'Event volume by type',
        sql: `SELECT event_type, COUNT(*) AS event_count, MIN(created_at) AS first_event, MAX(created_at) AS last_event FROM events GROUP BY event_type ORDER BY event_count DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
      },
    ],
  },
  {
    id: 'sql-traps',
    name: 'SQL Debugging Challenge',
    description: 'Intentionally tricky data that exposes common SQL mistakes. Learn by debugging.',
    icon: '\u{1FAA4}',
    category: 'LEARNING',
    tables: ['customers', 'orders', 'products', 'reviews'],
    rowsPerTable: 175,
    suggestedQueries: [
      {
        label: 'Challenge: Count orders per customer',
        sql: `SELECT c.id, c.first_name, c.last_name, COUNT(o.id) as order_count\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.first_name, c.last_name\nORDER BY order_count DESC;`,
        difficulty: 'intermediate',
        concept: 'JOIN trap',
        checkable: true,
        requiredClauses: ['LEFT JOIN'],
        checkOrder: true,
        trapHint: 'Your query returned fewer rows than expected. Are you missing customers who have zero orders? Try LEFT JOIN instead of INNER JOIN. Also use COUNT(o.id) not COUNT(*) \u2014 COUNT(*) counts NULL rows as 1.',
        correctHint: 'Correct! LEFT JOIN includes all customers, even those with no orders. COUNT(o.id) correctly returns 0 for customers with no matching orders.',
      },
      {
        label: 'Challenge: Average revenue by status',
        sql: `SELECT status,\n  COUNT(*) as order_count,\n  ROUND(AVG(total)::numeric, 2) as avg_amount,\n  ROUND(AVG(CASE WHEN total > 0 THEN total END)::numeric, 2) as avg_positive\nFROM orders\nGROUP BY status\nORDER BY order_count DESC;`,
        difficulty: 'intermediate',
        concept: 'Aggregation trap',
        checkable: true,
        requiredClauses: ['GROUP BY', 'CASE'],
        trapHint: 'Look at the cancelled and returned rows. Cancelled orders have total=$0 and returned orders have negative totals. A simple AVG includes these, which distorts your analysis. Try using CASE WHEN to filter.',
        correctHint: 'You correctly separated raw averages from positive-only averages. In real analytics, understanding what to include/exclude in aggregations is critical.',
      },
      {
        label: 'Challenge: Find unshipped orders',
        sql: `SELECT COUNT(*) as unshipped\nFROM orders\nWHERE shipped_at IS NULL;`,
        difficulty: 'beginner',
        concept: 'NULL trap',
        checkable: true,
        requiredClauses: ['IS NULL'],
        trapHint: 'Did you use WHERE shipped_at != NULL or = NULL? In SQL, NULL comparisons with = or != always return UNKNOWN (not TRUE). Use IS NULL or IS NOT NULL instead.',
        correctHint: 'Correct! IS NULL is the only way to check for NULL values in SQL. This is one of the most common beginner mistakes.',
      },
      {
        label: 'Challenge: Top spenders by name',
        sql: `SELECT c.id, c.first_name, c.last_name, c.email,\n  SUM(o.total) as total_spent\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.id, c.first_name, c.last_name, c.email\nORDER BY total_spent DESC\nLIMIT 10;`,
        difficulty: 'advanced',
        concept: 'Duplicate name trap',
        checkable: true,
        requiredClauses: ['GROUP BY'],
        checkOrder: true,
        trapHint: 'Check your results for "John Smith". There are TWO different customers named John Smith (different IDs, cities, emails). If you GROUP BY name only, their spending gets merged. Always GROUP BY the primary key (id).',
        correctHint: 'You correctly grouped by ID, which keeps the two John Smiths separate. In production, never assume names are unique \u2014 always use the primary key for grouping.',
      },
      {
        label: 'Challenge: Monthly revenue (complete)',
        sql: `WITH months AS (\n  SELECT generate_series(\n    DATE_TRUNC('month', MIN(created_at)),\n    DATE_TRUNC('month', MAX(created_at)),\n    '1 month'\n  )::date as month\n  FROM orders\n)\nSELECT m.month,\n  COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total END), 0) as revenue\nFROM months m\nLEFT JOIN orders o ON DATE_TRUNC('month', o.created_at)::date = m.month\nGROUP BY m.month\nORDER BY m.month;`,
        difficulty: 'advanced',
        concept: 'Temporal trap',
        checkable: true,
        requiredClauses: ['generate_series', 'LEFT JOIN', 'COALESCE'],
        checkOrder: true,
        trapHint: 'Your query is missing months where no delivered orders exist. When you GROUP BY month from the orders table, months with zero delivered orders simply disappear. Use generate_series to create a complete date range, then LEFT JOIN.',
        correctHint: 'Excellent! You used generate_series for a complete date range and LEFT JOIN + COALESCE to fill gaps with $0. This is a common pattern for time-series reporting.',
      },
      {
        label: 'Products never ordered',
        sql: `SELECT p.name, p.category, p.price\nFROM products p\nLEFT JOIN orders o ON o.product_id = p.id\nWHERE o.id IS NULL`,
        difficulty: 'intermediate',
        concept: 'LEFT JOIN + IS NULL pattern',
      },
    ],
  },
];

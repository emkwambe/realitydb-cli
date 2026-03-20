export interface SuggestedQuery {
  label: string;
  sql: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concept: string;
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
        label: 'Revenue by plan',
        sql: `SELECT p.name AS plan, p.price_cents / 100.0 AS price, COUNT(s.id) AS subscribers, (p.price_cents * COUNT(s.id)) / 100.0 AS total_revenue FROM plans p LEFT JOIN subscriptions s ON p.id = s.plan_id GROUP BY p.name, p.price_cents ORDER BY total_revenue DESC`,
        difficulty: 'intermediate',
        concept: 'aggregation',
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
        label: 'Customer spending',
        sql: `SELECT c.first_name || ' ' || c.last_name AS customer, COUNT(o.id) AS orders, SUM(o.total_cents) / 100.0 AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.first_name, c.last_name ORDER BY total_spent DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN+aggregation',
      },
      {
        label: 'Shipping performance',
        sql: `SELECT status, COUNT(*) AS count, ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - ordered_at)) / 86400), 1) AS avg_days FROM orders WHERE delivered_at IS NOT NULL GROUP BY status`,
        difficulty: 'intermediate',
        concept: 'date functions',
      },
      {
        label: 'Review ratings',
        sql: `SELECT p.name, ROUND(AVG(r.rating), 1) AS avg_rating, COUNT(r.id) AS review_count FROM products p JOIN reviews r ON p.id = r.product_id GROUP BY p.id, p.name ORDER BY avg_rating DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
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
        label: 'Encounters by provider',
        sql: `SELECT p.first_name || ' ' || p.last_name AS provider, p.specialty, COUNT(e.id) AS encounters FROM providers p LEFT JOIN encounters e ON p.id = e.provider_id GROUP BY p.id, p.first_name, p.last_name, p.specialty ORDER BY encounters DESC`,
        difficulty: 'beginner',
        concept: 'GROUP BY',
      },
      {
        label: 'Patient medications with diagnoses',
        sql: `SELECT pt.first_name || ' ' || pt.last_name AS patient, m.name AS medication, m.dosage, d.code AS diagnosis_code, d.description AS diagnosis FROM medications m JOIN patients pt ON m.patient_id = pt.id JOIN diagnoses d ON m.diagnosis_id = d.id ORDER BY pt.last_name`,
        difficulty: 'intermediate',
        concept: 'multi-table JOIN',
      },
      {
        label: 'Billing summary by status',
        sql: `SELECT b.status, COUNT(*) AS claims, SUM(b.amount_cents) / 100.0 AS total_amount, ROUND(AVG(b.amount_cents) / 100.0, 2) AS avg_amount FROM billing b GROUP BY b.status ORDER BY total_amount DESC`,
        difficulty: 'beginner',
        concept: 'aggregation',
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
        label: 'Trap 1: Count orders per customer',
        sql: `SELECT c.first_name, c.last_name, COUNT(*) as order_count\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.first_name, c.last_name\nORDER BY order_count DESC`,
        difficulty: 'intermediate',
        concept: 'JOIN trap \u2014 try LEFT JOIN and COUNT(o.id) instead',
      },
      {
        label: 'Trap 2: Average order amount',
        sql: `SELECT status, ROUND(AVG(total)::numeric, 2) as avg_amount\nFROM orders\nGROUP BY status\nORDER BY avg_amount DESC`,
        difficulty: 'intermediate',
        concept: 'Aggregation trap \u2014 cancelled=$0, returned=negative',
      },
      {
        label: 'Trap 3: Find unshipped orders',
        sql: `SELECT COUNT(*) as unshipped FROM orders WHERE shipped_at != NULL`,
        difficulty: 'beginner',
        concept: 'NULL trap \u2014 use IS NULL not != NULL',
      },
      {
        label: 'Trap 4: Spending by customer name',
        sql: `SELECT c.first_name || ' ' || c.last_name as name, SUM(o.total) as spent\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nGROUP BY c.first_name, c.last_name\nORDER BY spent DESC\nLIMIT 10`,
        difficulty: 'advanced',
        concept: 'Duplicate name trap \u2014 GROUP BY id not name',
      },
      {
        label: 'Trap 5: Monthly revenue',
        sql: `SELECT DATE_TRUNC('month', created_at)::date as month, SUM(total) as revenue\nFROM orders\nWHERE status = 'delivered'\nGROUP BY 1\nORDER BY 1`,
        difficulty: 'advanced',
        concept: 'Temporal trap \u2014 missing months with $0 revenue',
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

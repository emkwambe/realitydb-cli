import type { CourseDefinition } from '../courseRegistry.js';

export const dataModelingCourse: CourseDefinition = {
  name: 'data-modeling',
  displayName: 'Data Modeling',
  description: 'Learn database design: normalization, relationships, constraints, and schema patterns.',
  difficulty: 'intermediate',
  estimatedMinutes: 75,
  schemaDDL: [
    // Intentionally denormalized table for normalization exercise
    `CREATE TABLE IF NOT EXISTS classroom_raw_orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(150) NOT NULL,
      customer_city VARCHAR(80),
      product_name VARCHAR(120) NOT NULL,
      product_category VARCHAR(60) NOT NULL,
      product_price NUMERIC(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      order_date DATE NOT NULL,
      order_status VARCHAR(30) DEFAULT 'pending'
    )`,
    // Properly normalized tables
    `CREATE TABLE IF NOT EXISTS classroom_departments (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      budget NUMERIC(12,2),
      created_at DATE NOT NULL DEFAULT CURRENT_DATE
    )`,
    `CREATE TABLE IF NOT EXISTS classroom_employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      department_id INTEGER REFERENCES classroom_departments(id),
      manager_id INTEGER REFERENCES classroom_employees(id),
      salary NUMERIC(10,2) NOT NULL,
      hire_date DATE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS classroom_projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      department_id INTEGER REFERENCES classroom_departments(id),
      start_date DATE NOT NULL,
      end_date DATE,
      status VARCHAR(30) DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS classroom_project_assignments (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES classroom_employees(id),
      project_id INTEGER REFERENCES classroom_projects(id),
      role VARCHAR(60) NOT NULL,
      assigned_date DATE NOT NULL,
      UNIQUE(employee_id, project_id)
    )`,
  ],
  seedSQL: [
    `INSERT INTO classroom_raw_orders (customer_name, customer_email, customer_city, product_name, product_category, product_price, quantity, order_date, order_status) VALUES
      ('Alice Johnson', 'alice@example.com', 'New York', 'Laptop Pro', 'Electronics', 1299.99, 1, '2025-03-01', 'completed'),
      ('Alice Johnson', 'alice@example.com', 'New York', 'Mouse Wireless', 'Electronics', 29.99, 2, '2025-03-01', 'completed'),
      ('Bob Smith', 'bob@example.com', 'London', 'Standing Desk', 'Furniture', 599.00, 1, '2025-03-15', 'completed'),
      ('Alice Johnson', 'alice@example.com', 'New York', 'Notebook Set', 'Office', 12.99, 5, '2025-04-02', 'completed'),
      ('Carol Martinez', 'carol@example.com', 'Madrid', 'Laptop Pro', 'Electronics', 1299.99, 1, '2025-04-10', 'shipped'),
      ('Bob Smith', 'bob@example.com', 'London', 'Desk Lamp', 'Office', 34.99, 1, '2025-04-20', 'pending')`,
    `INSERT INTO classroom_departments (name, budget, created_at) VALUES
      ('Engineering', 500000, '2024-01-01'),
      ('Marketing', 200000, '2024-01-01'),
      ('Sales', 300000, '2024-01-01'),
      ('HR', 150000, '2024-06-01')`,
    `INSERT INTO classroom_employees (name, email, department_id, manager_id, salary, hire_date) VALUES
      ('Diana Prince', 'diana@corp.com', 1, NULL, 150000, '2023-01-15'),
      ('Clark Kent', 'clark@corp.com', 1, 1, 120000, '2023-06-01'),
      ('Bruce Wayne', 'bruce@corp.com', 2, NULL, 140000, '2023-03-10'),
      ('Selina Kyle', 'selina@corp.com', 3, NULL, 130000, '2023-09-20'),
      ('Barry Allen', 'barry@corp.com', 1, 1, 110000, '2024-01-05'),
      ('Hal Jordan', 'hal@corp.com', 2, 3, 95000, '2024-04-15'),
      ('Arthur Curry', 'arthur@corp.com', 3, 4, 100000, '2024-07-01'),
      ('Victor Stone', 'victor@corp.com', 4, NULL, 105000, '2024-02-28')`,
    `INSERT INTO classroom_projects (name, department_id, start_date, end_date, status) VALUES
      ('Platform Rebuild', 1, '2025-01-01', '2025-06-30', 'active'),
      ('Brand Campaign', 2, '2025-02-01', '2025-04-30', 'completed'),
      ('Sales Portal', 3, '2025-03-01', NULL, 'active'),
      ('Onboarding System', 4, '2025-04-01', NULL, 'active')`,
    `INSERT INTO classroom_project_assignments (employee_id, project_id, role, assigned_date) VALUES
      (1, 1, 'Tech Lead', '2025-01-01'),
      (2, 1, 'Developer', '2025-01-15'),
      (5, 1, 'Developer', '2025-02-01'),
      (3, 2, 'Campaign Lead', '2025-02-01'),
      (6, 2, 'Designer', '2025-02-15'),
      (4, 3, 'Project Owner', '2025-03-01'),
      (7, 3, 'Sales Engineer', '2025-03-15'),
      (8, 4, 'Project Lead', '2025-04-01')`,
  ],
  exercises: [
    {
      id: 'identify-redundancy',
      title: 'Identify Redundancy',
      description: 'Query classroom_raw_orders to find how many times customer data (name, email, city) is duplicated. Count distinct customers vs total rows.',
      difficulty: 'beginner',
      hint: 'SELECT COUNT(*) AS total_rows, COUNT(DISTINCT customer_email) AS unique_customers FROM classroom_raw_orders;',
      tables: ['classroom_raw_orders'],
      expectedConcept: 'Data redundancy identification',
    },
    {
      id: 'foreign-key-traversal',
      title: 'Foreign Key Traversal',
      description: 'List all employees with their department name. Understand how foreign keys connect tables.',
      difficulty: 'beginner',
      hint: 'SELECT e.name, e.email, d.name AS department FROM classroom_employees e JOIN classroom_departments d ON e.department_id = d.id;',
      tables: ['classroom_employees', 'classroom_departments'],
      expectedConcept: 'Foreign key relationships',
    },
    {
      id: 'self-referential',
      title: 'Self-Referential Relationships',
      description: 'List each employee with their manager name. Include employees without managers (NULL).',
      difficulty: 'intermediate',
      hint: 'SELECT e.name AS employee, m.name AS manager FROM classroom_employees e LEFT JOIN classroom_employees m ON e.manager_id = m.id;',
      tables: ['classroom_employees'],
      expectedConcept: 'Self-referential FK + LEFT JOIN',
    },
    {
      id: 'many-to-many',
      title: 'Many-to-Many Relationships',
      description: 'List all project assignments showing employee name, project name, and role. This demonstrates the junction table pattern.',
      difficulty: 'intermediate',
      hint: 'SELECT e.name AS employee, p.name AS project, pa.role FROM classroom_project_assignments pa JOIN classroom_employees e ON pa.employee_id = e.id JOIN classroom_projects p ON pa.project_id = p.id;',
      tables: ['classroom_project_assignments', 'classroom_employees', 'classroom_projects'],
      expectedConcept: 'Junction table pattern',
    },
    {
      id: 'constraint-check',
      title: 'Unique Constraint Verification',
      description: 'Verify the UNIQUE constraint on classroom_project_assignments(employee_id, project_id) by checking for any duplicate assignments.',
      difficulty: 'intermediate',
      hint: 'SELECT employee_id, project_id, COUNT(*) FROM classroom_project_assignments GROUP BY employee_id, project_id HAVING COUNT(*) > 1;',
      tables: ['classroom_project_assignments'],
      expectedConcept: 'UNIQUE constraints',
    },
    {
      id: 'department-budget-analysis',
      title: 'Budget vs Salary Analysis',
      description: 'Compare each department budget against total employee salaries. Which departments are over or under budget?',
      difficulty: 'advanced',
      hint: 'SELECT d.name, d.budget, SUM(e.salary) AS total_salaries, d.budget - SUM(e.salary) AS remaining FROM classroom_departments d JOIN classroom_employees e ON e.department_id = d.id GROUP BY d.id, d.name, d.budget;',
      tables: ['classroom_departments', 'classroom_employees'],
      expectedConcept: 'Aggregation across relationships',
    },
  ],
};

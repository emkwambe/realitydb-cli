import type { GeneratorContext } from '../types.js';

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Dorothy', 'Andrew', 'Kimberly', 'Paul', 'Emily', 'Joshua', 'Donna',
  'Kenneth', 'Michelle', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez',
];

const EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com',
  'icloud.com', 'mail.com', 'fastmail.com', 'zoho.com', 'aol.com',
];

const STREET_NAMES = [
  'Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Lake',
  'Hill', 'Park', 'Walnut', 'Sunset', 'Railroad', 'Jackson', 'Lincoln',
  'Spring', 'Franklin', 'Church', 'Highland', 'Center',
];

const STREET_SUFFIXES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd', 'Way', 'Ct'];

const CITIES = [
  'Springfield', 'Portland', 'Franklin', 'Clinton', 'Greenville', 'Bristol',
  'Fairview', 'Salem', 'Madison', 'Georgetown', 'Arlington', 'Ashland',
  'Burlington', 'Manchester', 'Milton', 'Newport', 'Oakland', 'Riverside',
  'Chester', 'Hudson',
];

const COMPANY_SUFFIXES = ['Inc', 'LLC', 'Corp', 'Co', 'Ltd', 'Group', 'Solutions', 'Technologies'];

const COMPANY_NAMES = [
  'Apex', 'Vertex', 'Summit', 'Horizon', 'Pinnacle', 'Atlas', 'Nova', 'Quantum',
  'Fusion', 'Zenith', 'Catalyst', 'Nexus', 'Pulse', 'Vanguard', 'Orbit',
  'Synergy', 'Prism', 'Echo', 'Cascade', 'Ember',
];

const WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'alpha',
  'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'theta', 'kappa', 'lambda',
  'sigma', 'omega', 'data', 'system', 'process', 'network', 'cloud',
  'server', 'client', 'platform', 'engine', 'module', 'service',
];

export function generateEmail(ctx: GeneratorContext): string {
  const first = ctx.seed.pick(FIRST_NAMES).toLowerCase();
  const last = ctx.seed.pick(LAST_NAMES).toLowerCase();
  const domain = ctx.seed.pick(EMAIL_DOMAINS);
  return `${first}.${last}@${domain}`;
}

export function generateFirstName(ctx: GeneratorContext): string {
  return ctx.seed.pick(FIRST_NAMES);
}

export function generateLastName(ctx: GeneratorContext): string {
  return ctx.seed.pick(LAST_NAMES);
}

export function generateFullName(ctx: GeneratorContext): string {
  const first = ctx.seed.pick(FIRST_NAMES);
  const last = ctx.seed.pick(LAST_NAMES);
  return `${first} ${last}`;
}

export function generatePhone(ctx: GeneratorContext): string {
  const area = ctx.seed.nextInt(200, 999);
  const prefix = ctx.seed.nextInt(200, 999);
  const line = ctx.seed.nextInt(1000, 9999);
  return `+1-${area}-${prefix}-${line}`;
}

export function generateAddress(ctx: GeneratorContext): string {
  const number = ctx.seed.nextInt(1, 9999);
  const street = ctx.seed.pick(STREET_NAMES);
  const suffix = ctx.seed.pick(STREET_SUFFIXES);
  const city = ctx.seed.pick(CITIES);
  return `${number} ${street} ${suffix}, ${city}`;
}

export function generateCompanyName(ctx: GeneratorContext): string {
  const name = ctx.seed.pick(COMPANY_NAMES);
  const suffix = ctx.seed.pick(COMPANY_SUFFIXES);
  return `${name} ${suffix}`;
}

export function generateText(ctx: GeneratorContext, mode: 'short' | 'medium' | 'long'): string {
  const lengthMap = { short: 3, medium: 8, long: 20 };
  const wordCount = lengthMap[mode];
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(ctx.seed.pick(WORDS));
  }
  const text = words.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

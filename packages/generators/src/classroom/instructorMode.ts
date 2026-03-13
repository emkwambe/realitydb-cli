import type { CourseDefinition } from './courseRegistry.js';

export interface CustomCourseJSON {
  name: string;
  displayName: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  schemaDDL: string[];
  seedSQL: string[];
  exercises: Array<{
    id: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    hint: string;
    tables: string[];
    expectedConcept: string;
  }>;
}

/**
 * Generate a scaffold JSON string for a custom course.
 */
export function scaffoldCustomCourse(name: string): string {
  const scaffold: CustomCourseJSON = {
    name,
    displayName: name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'A custom course for RealityDB Classroom.',
    difficulty: 'beginner',
    estimatedMinutes: 60,
    schemaDDL: [
      `CREATE TABLE IF NOT EXISTS ${name.replace(/-/g, '_')}_example (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  value INTEGER DEFAULT 0
)`,
    ],
    seedSQL: [
      `INSERT INTO ${name.replace(/-/g, '_')}_example (name, value) VALUES ('sample', 42)`,
    ],
    exercises: [
      {
        id: 'example-exercise',
        title: 'Example Exercise',
        description: 'Write a SELECT query to view all rows in the example table.',
        difficulty: 'beginner',
        hint: `SELECT * FROM ${name.replace(/-/g, '_')}_example;`,
        tables: [`${name.replace(/-/g, '_')}_example`],
        expectedConcept: 'SELECT basics',
      },
    ],
  };
  return JSON.stringify(scaffold, null, 2);
}

/**
 * Validate a custom course JSON. Returns an array of error messages (empty = valid).
 */
export function validateCustomCourse(json: unknown): string[] {
  const errors: string[] = [];
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    return ['Course must be a JSON object'];
  }
  const obj = json as Record<string, unknown>;

  if (!obj.name || typeof obj.name !== 'string') errors.push('Missing or invalid "name" field');
  if (!obj.displayName || typeof obj.displayName !== 'string') errors.push('Missing or invalid "displayName" field');
  if (!obj.description || typeof obj.description !== 'string') errors.push('Missing or invalid "description" field');
  if (!['beginner', 'intermediate', 'advanced'].includes(obj.difficulty as string)) {
    errors.push('Invalid "difficulty": must be beginner, intermediate, or advanced');
  }
  if (typeof obj.estimatedMinutes !== 'number' || obj.estimatedMinutes <= 0) {
    errors.push('Invalid "estimatedMinutes": must be a positive number');
  }
  if (!Array.isArray(obj.schemaDDL) || obj.schemaDDL.length === 0) {
    errors.push('"schemaDDL" must be a non-empty array of SQL strings');
  }
  if (!Array.isArray(obj.seedSQL) || obj.seedSQL.length === 0) {
    errors.push('"seedSQL" must be a non-empty array of SQL strings');
  }
  if (!Array.isArray(obj.exercises) || obj.exercises.length === 0) {
    errors.push('"exercises" must be a non-empty array');
  } else {
    for (let i = 0; i < (obj.exercises as unknown[]).length; i++) {
      const ex = (obj.exercises as Record<string, unknown>[])[i];
      if (!ex.id || typeof ex.id !== 'string') errors.push(`Exercise ${i}: missing "id"`);
      if (!ex.title || typeof ex.title !== 'string') errors.push(`Exercise ${i}: missing "title"`);
      if (!ex.description || typeof ex.description !== 'string') errors.push(`Exercise ${i}: missing "description"`);
      if (!['beginner', 'intermediate', 'advanced'].includes(ex.difficulty as string)) {
        errors.push(`Exercise ${i}: invalid "difficulty"`);
      }
    }
  }
  return errors;
}

/**
 * Parse a custom course JSON into a CourseDefinition.
 */
export function parseCustomCourse(json: CustomCourseJSON): CourseDefinition {
  return {
    name: json.name,
    displayName: json.displayName,
    description: json.description,
    difficulty: json.difficulty,
    estimatedMinutes: json.estimatedMinutes,
    schemaDDL: json.schemaDDL,
    seedSQL: json.seedSQL,
    exercises: json.exercises.map((ex) => ({
      id: ex.id,
      title: ex.title,
      description: ex.description,
      difficulty: ex.difficulty,
      hint: ex.hint ?? '',
      tables: ex.tables ?? [],
      expectedConcept: ex.expectedConcept ?? '',
    })),
  };
}

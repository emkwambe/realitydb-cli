import type { DataboxConfig } from '@databox/config';
import { createDatabaseClient, testConnection, closeConnection } from '@databox/db';
import {
  CourseRegistry,
  sql101Course,
  analyticsIntroCourse,
  dataModelingCourse,
  startCourse,
  completeExercise,
  resetCourseProgress,
  getCourseStatus,
  loadProgress,
  scaffoldCustomCourse,
  validateCustomCourse,
  parseCustomCourse,
  buildExercisePack,
  groupByDifficulty,
} from '@databox/generators';
import type {
  CourseDefinition,
  CourseDifficulty,
  CourseStatusSummary,
  CustomCourseJSON,
  ExercisePack,
  Exercise,
} from '@databox/generators';
import { readFileSync } from 'node:fs';

// Build the default registry with built-in courses
function getDefaultCourseRegistry(): CourseRegistry {
  const registry = new CourseRegistry();
  registry.register(sql101Course);
  registry.register(analyticsIntroCourse);
  registry.register(dataModelingCourse);
  return registry;
}

export { getDefaultCourseRegistry };

export interface ClassroomStartResult {
  courseName: string;
  displayName: string;
  tablesCreated: string[];
  exerciseCount: number;
  durationMs: number;
}

export interface ClassroomStatusResult {
  courses: CourseStatusSummary[];
}

/**
 * Load a course into the database: create tables and insert seed data.
 */
export async function classroomStart(
  config: DataboxConfig,
  courseName: string,
): Promise<ClassroomStartResult> {
  const start = performance.now();
  const registry = getDefaultCourseRegistry();

  // Try loading from file if not a built-in course
  let course = registry.get(courseName);
  if (!course && (courseName.endsWith('.json') || courseName.includes('/'))) {
    const raw = readFileSync(courseName, 'utf-8');
    const json = JSON.parse(raw) as CustomCourseJSON;
    const errors = validateCustomCourse(json);
    if (errors.length > 0) {
      throw new Error(`Invalid course file: ${errors.join(', ')}`);
    }
    course = parseCustomCourse(json);
  }

  if (!course) {
    const available = registry.names().join(', ');
    throw new Error(`Course "${courseName}" not found. Available: ${available}`);
  }

  const pool = createDatabaseClient(config.database.client, config.database.connectionString);
  try {
    await testConnection(pool);

    // Create tables
    for (const ddl of course.schemaDDL) {
      await pool.query(ddl);
    }

    // Insert seed data
    for (const sql of course.seedSQL) {
      await pool.query(sql);
    }

    // Track progress
    startCourse(course.name);

    const durationMs = Math.round(performance.now() - start);
    return {
      courseName: course.name,
      displayName: course.displayName,
      tablesCreated: course.schemaDDL.length > 0
        ? extractTableNames(course.schemaDDL)
        : [],
      exerciseCount: course.exercises.length,
      durationMs,
    };
  } finally {
    await closeConnection(pool);
  }
}

/**
 * Get status for all courses or a specific course.
 */
export function classroomStatus(courseName?: string): ClassroomStatusResult {
  const registry = getDefaultCourseRegistry();

  if (courseName) {
    const course = registry.get(courseName);
    if (!course) {
      throw new Error(`Course "${courseName}" not found`);
    }
    return {
      courses: [getCourseStatus(course.name, course.exercises.length)],
    };
  }

  const courses = registry.list().map((c) =>
    getCourseStatus(c.name, c.exercises.length),
  );
  return { courses };
}

/**
 * Mark an exercise as completed.
 */
export function classroomComplete(
  courseName: string,
  exerciseId: string,
): void {
  const registry = getDefaultCourseRegistry();
  const course = registry.get(courseName);
  if (!course) {
    throw new Error(`Course "${courseName}" not found`);
  }
  const exercise = course.exercises.find((e) => e.id === exerciseId);
  if (!exercise) {
    const available = course.exercises.map((e) => e.id).join(', ');
    throw new Error(`Exercise "${exerciseId}" not found in ${courseName}. Available: ${available}`);
  }
  completeExercise(courseName, exerciseId);
}

/**
 * Reset progress for a course.
 */
export function classroomReset(courseName: string): void {
  resetCourseProgress(courseName);
}

/**
 * Scaffold a custom course JSON file.
 */
export function classroomCreate(name: string): string {
  return scaffoldCustomCourse(name);
}

/**
 * List all available courses.
 */
export function classroomList(): CourseDefinition[] {
  return getDefaultCourseRegistry().list();
}

/**
 * Get exercise pack for a course with optional difficulty filter.
 */
export function classroomExercises(
  courseName: string,
  difficulty?: CourseDifficulty,
): ExercisePack {
  const registry = getDefaultCourseRegistry();
  const course = registry.get(courseName);
  if (!course) {
    throw new Error(`Course "${courseName}" not found`);
  }
  return buildExercisePack(course, difficulty);
}

// Helper to extract table names from DDL
function extractTableNames(ddlStatements: string[]): string[] {
  const names: string[] = [];
  for (const ddl of ddlStatements) {
    const match = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (match) {
      names.push(match[1]);
    }
  }
  return names;
}

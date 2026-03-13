import type { CourseDefinition, Exercise, CourseDifficulty } from './courseRegistry.js';

export interface ExercisePack {
  courseName: string;
  difficulty: CourseDifficulty;
  exercises: Exercise[];
  totalExercises: number;
}

/**
 * Filter exercises by difficulty level. Returns exercises at or below the given level.
 */
export function filterByDifficulty(
  course: CourseDefinition,
  maxDifficulty: CourseDifficulty,
): Exercise[] {
  const levels: CourseDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  const maxIndex = levels.indexOf(maxDifficulty);
  return course.exercises.filter((ex) => levels.indexOf(ex.difficulty) <= maxIndex);
}

/**
 * Build an exercise pack from a course, optionally filtering by difficulty.
 */
export function buildExercisePack(
  course: CourseDefinition,
  difficulty?: CourseDifficulty,
): ExercisePack {
  const exercises = difficulty
    ? filterByDifficulty(course, difficulty)
    : course.exercises;

  return {
    courseName: course.name,
    difficulty: difficulty ?? course.difficulty,
    exercises,
    totalExercises: exercises.length,
  };
}

/**
 * Group exercises by difficulty level for display.
 */
export function groupByDifficulty(
  exercises: Exercise[],
): Record<CourseDifficulty, Exercise[]> {
  const groups: Record<CourseDifficulty, Exercise[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
  };
  for (const ex of exercises) {
    groups[ex.difficulty].push(ex);
  }
  return groups;
}

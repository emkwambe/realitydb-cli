import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface ExerciseProgress {
  completed: boolean;
  completedAt?: string;
}

export interface CourseProgress {
  startedAt: string;
  exercises: Record<string, ExerciseProgress>;
}

export interface ProgressData {
  courses: Record<string, CourseProgress>;
}

function getProgressDir(): string {
  return join(homedir(), '.realitydb');
}

function getProgressPath(): string {
  return join(getProgressDir(), 'progress.json');
}

export function loadProgress(): ProgressData {
  const filePath = getProgressPath();
  if (!existsSync(filePath)) {
    return { courses: {} };
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ProgressData;
  } catch {
    return { courses: {} };
  }
}

export function saveProgress(data: ProgressData): void {
  const dir = getProgressDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getProgressPath(), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

export function startCourse(courseName: string): ProgressData {
  const data = loadProgress();
  if (!data.courses[courseName]) {
    data.courses[courseName] = {
      startedAt: new Date().toISOString(),
      exercises: {},
    };
    saveProgress(data);
  }
  return data;
}

export function completeExercise(courseName: string, exerciseId: string): ProgressData {
  const data = loadProgress();
  if (!data.courses[courseName]) {
    data.courses[courseName] = {
      startedAt: new Date().toISOString(),
      exercises: {},
    };
  }
  data.courses[courseName].exercises[exerciseId] = {
    completed: true,
    completedAt: new Date().toISOString(),
  };
  saveProgress(data);
  return data;
}

export function resetCourseProgress(courseName: string): ProgressData {
  const data = loadProgress();
  delete data.courses[courseName];
  saveProgress(data);
  return data;
}

export interface CourseStatusSummary {
  courseName: string;
  started: boolean;
  startedAt?: string;
  totalExercises: number;
  completedExercises: number;
  completionPercent: number;
}

export function getCourseStatus(
  courseName: string,
  totalExercises: number,
): CourseStatusSummary {
  const data = loadProgress();
  const courseData = data.courses[courseName];
  if (!courseData) {
    return {
      courseName,
      started: false,
      totalExercises,
      completedExercises: 0,
      completionPercent: 0,
    };
  }
  const completedCount = Object.values(courseData.exercises).filter((e) => e.completed).length;
  return {
    courseName,
    started: true,
    startedAt: courseData.startedAt,
    totalExercises,
    completedExercises: completedCount,
    completionPercent: totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0,
  };
}

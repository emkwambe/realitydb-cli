import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '@databox/config';
import {
  classroomList,
  classroomStart,
  classroomStatus,
  classroomComplete,
  classroomReset,
  classroomCreate,
} from '@databox/core';
import { formatCIOutput } from '@databox/shared';
import { maskConnectionString } from '../utils.js';

const VERSION = '1.2.0';

export async function classroomListCommand(options: {
  ci?: boolean;
}): Promise<void> {
  const start = performance.now();
  try {
    const courses = classroomList();
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom list',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          courses: courses.map((c) => ({
            name: c.name,
            displayName: c.displayName,
            description: c.description,
            difficulty: c.difficulty,
            estimatedMinutes: c.estimatedMinutes,
            exerciseCount: c.exercises.length,
          })),
        },
      }));
      return;
    }

    console.log('');
    console.log('RealityDB Classroom — Available Courses');
    console.log('═══════════════════════════════════════');
    console.log('');
    for (const course of courses) {
      const difficultyBadge = course.difficulty.toUpperCase();
      console.log(`  ${course.name}`);
      console.log(`    ${course.displayName} — ${course.description}`);
      console.log(`    [${difficultyBadge}] ${course.exercises.length} exercises, ~${course.estimatedMinutes} min`);
      console.log('');
    }
    console.log('Start a course:');
    console.log('  realitydb classroom start <course-name>');
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom list',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

export async function classroomStartCommand(
  courseName: string,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    const config = await loadConfig();
    const masked = maskConnectionString(config.database.connectionString);

    if (!options.ci) {
      console.log('');
      console.log('RealityDB Classroom — Start Course');
      console.log('═══════════════════════════════════════');
      console.log(`Database: ${masked}`);
      console.log(`Course: ${courseName}`);
      console.log('');
      console.log('Setting up course tables...');
    }

    const result = await classroomStart(config, courseName);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom start',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: {
          courseName: result.courseName,
          displayName: result.displayName,
          tablesCreated: result.tablesCreated,
          exerciseCount: result.exerciseCount,
        },
      }));
      return;
    }

    console.log('');
    console.log(`Course "${result.displayName}" loaded successfully!`);
    console.log('');
    console.log('Tables created:');
    for (const table of result.tablesCreated) {
      console.log(`  ${table}`);
    }
    console.log('');
    console.log(`${result.exerciseCount} exercises ready. Good luck!`);
    console.log('');
    console.log('Track your progress:');
    console.log(`  realitydb classroom status ${result.courseName}`);
    console.log('');
    console.log('Mark an exercise complete:');
    console.log(`  realitydb classroom complete ${result.courseName} <exercise-id>`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom start',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    if (message.includes('not found')) {
      console.error(`[realitydb] ${message}`);
      console.error('');
      console.error('See available courses:');
      console.error('  realitydb classroom list');
    } else if (message.includes('connection') || message.includes('ECONNREFUSED')) {
      console.error(`[realitydb] Classroom start failed: ${message}`);
      console.error('Hint: Check that your database is running');
    } else {
      console.error(`[realitydb] Classroom start failed: ${message}`);
    }
    process.exit(1);
  }
}

export async function classroomStatusCommand(
  courseName: string | undefined,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    const result = classroomStatus(courseName);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom status',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: { courses: result.courses },
      }));
      return;
    }

    console.log('');
    console.log('RealityDB Classroom — Progress');
    console.log('═══════════════════════════════════════');
    console.log('');

    for (const course of result.courses) {
      const bar = buildProgressBar(course.completionPercent);
      const status = course.started ? `${course.completedExercises}/${course.totalExercises}` : 'not started';
      console.log(`  ${course.courseName}`);
      console.log(`    ${bar} ${course.completionPercent}% (${status})`);
      if (course.startedAt) {
        console.log(`    Started: ${new Date(course.startedAt).toLocaleDateString()}`);
      }
      console.log('');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom status',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

export async function classroomCompleteCommand(
  courseName: string,
  exerciseId: string,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    classroomComplete(courseName, exerciseId);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom complete',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: { courseName, exerciseId, completed: true },
      }));
      return;
    }

    console.log(`Exercise "${exerciseId}" marked as completed!`);
    // Show updated status
    const status = classroomStatus(courseName);
    const course = status.courses[0];
    const bar = buildProgressBar(course.completionPercent);
    console.log(`  ${bar} ${course.completionPercent}% (${course.completedExercises}/${course.totalExercises})`);
    if (course.completionPercent === 100) {
      console.log('');
      console.log('Congratulations! You completed the course!');
    }
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom complete',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

export async function classroomResetCommand(
  courseName: string,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    classroomReset(courseName);
    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom reset',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: { courseName, reset: true },
      }));
      return;
    }

    console.log(`Progress for "${courseName}" has been reset.`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom reset',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

export async function classroomCreateCommand(
  name: string,
  options: { ci?: boolean },
): Promise<void> {
  const start = performance.now();
  try {
    const content = classroomCreate(name);
    const filename = `${name}.course.json`;
    const filePath = resolve(filename);
    writeFileSync(filePath, content + '\n', 'utf-8');

    const durationMs = Math.round(performance.now() - start);

    if (options.ci) {
      console.log(formatCIOutput({
        success: true,
        command: 'classroom create',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs,
        data: { name, file: filePath },
      }));
      return;
    }

    console.log(`Course scaffold created: ${filePath}`);
    console.log('');
    console.log('Edit the file to add your tables, seed data, and exercises.');
    console.log('Then load it with:');
    console.log(`  realitydb classroom start ${filePath}`);
    console.log('');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (options.ci) {
      console.log(formatCIOutput({
        success: false,
        command: 'classroom create',
        version: VERSION,
        timestamp: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        error: message,
      }));
      process.exit(1);
    }
    console.error(`[realitydb] ${message}`);
    process.exit(1);
  }
}

function buildProgressBar(percent: number): string {
  const width = 20;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

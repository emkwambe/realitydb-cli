export type {
  CourseDifficulty,
  Exercise,
  CourseDefinition,
} from './courseRegistry.js';
export { CourseRegistry } from './courseRegistry.js';

export type { ExercisePack } from './exercisePack.js';
export { buildExercisePack, filterByDifficulty, groupByDifficulty } from './exercisePack.js';

export type {
  ExerciseProgress,
  CourseProgress,
  ProgressData,
  CourseStatusSummary,
} from './progressTracker.js';
export {
  loadProgress,
  saveProgress,
  startCourse,
  completeExercise,
  resetCourseProgress,
  getCourseStatus,
} from './progressTracker.js';

export type { CustomCourseJSON } from './instructorMode.js';
export {
  scaffoldCustomCourse,
  validateCustomCourse,
  parseCustomCourse,
} from './instructorMode.js';

export { sql101Course } from './courses/sql101.js';
export { analyticsIntroCourse } from './courses/analyticsIntro.js';
export { dataModelingCourse } from './courses/dataModeling.js';

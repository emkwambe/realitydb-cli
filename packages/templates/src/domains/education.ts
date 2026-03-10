import type { DomainTemplate } from '../types.js';

export const educationTemplate: DomainTemplate = {
  name: 'education',
  version: '1.0',
  description: 'K-12 school system with teachers, classes, students, and grades',
  targetTables: ['teachers', 'classes', 'students', 'enrollments', 'grades', 'attendance'],
  tableConfigs: new Map([
    ['teachers', {
      tableName: 'teachers',
      matchPattern: ['teachers', 'instructors', 'faculty', '*teacher*', '*instructor*', '*faculty*'],
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        { columnName: 'first_name', strategy: { kind: 'first_name' } },
        { columnName: 'last_name', strategy: { kind: 'last_name' } },
        {
          columnName: 'department',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Mathematics', 'English', 'Science', 'History', 'Art', 'Physical Education', 'Computer Science', 'Music'],
              weights: [0.18, 0.16, 0.16, 0.12, 0.10, 0.10, 0.10, 0.08],
            },
          },
        },
      ],
    }],
    ['classes', {
      tableName: 'classes',
      matchPattern: ['classes', 'courses', 'sections', '*class*', '*course*', '*section*'],
      columnOverrides: [
        {
          columnName: 'name',
          strategy: {
            kind: 'enum',
            options: {
              values: [
                'Algebra I', 'Algebra II', 'Geometry', 'Pre-Calculus',
                'English 9', 'English 10', 'English 11', 'AP English',
                'Biology', 'Chemistry', 'Physics', 'AP Physics',
                'World History', 'US History', 'Government',
                'Art Foundations', 'Studio Art',
                'PE', 'Health',
                'Intro to CS', 'AP Computer Science',
              ],
              weights: [
                0.06, 0.05, 0.05, 0.04,
                0.06, 0.05, 0.05, 0.04,
                0.06, 0.05, 0.04, 0.03,
                0.05, 0.05, 0.04,
                0.04, 0.03,
                0.05, 0.04,
                0.04, 0.04,
              ],
            },
          },
        },
        {
          columnName: 'subject',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Math', 'English', 'Science', 'History', 'Art', 'PE', 'CS', 'Music'],
              weights: [0.20, 0.18, 0.16, 0.14, 0.10, 0.08, 0.08, 0.06],
            },
          },
        },
        {
          columnName: 'period',
          strategy: { kind: 'integer', options: { min: 1, max: 8 } },
        },
        {
          columnName: 'school_year',
          strategy: {
            kind: 'enum',
            options: {
              values: ['2023-2024', '2024-2025', '2025-2026'],
              weights: [0.20, 0.50, 0.30],
            },
          },
        },
        {
          columnName: 'room_number',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
      ],
    }],
    ['students', {
      tableName: 'students',
      matchPattern: ['students', 'pupils', 'learners', '*student*', '*pupil*', '*learner*'],
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        { columnName: 'first_name', strategy: { kind: 'first_name' } },
        { columnName: 'last_name', strategy: { kind: 'last_name' } },
        {
          columnName: 'grade_level',
          strategy: { kind: 'integer', options: { min: 6, max: 12 } },
        },
      ],
    }],
    ['enrollments', {
      tableName: 'enrollments',
      matchPattern: ['enrollments', 'registrations', '*enrollment*', '*registration*'],
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['active', 'withdrawn', 'completed', 'transferred'],
              weights: [0.75, 0.05, 0.15, 0.05],
            },
          },
        },
      ],
    }],
    ['grades', {
      tableName: 'grades',
      matchPattern: ['grades', 'scores', 'assessments', 'marks', '*grade*', '*score*', '*assessment*', '*mark*'],
      columnOverrides: [
        {
          columnName: 'assignment_name',
          matchPattern: ['assignment_name', 'assignment', 'title'],
          strategy: {
            kind: 'enum',
            options: {
              values: [
                'Homework 1', 'Homework 2', 'Homework 3', 'Quiz 1', 'Quiz 2',
                'Midterm Exam', 'Final Exam', 'Project', 'Lab Report',
                'Essay', 'Presentation', 'Participation',
              ],
              weights: [
                0.10, 0.10, 0.08, 0.09, 0.08,
                0.10, 0.10, 0.08, 0.07,
                0.07, 0.06, 0.07,
              ],
            },
          },
        },
        {
          columnName: 'score',
          strategy: { kind: 'float', options: { min: 40, max: 100 } },
        },
        {
          columnName: 'max_score',
          strategy: {
            kind: 'enum',
            options: {
              values: [100, 50, 25, 10],
              weights: [0.60, 0.20, 0.15, 0.05],
            },
          },
        },
      ],
    }],
    ['attendance', {
      tableName: 'attendance',
      matchPattern: ['attendance', '*attendance*'],
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['present', 'absent', 'tardy', 'excused'],
              weights: [0.85, 0.05, 0.05, 0.05],
            },
          },
        },
        {
          columnName: 'date',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
  ]),
};

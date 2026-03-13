export type CourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string;
  title: string;
  description: string;
  difficulty: CourseDifficulty;
  hint: string;
  tables: string[];
  expectedConcept: string;
}

export interface CourseDefinition {
  name: string;
  displayName: string;
  description: string;
  difficulty: CourseDifficulty;
  estimatedMinutes: number;
  schemaDDL: string[];
  seedSQL: string[];
  exercises: Exercise[];
}

export class CourseRegistry {
  private courses = new Map<string, CourseDefinition>();

  register(course: CourseDefinition): void {
    this.courses.set(course.name, course);
  }

  get(name: string): CourseDefinition | undefined {
    return this.courses.get(name);
  }

  list(): CourseDefinition[] {
    return Array.from(this.courses.values());
  }

  has(name: string): boolean {
    return this.courses.has(name);
  }

  names(): string[] {
    return Array.from(this.courses.keys());
  }
}

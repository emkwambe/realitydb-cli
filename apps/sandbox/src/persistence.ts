export interface PersistedChallengeProgress {
  score: number;
  grade: string;
  attempts: number;
  completed: boolean;
  bestScore: number;
}

export interface PersistedAssessment {
  templateId: string;
  totalScore: number;
  challengeCount: number;
  timeSeconds: number;
  completedAt: number;
}

export interface PersistedSession {
  version: number;
  timestamp: number;
  templateId: string | null;
  editorContent: string;
  mode: 'training' | 'assessment';
  queryHistory: {
    sql: string;
    rowCount: number;
    duration: number;
    timestamp: number;
  }[];
  nlHistory: {
    question: string;
    sql: string;
    timestamp: number;
  }[];
  nlQueryCount: number;
  nlQueryDate: string;
  challengeProgress: {
    [templateId: string]: {
      [challengeLabel: string]: PersistedChallengeProgress;
    };
  };
  assessmentHistory: PersistedAssessment[];
  preferences: {
    schemaView: 'list' | 'erd';
    resultView: 'table' | 'chart' | 'split';
  };
}

const STORAGE_KEY = 'realitydb-sandbox-session';
const CURRENT_VERSION = 1;

function trimIfNeeded(session: PersistedSession): PersistedSession {
  const size = JSON.stringify(session).length;
  if (size > 4 * 1024 * 1024) {
    return {
      ...session,
      queryHistory: session.queryHistory.slice(-20),
      nlHistory: session.nlHistory.slice(-5),
      assessmentHistory: session.assessmentHistory.slice(-10),
    };
  }
  return session;
}

export function saveSession(session: Partial<PersistedSession>): void {
  try {
    const existing = loadSession();
    const merged = {
      ...existing,
      ...session,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    } as PersistedSession;
    const trimmed = trimIfNeeded(merged);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to save session:', e);
  }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PersistedSession;
    if (session.version !== CURRENT_VERSION) {
      return null;
    }
    return session;
  } catch (e) {
    console.warn('Failed to load session:', e);
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

export function resetDailyCounters(session: PersistedSession): PersistedSession {
  const today = new Date().toISOString().split('T')[0];
  if (session.nlQueryDate !== today) {
    return { ...session, nlQueryCount: 0, nlQueryDate: today };
  }
  return session;
}

export function getStorageSize(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Blob([data]).size : 0;
  } catch {
    return 0;
  }
}

// TODO: Replace localStorage with Cloudflare Worker API calls
// const API_BASE = '/api/classroom';

export interface Room {
  id: string;           // 6-char alphanumeric code
  name: string;         // "CS 101 - Spring 2026"
  professorName: string;
  templateId: string;   // which template to use
  challenges: number[]; // indices of suggestedQueries that are assigned
  createdAt: string;
  expiresAt: string;    // auto-expire after semester
  professorSecret: string; // stored in localStorage for MVP
}

export interface StudentSession {
  studentName: string;
  roomId: string;
  joinedAt: string;
  scores: Record<string, { score: number; maxScore: number; attempts: number; submittedAt: string }>;
}

export interface RoomDashboard {
  room: Room;
  students: StudentSession[];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(9)))
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 12)
    .toUpperCase();
}

function getRooms(): Room[] {
  try {
    return JSON.parse(localStorage.getItem('realitydb_rooms') || '[]');
  } catch {
    return [];
  }
}

function saveRooms(rooms: Room[]): void {
  localStorage.setItem('realitydb_rooms', JSON.stringify(rooms));
}

function getStudentSessions(roomId: string): StudentSession[] {
  try {
    return JSON.parse(localStorage.getItem(`realitydb_sessions_${roomId}`) || '[]');
  } catch {
    return [];
  }
}

function saveStudentSessions(roomId: string, sessions: StudentSession[]): void {
  localStorage.setItem(`realitydb_sessions_${roomId}`, JSON.stringify(sessions));
}

// Professor endpoints

export async function createRoom(
  name: string,
  professorName: string,
  templateId: string,
  challenges: number[]
): Promise<{ room: Room; professorSecret: string }> {
  const rooms = getRooms();
  let code = generateRoomCode();
  // Ensure unique code
  while (rooms.some(r => r.id === code)) {
    code = generateRoomCode();
  }
  const secret = generateSecret();
  const now = new Date();
  const expires = new Date(now);
  expires.setMonth(expires.getMonth() + 6); // 6-month expiry

  const room: Room = {
    id: code,
    name,
    professorName,
    templateId,
    challenges,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    professorSecret: secret,
  };

  rooms.push(room);
  saveRooms(rooms);

  return { room, professorSecret: secret };
}

export async function getRoomDashboard(
  roomId: string,
  professorSecret: string
): Promise<RoomDashboard> {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId);
  if (!room) throw new Error('Room not found');
  if (room.professorSecret !== professorSecret) throw new Error('Invalid secret');

  const students = getStudentSessions(roomId);
  return { room, students };
}

export async function closeRoom(
  roomId: string,
  professorSecret: string
): Promise<void> {
  const rooms = getRooms();
  const idx = rooms.findIndex(r => r.id === roomId);
  if (idx === -1) throw new Error('Room not found');
  if (rooms[idx].professorSecret !== professorSecret) throw new Error('Invalid secret');

  rooms.splice(idx, 1);
  saveRooms(rooms);
  localStorage.removeItem(`realitydb_sessions_${roomId}`);
}

// Student endpoints

export async function joinRoom(
  roomId: string,
  studentName: string
): Promise<{ room: Room; session: StudentSession }> {
  const rooms = getRooms();
  const room = rooms.find(r => r.id === roomId.toUpperCase());
  if (!room) throw new Error('Room not found. Check the code and try again.');

  const sessions = getStudentSessions(room.id);
  let session = sessions.find(s => s.studentName === studentName);

  if (!session) {
    session = {
      studentName,
      roomId: room.id,
      joinedAt: new Date().toISOString(),
      scores: {},
    };
    sessions.push(session);
    saveStudentSessions(room.id, sessions);
  }

  return { room, session };
}

export async function submitScore(
  roomId: string,
  studentName: string,
  challengeIndex: string,
  score: number,
  maxScore: number,
  attempts: number
): Promise<void> {
  const sessions = getStudentSessions(roomId);
  const session = sessions.find(s => s.studentName === studentName);
  if (!session) throw new Error('Session not found');

  session.scores[challengeIndex] = {
    score,
    maxScore,
    attempts,
    submittedAt: new Date().toISOString(),
  };

  saveStudentSessions(roomId, sessions);
}

export async function getMyScores(
  roomId: string,
  studentName: string
): Promise<StudentSession> {
  const sessions = getStudentSessions(roomId);
  const session = sessions.find(s => s.studentName === studentName);
  if (!session) throw new Error('Session not found');
  return session;
}

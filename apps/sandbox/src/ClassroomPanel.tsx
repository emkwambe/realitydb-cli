import { useState } from 'react';
import { templates } from './templates';
import type { Template } from './templates';
import { createRoom, joinRoom } from './ClassroomService';
import type { Room, StudentSession } from './ClassroomService';

type Tab = 'create' | 'join';
type CreateStep = 'details' | 'challenges' | 'created';

interface Props {
  onClose: () => void;
  onRoomCreated: (room: Room, professorSecret: string) => void;
  onStudentJoined: (room: Room, session: StudentSession) => void;
  onViewDashboard: (roomId: string, professorSecret: string) => void;
}

export function ClassroomPanel({ onClose, onRoomCreated, onStudentJoined, onViewDashboard }: Props) {
  const [tab, setTab] = useState<Tab>('create');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#12141a] border border-[#2a2a3e] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#2a2a3e]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-base">&#x1F3EB;</span> Classroom Mode
          </h2>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-white text-lg leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a2a3e]">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === 'create'
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-400/5'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
              tab === 'join'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5'
                : 'text-[var(--muted)] hover:text-white'
            }`}
          >
            Join Room
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'create' ? (
            <CreateRoomFlow onRoomCreated={onRoomCreated} onViewDashboard={onViewDashboard} />
          ) : (
            <JoinRoomFlow onStudentJoined={onStudentJoined} />
          )}
        </div>
      </div>
    </div>
  );
}

function CreateRoomFlow({
  onRoomCreated,
  onViewDashboard,
}: {
  onRoomCreated: (room: Room, secret: string) => void;
  onViewDashboard: (roomId: string, secret: string) => void;
}) {
  const [step, setStep] = useState<CreateStep>('details');
  const [roomName, setRoomName] = useState('');
  const [professorName, setProfessorName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0].id);
  const [selectedChallenges, setSelectedChallenges] = useState<Set<number>>(new Set());
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'code' | 'secret' | null>(null);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) as Template;
  const checkableQueries = selectedTemplate.suggestedQueries
    .map((q, i) => ({ query: q, index: i }))
    .filter(({ query }) => query.checkable);

  const handleToggleChallenge = (idx: number) => {
    setSelectedChallenges(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!roomName.trim() || !professorName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (selectedChallenges.size === 0) {
      setError('Please select at least one challenge.');
      return;
    }
    setError('');
    try {
      const { room, professorSecret } = await createRoom(
        roomName.trim(),
        professorName.trim(),
        selectedTemplateId,
        Array.from(selectedChallenges)
      );
      setCreatedRoom(room);
      setSecret(professorSecret);
      setStep('created');
      onRoomCreated(room, professorSecret);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room');
    }
  };

  const handleCopy = (text: string, type: 'code' | 'secret') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (step === 'created' && createdRoom) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-xs text-[var(--muted)] mb-3">Room created successfully!</p>
          <p className="text-xs text-[var(--muted)] mb-1">Share this code with your students:</p>
          <div className="flex items-center justify-center gap-3 mt-2">
            <span
              className="text-4xl font-mono font-bold tracking-[0.3em] text-accent"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {createdRoom.id}
            </span>
            <button
              onClick={() => handleCopy(createdRoom.id, 'code')}
              className="px-2 py-1 text-xs bg-bg-card border border-[#2a2a3e] rounded hover:border-accent/40 text-[var(--muted)] hover:text-white transition-colors"
            >
              {copied === 'code' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-400 mb-1">Professor Secret</p>
          <p className="text-[11px] text-[var(--muted)] mb-2">
            Save this secret — you'll need it to access the dashboard.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-[#12141a] border border-[#2a2a3e] rounded px-2 py-1.5 text-xs font-mono text-white">
              {secret}
            </code>
            <button
              onClick={() => handleCopy(secret, 'secret')}
              className="px-2 py-1 text-xs bg-bg-card border border-[#2a2a3e] rounded hover:border-accent/40 text-[var(--muted)] hover:text-white transition-colors"
            >
              {copied === 'secret' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="bg-bg-card border border-[#2a2a3e] rounded-lg p-3 text-xs text-[var(--muted)] space-y-1">
          <p><span className="text-white font-medium">Room:</span> {createdRoom.name}</p>
          <p><span className="text-white font-medium">Template:</span> {selectedTemplate.icon} {selectedTemplate.name}</p>
          <p><span className="text-white font-medium">Challenges:</span> {createdRoom.challenges.length} assigned</p>
        </div>

        <button
          onClick={() => onViewDashboard(createdRoom.id, secret)}
          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          View Dashboard
        </button>
      </div>
    );
  }

  if (step === 'challenges') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold text-white mb-1">Select Challenges</h3>
          <p className="text-[11px] text-[var(--muted)] mb-3">
            Choose which challenges to assign to students from <span className="text-white">{selectedTemplate.icon} {selectedTemplate.name}</span>
          </p>
        </div>

        {checkableQueries.length === 0 ? (
          <p className="text-xs text-amber-400">This template has no checkable challenges.</p>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => {
                if (selectedChallenges.size === checkableQueries.length) {
                  setSelectedChallenges(new Set());
                } else {
                  setSelectedChallenges(new Set(checkableQueries.map(c => c.index)));
                }
              }}
              className="text-[11px] text-accent hover:text-accent/80 transition-colors"
            >
              {selectedChallenges.size === checkableQueries.length ? 'Deselect All' : 'Select All'}
            </button>
            {checkableQueries.map(({ query, index }) => (
              <label
                key={index}
                className="flex items-start gap-2.5 p-2.5 bg-bg-card border border-[#2a2a3e] rounded-lg cursor-pointer hover:border-accent/30 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedChallenges.has(index)}
                  onChange={() => handleToggleChallenge(index)}
                  className="mt-0.5 accent-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium">{query.label}</p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">{query.concept} &middot; {query.difficulty}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => setStep('details')}
            className="px-4 py-2 text-xs text-[var(--muted)] hover:text-white border border-[#2a2a3e] rounded-lg transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedChallenges.size === 0}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
          >
            Create Room ({selectedChallenges.size} challenge{selectedChallenges.size !== 1 ? 's' : ''})
          </button>
        </div>
      </div>
    );
  }

  // Step: details
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1.5">Room Name</label>
        <input
          type="text"
          value={roomName}
          onChange={e => setRoomName(e.target.value)}
          placeholder="CS 101 - Spring 2026"
          className="w-full bg-[#12141a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1.5">Your Name</label>
        <input
          type="text"
          value={professorName}
          onChange={e => setProfessorName(e.target.value)}
          placeholder="Prof. Smith"
          className="w-full bg-[#12141a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1.5">Template</label>
        <select
          value={selectedTemplateId}
          onChange={e => {
            setSelectedTemplateId(e.target.value);
            setSelectedChallenges(new Set());
          }}
          className="w-full bg-[#12141a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent/50 transition-colors"
        >
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={() => {
          if (!roomName.trim() || !professorName.trim()) {
            setError('Please fill in all fields.');
            return;
          }
          setError('');
          setStep('challenges');
        }}
        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Next: Select Challenges
      </button>
    </div>
  );
}

function JoinRoomFlow({ onStudentJoined }: { onStudentJoined: (room: Room, session: StudentSession) => void }) {
  const [roomCode, setRoomCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!roomCode.trim() || !studentName.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (roomCode.trim().length !== 6) {
      setError('Room code must be 6 characters.');
      return;
    }
    setError('');
    setJoining(true);
    try {
      const { room, session } = await joinRoom(roomCode.trim().toUpperCase(), studentName.trim());
      onStudentJoined(room, session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join room');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-[var(--muted)] mb-1.5">Room Code</label>
        <input
          type="text"
          value={roomCode}
          onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          maxLength={6}
          className="w-full bg-[#12141a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-lg font-mono text-white text-center tracking-[0.2em] placeholder-[var(--muted)] outline-none focus:border-cyan-400/50 transition-colors"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        />
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1.5">Your Name</label>
        <input
          type="text"
          value={studentName}
          onChange={e => setStudentName(e.target.value)}
          placeholder="Alice Johnson"
          className="w-full bg-[#12141a] border border-[#2a2a3e] rounded-lg px-3 py-2 text-sm text-white placeholder-[var(--muted)] outline-none focus:border-cyan-400/50 transition-colors"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={handleJoin}
        disabled={joining || roomCode.length !== 6 || !studentName.trim()}
        className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {joining ? 'Joining...' : 'Join Room'}
      </button>
    </div>
  );
}

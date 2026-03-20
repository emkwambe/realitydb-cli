import { useState, useEffect, useRef } from 'react';

interface Props {
  running: boolean;
  onElapsed?: (seconds: number) => void;
}

export function Timer({ running, onElapsed }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      if (startRef.current === null) {
        startRef.current = Date.now() - elapsed * 1000;
      }
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const secs = Math.floor((now - (startRef.current ?? now)) / 1000);
        setElapsed(secs);
        onElapsed?.(secs);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, onElapsed, elapsed]);

  // Reset when not running and elapsed is 0
  useEffect(() => {
    if (!running && elapsed === 0) {
      startRef.current = null;
    }
  }, [running, elapsed]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <span className="font-mono text-xs text-[#eab308] flex items-center gap-1">
      <span className="text-sm">&#x23F1;&#xFE0F;</span>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

export function useTimer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  return { running, elapsed, start, pause, reset, setElapsed, setRunning };
}

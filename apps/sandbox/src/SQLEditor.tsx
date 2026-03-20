import Editor, { type OnMount } from '@monaco-editor/react';
import { useRef, useCallback } from 'react';
import type { AppMode } from './ModeToggle';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: (sql: string) => void;
  onExplain: () => void;
  onSteps?: () => void;
  onCheckAnswer?: () => void;
  showCheckButton?: boolean;
  mode?: AppMode;
  attemptCount?: number;
  maxAttempts?: number;
}

export function SQLEditor({ value, onChange, onRun, onExplain, onSteps, onCheckAnswer, showCheckButton, mode = 'training', attemptCount = 0, maxAttempts = 3 }: Props) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const isAssessment = mode === 'assessment';
  const attemptsExhausted = isAssessment && attemptCount >= maxAttempts;

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      monaco.editor.defineTheme('realitydb', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '22d3ee', fontStyle: 'bold' },
          { token: 'string', foreground: '00e5a0' },
          { token: 'number', foreground: 'ffb444' },
          { token: 'comment', foreground: '4a4d55', fontStyle: 'italic' },
          { token: 'operator', foreground: 'a78bfa' },
          { token: 'identifier', foreground: 'e5e7eb' },
        ],
        colors: {
          'editor.background': '#12141a',
          'editor.foreground': '#e5e7eb',
          'editor.lineHighlightBackground': '#1a1c24',
          'editor.selectionBackground': '#22d3ee30',
          'editorCursor.foreground': '#22d3ee',
          'editorLineNumber.foreground': '#3a3d45',
          'editorLineNumber.activeForeground': '#6b7280',
        },
      });
      monaco.editor.setTheme('realitydb');

      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        const val = editor.getValue();
        if (val.trim()) onRun(val);
      });
    },
    [onRun]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-bg-elevated">
        <span className="text-xs font-mono text-[var(--muted)]">SQL Editor</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted)]">Ctrl+Enter to run</span>
          {!isAssessment && (
            <>
              <button
                onClick={onExplain}
                className="px-3 py-1 bg-amber/10 text-amber text-xs rounded hover:bg-amber/20 transition-colors font-medium"
              >
                Explain
              </button>
              {onSteps && (
                <button
                  onClick={onSteps}
                  className="px-3 py-1 bg-purple-500/10 text-purple-400 text-xs rounded hover:bg-purple-500/20 transition-colors font-medium"
                >
                  Steps
                </button>
              )}
            </>
          )}
          {showCheckButton && onCheckAnswer && (
            <>
              {isAssessment && (
                <span className={`text-[10px] font-mono ${attemptsExhausted ? 'text-red-400' : 'text-[#eab308]'}`}>
                  Attempt {Math.min(attemptCount + 1, maxAttempts)}/{maxAttempts}
                </span>
              )}
              <button
                onClick={onCheckAnswer}
                disabled={attemptsExhausted}
                className={`px-3 py-1 text-xs rounded transition-colors font-medium ${
                  attemptsExhausted
                    ? 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-50'
                    : 'bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20'
                }`}
              >
                Check Answer
              </button>
            </>
          )}
          <button
            onClick={() => {
              if (value.trim()) onRun(value);
            }}
            className="px-3 py-1 bg-accent/10 text-accent text-xs rounded hover:bg-accent/20 transition-colors font-medium"
          >
            Run ▶
          </button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          language="sql"
          value={value}
          onChange={(v) => onChange(v || '')}
          onMount={handleMount}
          options={{
            fontSize: 14,
            fontFamily: 'JetBrains Mono, monospace',
            minimap: { enabled: false },
            wordWrap: 'on',
            suggestOnTriggerCharacters: false,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12 },
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>
    </div>
  );
}

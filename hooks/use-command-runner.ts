// hooks/use-command-runner.ts
"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface CommandRunnerAPI {
  listCommands: () => Promise<string[]>;
  run: (scriptName: string) => Promise<{ runId: string; scriptName: string }>;
  cancel: (runId: string) => Promise<boolean>;
  onOutput: (callback: (payload: OutputPayload) => void) => () => void;
  onStatus: (callback: (payload: StatusPayload) => void) => () => void;
}

interface OutputPayload {
  runId: string;
  stream: "stdout" | "stderr";
  chunk: string;
}

interface StatusPayload {
  runId: string;
  scriptName: string;
  status: "running" | "success" | "error" | "cancelled";
  exitCode?: number;
  error?: string;
}

interface LogLine {
  stream: "stdout" | "stderr";
  text: string;
}

interface RunState {
  scriptName: string;
  status: "running" | "success" | "error" | "cancelled";
  exitCode?: number;
  error?: string;
  lines: LogLine[];
}

declare global {
  interface Window {
    commandRunner?: CommandRunnerAPI;
  }
}

export function useCommandRunner() {
  const [commands, setCommands] = useState<string[]>([]);
  const [runs, setRuns] = useState<Record<string, RunState>>({});

  const runsRef = useRef(runs);
  runsRef.current = runs;

  useEffect(() => {
    if (!window.commandRunner) return; // not running inside Electron (e.g. plain browser)

    window.commandRunner.listCommands().then(setCommands);

    const offOutput = window.commandRunner.onOutput(({ runId, stream, chunk }) => {
      setRuns((prev) => {
        const run = prev[runId];
        if (!run) return prev;
        return {
          ...prev,
          [runId]: {
            ...run,
            lines: [...run.lines, { stream, text: chunk }],
          },
        };
      });
    });

    const offStatus = window.commandRunner.onStatus(({ runId, scriptName, status, exitCode, error }) => {
      setRuns((prev) => ({
        ...prev,
        [runId]: {
          scriptName,
          status,
          exitCode,
          error,
          lines: prev[runId]?.lines ?? [],
        },
      }));
    });

    return () => {
      offOutput();
      offStatus();
    };
  }, []);

  const run = useCallback(async (scriptName: string) => {
    if (!window.commandRunner) {
      throw new Error("Command runner not available outside Electron");
    }
    const { runId } = await window.commandRunner.run(scriptName);
    setRuns((prev) => ({
      ...prev,
      [runId]: { scriptName, status: "running", lines: [] },
    }));
    return runId;
  }, []);

  const cancel = useCallback(async (runId: string) => {
    if (!window.commandRunner) {
      return false;
    }
    return window.commandRunner.cancel(runId);
  }, []);

  return { commands, runs, run, cancel };
}

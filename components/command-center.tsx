// components/command-center.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { useCommandRunner } from "../hooks/use-command-runner";
import { Play, Square, Terminal, Clock, CheckCircle2, XCircle } from "lucide-react";

const STATUS_COLOR = {
  running: "#eab308",  // yellow
  success: "#22c55e",  // green
  error: "#ef4444",    // red
  cancelled: "#94a3b8", // gray
};

const STATUS_ICON = {
  running: Clock,
  success: CheckCircle2,
  error: XCircle,
  cancelled: XCircle,
};

interface LogLineProps {
  stream: "stdout" | "stderr";
  text: string;
}

function LogLine({ stream, text }: LogLineProps) {
  return (
    <div
      className="font-mono text-sm leading-relaxed"
      style={{ color: stream === "stderr" ? "#f87171" : "#e2e8f0", whiteSpace: "pre-wrap" }}
    >
      {text}
    </div>
  );
}

export default function CommandCenter() {
  const { commands, runs, run, cancel } = useCommandRunner();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const activeRun = activeRunId ? runs[activeRunId] : null;

  // auto-scroll to bottom whenever new output arrives
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [activeRun?.lines?.length]);

  const handleRun = async (scriptName: string) => {
    try {
      const runId = await run(scriptName);
      setActiveRunId(runId);
    } catch (error) {
      console.error("Failed to run command:", error);
    }
  };

  const handleCancel = async () => {
    if (!activeRunId) return;
    try {
      await cancel(activeRunId);
    } catch (error) {
      console.error("Failed to cancel command:", error);
    }
  };

  if (typeof window === "undefined" || !window.commandRunner) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0f172a] text-slate-400">
        <div className="text-center">
          <Terminal className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Command Center is only available in Electron app</p>
          <p className="text-sm mt-2">Run <code className="bg-slate-800 px-2 py-1 rounded">pnpm run desktop:dev</code> to access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0f172a] text-slate-200">
      {/* Left panel: command list */}
      <div className="w-64 border-r border-slate-700 bg-[#1e293b] flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Commands
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {commands.map((name) => (
            <button
              key={name}
              onClick={() => handleRun(name)}
              className="w-full text-left px-3 py-2 rounded-md bg-slate-700/50 hover:bg-slate-700 
                       text-slate-200 transition-colors flex items-center gap-2 group"
            >
              <Play className="w-4 h-4 text-slate-400 group-hover:text-green-400 transition-colors" />
              <span className="font-mono text-sm">{name}</span>
            </button>
          ))}
        </div>

        {/* History section */}
        <div className="border-t border-slate-700">
          <div className="p-3 bg-slate-800/50">
            <h4 className="text-sm font-semibold text-slate-400 mb-2">History</h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {Object.entries(runs).reverse().map(([runId, r]) => {
                const StatusIcon = STATUS_ICON[r.status];
                return (
                  <div
                    key={runId}
                    onClick={() => setActiveRunId(runId)}
                    className={`px-2 py-1.5 cursor-pointer rounded text-xs flex items-center gap-2
                              transition-colors ${
                                runId === activeRunId 
                                  ? "bg-slate-700" 
                                  : "hover:bg-slate-700/50"
                              }`}
                  >
                    <StatusIcon
                      className="w-3 h-3 flex-shrink-0"
                      style={{ color: STATUS_COLOR[r.status] }}
                    />
                    <span className="font-mono text-slate-300 truncate">{r.scriptName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: live terminal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex justify-between items-center bg-[#1e293b]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-400" />
            <span className="font-mono font-semibold">
              {activeRun ? activeRun.scriptName : "Select a command"}
            </span>
            {activeRun && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: STATUS_COLOR[activeRun.status] + "20",
                  color: STATUS_COLOR[activeRun.status],
                }}
              >
                {activeRun.status}
              </span>
            )}
          </div>
          {activeRun?.status === "running" && (
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 
                       rounded-md flex items-center gap-2 transition-colors text-sm font-medium"
            >
              <Square className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>

        {/* Terminal output */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-4 bg-[#0f172a]"
        >
          {activeRun ? (
            <>
              {activeRun.lines.map((line, i) => (
                <LogLine key={i} {...line} />
              ))}
              {activeRun.status && activeRun.status !== "running" && (
                <div
                  className="mt-4 pt-3 border-t border-slate-700 font-mono text-sm font-medium"
                  style={{ color: STATUS_COLOR[activeRun.status] }}
                >
                  ─── Process finished ({activeRun.status}
                  {activeRun.exitCode != null ? `, exit code ${activeRun.exitCode}` : ""}) ───
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a command from the left to run it</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

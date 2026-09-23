import { useState } from "react";
import { GenerationStatus } from "./components/GenerationStatus";
import { PlayerProvider } from "./lib/player";
import type { AgentProgressEvent } from "./lib/api";

const phases: AgentProgressEvent[] = [
  { kind: "progress", phase: "searching_tracks" },
  { kind: "progress", phase: "found_tracks", tracks: [
    { uri: "preview:1", title: "Ночная дорога", artist: "Демо" },
    { uri: "preview:2", title: "Тихий город", artist: "Демо" },
  ] },
  { kind: "progress", phase: "building_playlist" },
];

/** Dev-only visual preview; no API calls or Telegram credentials. */
export function LoadingPreview() {
  const [step, setStep] = useState(0);
  return <PlayerProvider>
    <main style={{ maxWidth: 430, margin: "40px auto", padding: 20 }}>
      <h1 style={{ fontSize: 20 }}>Предпросмотр подбора</h1>
      <p>Этап {step + 1} из {phases.length}</p>
      <GenerationStatus progress={phases.slice(0, step + 1)} preview />
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))}>Назад</button>
        <button type="button" onClick={() => setStep((value) => Math.min(phases.length - 1, value + 1))}>Дальше</button>
      </div>
    </main>
  </PlayerProvider>;
}

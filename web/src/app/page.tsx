"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  csvDownloadUrl,
  listRombergTests,
  saveRombergTest,
  type StoredTestSummary,
} from "@/lib/api";
import { cleanSerialToSamples, samplesToCsv } from "@/lib/csv";
import {
  createSerialSession,
  hasWebSerial,
  openSerialPort,
  type SerialSession,
} from "@/lib/serial";
import styles from "./page.module.css";

type Status = "idle" | "connecting" | "ready" | "capturing" | "saving" | "error";

export default function Home() {
  const sessionRef = useRef<SerialSession | null>(null);
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Connect the ESP32 over USB, then click Connect.");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [sampleCount, setSampleCount] = useState<number | null>(null);
  const [tests, setTests] = useState<StoredTestSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const refreshTests = useCallback(async () => {
    try {
      const rows = await listRombergTests();
      setTests(rows.slice().reverse());
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setSupported(hasWebSerial());
    void refreshTests();
  }, [refreshTests]);

  useEffect(() => {
    return () => {
      void sessionRef.current?.close();
    };
  }, []);

  const appendLog = (line: string) => {
    setLogLines((prev) => [...prev.slice(-80), line]);
  };

  const connect = async () => {
    setStatus("connecting");
    setMessage("Select the ESP32 serial port…");
    try {
      const port = await openSerialPort();
      const session = await createSerialSession(port);
      sessionRef.current = session;
      setStatus("ready");
      setMessage("Connected. Click Start test to run a 30s capture.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const disconnect = async () => {
    await sessionRef.current?.close();
    sessionRef.current = null;
    setStatus("idle");
    setMessage("Disconnected. Connect again when ready.");
    setSampleCount(null);
  };

  const startTest = async () => {
    const session = sessionRef.current;
    if (!session) {
      setMessage("Connect to the device first.");
      return;
    }

    setStatus("capturing");
    setSampleCount(null);
    setLogLines([]);
    setMessage("Capturing… stand still for 30 seconds.");

    try {
      const capturePromise = session.captureNextTest((line) => appendLog(line));
      // Firmware starts a test when it receives any character
      await session.write("\n");
      const raw = await capturePromise;

      const samples = cleanSerialToSamples(raw);
      if (samples.length === 0) {
        throw new Error("No valid IMU samples found in the capture.");
      }

      const csvContent = samplesToCsv(samples);
      setSampleCount(samples.length);
      setStatus("saving");
      setMessage(`Captured ${samples.length} samples. Saving to Neon…`);

      const saved = await saveRombergTest({
        csvContent,
        sampleCount: samples.length,
        durationMs: 30000,
      });

      setStatus("ready");
      setMessage(`Saved ${saved.filename} (${saved.sampleCount} samples).`);
      await refreshTests();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const busy = status === "connecting" || status === "capturing" || status === "saving";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.brand}>Romberger</p>
          <h1 className={styles.title}>Romberg capture</h1>
          <p className={styles.lede}>
            Record a 30s balance test from the ESP32, clean it to{" "}
            <code>ax,ay,az,gx,gy,gz</code>, and store one CSV per test in Neon.
          </p>
        </header>

        {!supported && (
          <p className={styles.error}>
            Web Serial is not available. Open this page in Chrome or Edge on desktop.
          </p>
        )}

        <section className={styles.panel}>
          <div className={styles.actions}>
            {status === "idle" || status === "error" ? (
              <button type="button" className={styles.primary} onClick={connect} disabled={!supported || busy}>
                Connect
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={startTest}
                  disabled={busy || status !== "ready"}
                >
                  {status === "capturing" ? "Capturing…" : status === "saving" ? "Saving…" : "Start test"}
                </button>
                <button type="button" className={styles.secondary} onClick={disconnect} disabled={busy}>
                  Disconnect
                </button>
              </>
            )}
            <button type="button" className={styles.secondary} onClick={() => void refreshTests()} disabled={busy}>
              Refresh list
            </button>
          </div>

          <p className={styles.status} data-state={status}>
            {message}
          </p>
          {sampleCount !== null && (
            <p className={styles.meta}>Last cleaned sample count: {sampleCount}</p>
          )}
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Serial log</h2>
          <pre className={styles.log}>{logLines.length ? logLines.join("\n") : "No lines yet."}</pre>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Stored tests</h2>
          {listError && <p className={styles.error}>{listError}</p>}
          {!listError && tests.length === 0 && (
            <p className={styles.meta}>No tests in Neon yet.</p>
          )}
          {tests.length > 0 && (
            <ul className={styles.testList}>
              {tests.map((test) => (
                <li key={test.id} className={styles.testItem}>
                  <div>
                    <div className={styles.testName}>{test.filename}</div>
                    <div className={styles.meta}>
                      {new Date(test.createdAt).toLocaleString()} · {test.sampleCount} samples ·{" "}
                      {test.durationMs} ms
                    </div>
                  </div>
                  <a className={styles.link} href={csvDownloadUrl(test.id)}>
                    Download CSV
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

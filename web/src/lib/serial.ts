export const BAUD_RATE = 115200;
export const TEST_START = "ROMBERG_TEST_START";
export const TEST_END = "ROMBERG_TEST_END";

type PendingCapture = {
  capturing: boolean;
  capture: string;
  onLine?: (line: string) => void;
  resolve: (raw: string) => void;
  reject: (err: Error) => void;
};

export function hasWebSerial(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export async function openSerialPort(): Promise<SerialPort> {
  if (!hasWebSerial()) {
    throw new Error("Web Serial is not supported in this browser. Use Chrome or Edge.");
  }

  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: BAUD_RATE });
  return port;
}

export type SerialSession = {
  write: (text: string) => Promise<void>;
  /** Resolves with raw capture text between START and END markers. */
  captureNextTest: (onLine?: (line: string) => void) => Promise<string>;
  close: () => Promise<void>;
};

/**
 * Open a persistent Serial session. Keeps reading so multiple tests can run
 * without reconnecting.
 */
export async function createSerialSession(port: SerialPort): Promise<SerialSession> {
  const readable = port.readable;
  const writable = port.writable;
  if (!readable || !writable) {
    throw new Error("Serial port streams are not available");
  }

  const decoder = new TextDecoderStream();
  // Web Serial typings disagree with DOM lib WritableStream generics
  const pipePromise = readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>);
  const reader = decoder.readable.getReader();
  const writer = writable.getWriter();

  let buffer = "";
  let closed = false;
  // Mutable box so TS doesn't narrow `pending` to null inside the pump closure
  const state: { pending: PendingCapture | null } = { pending: null };

  const pump = (async () => {
    try {
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const current = state.pending;
          if (!current) {
            continue;
          }

          current.onLine?.(line);

          if (line.includes(TEST_START)) {
            current.capturing = true;
            current.capture = "";
            continue;
          }

          if (!current.capturing) {
            continue;
          }

          if (line.includes(TEST_END)) {
            const raw = current.capture;
            state.pending = null;
            current.resolve(raw);
            continue;
          }

          current.capture += line + "\n";
        }
      }
    } catch (err) {
      if (state.pending) {
        state.pending.reject(err instanceof Error ? err : new Error(String(err)));
        state.pending = null;
      }
    } finally {
      if (state.pending) {
        state.pending.reject(new Error("Serial connection closed"));
        state.pending = null;
      }
    }
  })();

  return {
    async write(text: string) {
      await writer.write(new TextEncoder().encode(text));
    },
    captureNextTest(onLine) {
      if (state.pending) {
        return Promise.reject(new Error("A capture is already in progress"));
      }
      return new Promise<string>((resolve, reject) => {
        state.pending = {
          capturing: false,
          capture: "",
          onLine,
          resolve,
          reject,
        };
      });
    },
    async close() {
      closed = true;
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      try {
        writer.releaseLock();
      } catch {
        /* ignore */
      }
      await pipePromise.catch(() => undefined);
      await pump.catch(() => undefined);
      await port.close().catch(() => undefined);
    },
  };
}

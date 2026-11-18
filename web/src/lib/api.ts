export type StoredTestSummary = {
  id: string;
  createdAt: string;
  filename: string;
  durationMs: number;
  sampleCount: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function saveRombergTest(input: {
  csvContent: string;
  sampleCount: number;
  durationMs?: number;
  filename?: string;
}): Promise<StoredTestSummary> {
  const res = await fetch(`${API_BASE}/api/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: input.filename,
      durationMs: input.durationMs ?? 30000,
      sampleCount: input.sampleCount,
      csvContent: input.csvContent,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Save failed (${res.status})`);
  }

  return res.json();
}

export async function listRombergTests(): Promise<StoredTestSummary[]> {
  const res = await fetch(`${API_BASE}/api/tests`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`List failed (${res.status})`);
  }
  return res.json();
}

export function csvDownloadUrl(id: string): string {
  return `${API_BASE}/api/tests/${id}/csv`;
}

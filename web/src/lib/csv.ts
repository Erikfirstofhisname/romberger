export const CSV_HEADER = "ax,ay,az,gx,gy,gz";

export type ImuSample = {
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
};

/** Parse one Serial data line. Accepts optional leading time_ms column. */
export function parseSampleLine(line: string): ImuSample | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const lower = trimmed.toLowerCase();
  if (
    lower === "time_ms,ax,ay,az,gx,gy,gz" ||
    lower === CSV_HEADER ||
    lower.includes("romberg_test_") ||
    lower.includes("mpu6050") ||
    lower.includes("starting") ||
    lower.includes("send any")
  ) {
    return null;
  }

  const parts = trimmed.split(",").map((p) => p.trim());
  let values: string[];

  if (parts.length === 7) {
    values = parts.slice(1);
  } else if (parts.length === 6) {
    values = parts;
  } else {
    return null;
  }

  const nums = values.map((v) => Number(v));
  if (nums.some((n) => !Number.isFinite(n))) {
    return null;
  }

  return {
    ax: nums[0],
    ay: nums[1],
    az: nums[2],
    gx: nums[3],
    gy: nums[4],
    gz: nums[5],
  };
}

export function cleanSerialToSamples(rawText: string): ImuSample[] {
  const samples: ImuSample[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const sample = parseSampleLine(line);
    if (sample) {
      samples.push(sample);
    }
  }
  return samples;
}

export function samplesToCsv(samples: ImuSample[]): string {
  const rows = samples.map(
    (s) =>
      `${s.ax.toFixed(4)},${s.ay.toFixed(4)},${s.az.toFixed(4)},${s.gx.toFixed(4)},${s.gy.toFixed(4)},${s.gz.toFixed(4)}`,
  );
  return [CSV_HEADER, ...rows].join("\n") + "\n";
}

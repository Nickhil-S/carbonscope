export const num = (n: number | null | undefined, d = 0) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const kg = (n: number) => (Math.abs(n) >= 10000 ? `${num(n / 1000, 1)} t` : `${num(n)} kg`);
export const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

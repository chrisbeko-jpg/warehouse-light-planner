export function getHeightFactor(height: number): number {
  if (height <= 4) return 1.0;
  if (height <= 6) return 0.85;
  if (height <= 8) return 0.7;
  if (height <= 10) return 0.55;
  if (height <= 12) return 0.45;
  return 0.35;
}

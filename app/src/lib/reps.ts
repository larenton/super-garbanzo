/** Rep targets like "12-15" count reps; "30 s" or "1 min" are timed holds logged in seconds. */
export function isTimed(reps: string): boolean {
  return /\d\s*(s|sec|secs|min|mins)\b/i.test(reps);
}

/** The number to pre-fill a set with: top of a rep range, or seconds for a timed set. */
export function repTarget(reps: string): number {
  const min = reps.match(/(\d+(?:\.\d+)?)\s*min/i);
  if (min) return Math.round(parseFloat(min[1]) * 60);
  const nums = reps.match(/\d+/g);
  if (!nums) return 8;
  return parseInt(nums[nums.length - 1], 10);
}

/** "45" seconds → "45 s", 60 → "1:00". */
export function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec} s`;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

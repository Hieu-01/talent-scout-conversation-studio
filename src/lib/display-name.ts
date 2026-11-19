export const DISPLAY_NAME_MAX = 40;

/** Cleans up a typed name; returns null when it is empty or too long. */
export function normalizeDisplayName(input: string): string | null {
  const name = input.replace(/\s+/g, " ").trim();
  if (!name || name.length > DISPLAY_NAME_MAX) return null;
  return name;
}

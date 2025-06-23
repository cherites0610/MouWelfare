export function resolveUrl(baseUrl: string, candidate: string): string {
  try {
    new URL(candidate);
    return candidate;
  } catch {
    return new URL(candidate, baseUrl).href;
  }
}

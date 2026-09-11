export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim().replace(/\s+/gu, ' ');
}

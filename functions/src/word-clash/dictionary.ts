const dictionary = new Set<string>(
  require('an-array-of-english-words') as string[],
);

export function normalizeWord(
  value: string,
): string {
  return value
    .trim()
    .normalize('NFKC')
    .toLowerCase();
}

export function isEnglishWord(
  value: string,
): boolean {
  const word = normalizeWord(value);

  return (
    /^[a-z]{3,30}$/.test(word) &&
    dictionary.has(word)
  );
}

export function getDictionaryWords(): string[] {
  return Array.from(dictionary).filter(
    word => /^[a-z]{3,30}$/.test(word),
  );
}

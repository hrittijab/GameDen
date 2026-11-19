import { randomInt } from 'node:crypto';

import { getDictionaryWords } from './dictionary';

import {
  CATEGORIES,
  CATEGORY_WORDS,
  type Category,
} from './categories';

import {
  type GameMode,
  type WordSettings,
} from './settings';

export type Challenge = {
  mode: GameMode;
  category: Category | null;
  endingLetter: string | null;
  letterOptions: string[];
  automaticLetter: string | null;
};

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const commonLetters =
  'ABCDEFGHIJKLMNOPRSTW'.split('');

const index = new Map<string, string[]>();

for (const word of getDictionaryWords()) {
  const start = word[0].toUpperCase();
  const end = word[word.length - 1].toUpperCase();

  for (const key of [start, `${start}:${end}`]) {
    const bucket = index.get(key) ?? [];
    bucket.push(word);
    index.set(key, bucket);
  }
}

function pick<T>(values: T[]): T {
  return values[randomInt(values.length)];
}

function sample<T>(
  values: T[],
  count: number,
): T[] {
  const pool = [...values];
  const selected: T[] = [];

  while (
    pool.length &&
    selected.length < count
  ) {
    const i = randomInt(pool.length);
    selected.push(pool.splice(i, 1)[0]);
  }

  return selected;
}

function countEligible(
  words: string[],
  minimumLength: number,
  excluded: Set<string>,
  needed: number,
): number {
  let count = 0;

  for (const word of words) {
    if (
      word.length >= minimumLength &&
      !excluded.has(word)
    ) {
      count++;

      if (count >= needed) break;
    }
  }

  return count;
}

export function createChallenge(
  settings: WordSettings,
  playerCount: number,
  usedWords: string[],
  previousWinningWord = '',
): Challenge {
  const chaosModes: GameMode[] = [
    'longest',
    'category',
    'double',
    'quick',
    'mystery',
    'chain',
  ];

  let mode = settings.mode === 'chaos'
    ? pick(chaosModes)
    : settings.mode;

  const excluded = new Set(
    settings.allowRepeatedWords
      ? []
      : usedWords,
  );

  const needed = Math.max(
    4,
    playerCount * 2,
  );

  let category: Category | null = null;
  let endingLetter: string | null = null;
  let candidates: string[] = [];

  if (mode === 'category') {
    const suitable = CATEGORIES.map(item => {
      const letters = alphabet.filter(letter =>
        countEligible(
          CATEGORY_WORDS[item].filter(
            word => word.startsWith(
              letter.toLowerCase(),
            ),
          ),
          settings.minimumLength,
          excluded,
          Math.max(4, playerCount),
        ) >= Math.max(4, playerCount),
      );

      return {
        category: item,
        letters,
      };
    }).filter(item => item.letters.length > 0);

    if (suitable.length) {
      const selected = pick(suitable);

      category = selected.category;
      candidates = selected.letters;
    } else {
      // Never force an exhausted category.
      mode = 'classic';
    }
  }

  if (mode === 'double') {
    const pairs = commonLetters.map(end => ({
      end,
      letters: commonLetters.filter(start =>
        countEligible(
          index.get(`${start}:${end}`) ?? [],
          settings.minimumLength,
          excluded,
          Math.max(12, needed),
        ) >= Math.max(12, needed),
      ),
    })).filter(item => item.letters.length > 0);

    if (pairs.length) {
      const pair = pick(pairs);
      endingLetter = pair.end;
      candidates = pair.letters;
    } else {
      mode = 'classic';
    }
  }

  if (!candidates.length) {
    candidates = commonLetters.filter(letter =>
      countEligible(
        index.get(letter) ?? [],
        settings.minimumLength,
        excluded,
        needed,
      ) >= needed,
    );
  }

  if (!candidates.length) {
    candidates = [...commonLetters];
  }

  let automaticLetter: string | null = null;

  if (mode === 'chain') {
    const last = previousWinningWord
      .slice(-1)
      .toUpperCase();

    const eligibleChainLetter =
      alphabet.includes(last) &&
      countEligible(
        index.get(last) ?? [],
        settings.minimumLength,
        excluded,
        needed,
      ) >= needed;

    automaticLetter = eligibleChainLetter
      ? last
      : pick(candidates);
  } else if (
    mode === 'mystery' ||
    settings.randomLetters
  ) {
    automaticLetter = pick(candidates);
  }

  const letterOptions = automaticLetter
    ? [automaticLetter]
    : sample(candidates, 3);

  return {
    mode,
    category,
    endingLetter,
    letterOptions,
    automaticLetter,
  };
}

export function selectFallbackLetter(
  options: string[],
): string {
  return options.length
    ? pick(options)
    : pick(commonLetters);
}


import {
  normalizeWord,
  WORDS,
} from './words';

const aliases: Record<string, string[]> = {
  airplane: ['aeroplane', 'plane'],
  motorcycle: ['motorbike'],
  refrigerator: ['fridge'],
  television: ['tv'],
  footballfield: ['soccerfield'],
  cellphone: ['mobilephone', 'mobile'],
  glasses: ['spectacles', 'eyeglasses'],
  sofa: ['couch'],
  hamburger: ['burger'],
  bicycle: ['bike'],
};

const knownWords = new Set(
  Object.values(WORDS)
    .flat()
    .map(normalizeWord),
);

export function editDistance(
  first: string,
  second: string,
): number {
  let previous = Array.from(
    { length: second.length + 1 },
    (_, index) => index,
  );

  for (let i = 1; i <= first.length; i++) {
    const current = [i];

    for (let j = 1; j <= second.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] +
          (first[i - 1] === second[j - 1] ? 0 : 1),
      );
    }

    previous = current;
  }

  return previous[second.length];
}

function isTransposition(
  first: string,
  second: string,
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  const different: number[] = [];

  for (let i = 0; i < first.length; i++) {
    if (first[i] !== second[i]) {
      different.push(i);
    }
  }

  if (different.length !== 2) {
    return false;
  }

  const [a, b] = different;

  return (
    b === a + 1 &&
    first[a] === second[b] &&
    first[b] === second[a]
  );
}

export function evaluateGuess(
  guessInput: string,
  answerInput: string,
): 'correct' | 'close' | 'wrong' {
  const guess = normalizeWord(guessInput);
  const answer = normalizeWord(answerInput);

  if (!guess || !answer) {
    return 'wrong';
  }

  if (
    guess === answer ||
    aliases[answer]?.includes(guess)
  ) {
    return 'correct';
  }

  const distance = editDistance(guess, answer);

  if (
    answer.length >= 5 &&
    isTransposition(guess, answer) &&
    !knownWords.has(guess)
  ) {
    return 'correct';
  }

  // Allow a minor typo in long words, but
  // do not mistake another known word for the answer.

  if (
    answer.length >= 8 &&
    distance === 1 &&
    !knownWords.has(guess)
  ) {
    return 'correct';
  }

  if (
    answer.length >= 4 &&
    (
      distance === 1 ||
      (
        answer.length >= 8 &&
        distance === 2
      )
    )
  ) {
    return 'close';
  }

  return 'wrong';
}

export function progressiveHint(
  answer: string,
  elapsedMs: number,
  seed: number,
): string {
  const characters = answer.split('');

  const positions = characters
    .map((letter, index) =>
      /[a-z0-9]/i.test(letter) ? index : -1,
    )
    .filter(index => index >= 0);

  const revealCount =
    elapsedMs >= 40000 ? 2 :
    elapsedMs >= 20000 ? 1 :
    0;

  // Always keep at least two letters hidden.

  const count = Math.min(
    revealCount,
    Math.max(0, positions.length - 2),
  );

  const offset =
    positions.length > 0
      ? Math.abs(seed) % positions.length
      : 0;

  const revealed = new Set(
    Array.from(
      { length: count },
      (_, index) =>
        positions[
          (offset + index) % positions.length
        ],
    ),
  );

  return characters
    .map((letter, index) => {
      if (!/[a-z0-9]/i.test(letter)) {
        return letter;
      }

      return revealed.has(index)
        ? letter.toUpperCase()
        : '_';
    })
    .join('');
}

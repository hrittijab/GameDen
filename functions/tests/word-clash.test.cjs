const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const compiled = process.env.WORD_ENGINE_DIR;

if (!compiled) {
  throw new Error('WORD_ENGINE_DIR is required.');
}

const {
  scoreWord,
  calculateResults,
  findWinners,
} = require(path.join(compiled, 'engine.js'));

const {
  normalizeWord,
  isEnglishWord,
} = require(path.join(compiled, 'dictionary.js'));

function makeRound(submissions, usedWords = []) {
  const room = {
    hostId: 'a',
    status: 'playing',
    phase: 'typing',
    players: {
      a: 'Alice',
      b: 'Bob',
      c: 'Carol',
    },
    letter: 'S',
    deadline: 20000,
    scores: {
      a: 0,
      b: 0,
      c: 0,
    },
  };

  const secret = {
    submissions,
    usedWords,
  };

  return calculateResults(room, secret);
}

test('Faster valid words earn more points', () => {
  assert.ok(
    scoreWord(18000) > scoreWord(5000)
  );
});

test('Scores remain between 20 and 50', () => {
  assert.equal(scoreWord(20000), 50);
  assert.equal(scoreWord(0), 20);
  assert.equal(scoreWord(-3000), 20);
  assert.equal(scoreWord(99999), 50);
});

test('Words normalize to lowercase', () => {
  assert.equal(
    normalizeWord('  Snake  '),
    'snake'
  );
});

test('Dictionary accepts common English words', () => {
  assert.equal(isEnglishWord('sunshine'), true);
  assert.equal(isEnglishWord('snake'), true);
});

test('Invalid words are rejected', () => {
  assert.equal(
    isEnglishWord('zzzzqqqqzz'),
    false
  );
});

test('Unique valid submissions earn points', () => {
  const result = makeRound({
    a: {
      word: 'snake',
      submittedAt: 2000,
    },
    b: {
      word: 'star',
      submittedAt: 10000,
    },
  });

  assert.equal(result.scores.a, 47);
  assert.equal(result.scores.b, 35);
  assert.equal(result.scores.c, 0);
});

test('All duplicate submissions score zero', () => {
  const result = makeRound({
    a: {
      word: 'snake',
      submittedAt: 1000,
    },
    b: {
      word: 'snake',
      submittedAt: 9000,
    },
    c: {
      word: 'star',
      submittedAt: 5000,
    },
  });

  assert.equal(result.scores.a, 0);
  assert.equal(result.scores.b, 0);

  assert.ok(result.scores.c > 0);

  assert.equal(
    result.results[0].outcome,
    'duplicate'
  );
});

test('Previously submitted words score zero', () => {
  const result = makeRound({
    a: {
      word: 'snake',
      submittedAt: 1000,
    },
  }, ['snake']);

  assert.equal(result.scores.a, 0);

  assert.equal(
    result.results[0].outcome,
    'repeated'
  );
});

test('Wrong starting letter scores zero', () => {
  const result = makeRound({
    a: {
      word: 'apple',
      submittedAt: 1000,
    },
  });

  assert.equal(result.scores.a, 0);
  assert.equal(result.results[0].outcome, 'invalid');
});

test('Missing submissions score zero', () => {
  const result = makeRound({});

  assert.ok(
    result.results.every(
      item =>
        item.points === 0 &&
        item.outcome === 'missed'
    )
  );
});

test('Valid words enter the used-word history', () => {
  const result = makeRound({
    a: {
      word: 'snake',
      submittedAt: 2000,
    },
  });

  assert.ok(
    result.usedWords.includes('snake')
  );
});

test('No winner below 200 points', () => {
  assert.deepEqual(
    findWinners({
      players: { a: 'Alice', b: 'Bob' },
      scores: { a: 199, b: 180 },
    }),
    []
  );
});

test('Highest score above 200 wins', () => {
  assert.deepEqual(
    findWinners({
      players: { a: 'Alice', b: 'Bob' },
      scores: { a: 210, b: 205 },
    }),
    ['a']
  );
});

test('Equal winning scores trigger a tie', () => {
  assert.deepEqual(
    findWinners({
      players: { a: 'Alice', b: 'Bob' },
      scores: { a: 220, b: 220 },
    }),
    ['a', 'b']
  );
});

const {
  DEFAULT_SETTINGS,
  validateSettings,
  lengthBonus,
  streakPoints,
  roundDuration,
} = require(path.join(compiled, 'settings.js'));

const {
  createChallenge,
} = require(path.join(compiled, 'challenges.js'));

const {
  isCategoryWord,
} = require(path.join(compiled, 'categories.js'));

function enhancedRound(
  settings,
  overrides,
  submissions,
  usedWords = [],
) {
  return calculateResults({
    hostId: 'a',
    status: 'playing',
    phase: 'typing',
    letter: 'S',
    deadline: 20000,
    roundMs: 20000,
    players: {
      a: 'Alice',
      b: 'Bob',
    },
    scores: { a: 0, b: 0 },
    streaks: {},
    matchSettings: {
      ...DEFAULT_SETTINGS,
      ...settings,
    },
    ...overrides,
  }, {
    submissions,
    usedWords,
  });
}

test('Classic defaults preserve existing scoring', () => {
  const settings = validateSettings();

  assert.equal(settings.mode, 'classic');
  assert.equal(settings.winningScore, 200);
  assert.equal(settings.roundSeconds, 20);
  assert.equal(settings.streakBonus, false);
});

test('Unsupported settings are rejected', () => {
  for (const value of [
    { mode: 'unsupported' },
    { winningScore: 99999 },
    { roundSeconds: -1 },
    { minimumLength: 30 },
    { streakBonus: 'yes' },
  ]) {
    assert.throws(() => validateSettings(value));
  }
});

test('Longest Word rewards additional letters', () => {
  assert.equal(lengthBonus('longest', 8), 10);
  assert.equal(lengthBonus('longest', 30), 20);
  assert.equal(lengthBonus('classic', 8), 0);
});

test('Streak rewards increase and respect the cap', () => {
  assert.equal(streakPoints(true, 1), 0);
  assert.equal(streakPoints(true, 2), 5);
  assert.equal(streakPoints(true, 4), 15);
  assert.equal(streakPoints(true, 20), 15);
  assert.equal(streakPoints(false, 20), 0);
});

test('Quick Fire forces ten seconds', () => {
  assert.equal(
    roundDuration({
      ...DEFAULT_SETTINGS,
      roundSeconds: 45,
    }, 'quick'),
    10000
  );
});

test('Speed scoring scales with duration', () => {
  assert.equal(
    scoreWord(5000, 10000),
    scoreWord(10000, 20000)
  );
});

test('Curated category membership is enforced', () => {
  assert.equal(isCategoryWord('snake', 'Animals'), true);
  assert.equal(isCategoryWord('pizza', 'Animals'), false);
  assert.equal(isCategoryWord('bangladesh', 'Countries'), true);
});

test('Category Clash rejects words outside the category', () => {
  const result = enhancedRound(
    { mode: 'category' },
    { category: 'Animals', roundMode: 'category' },
    {
      a: { word: 'snake', submittedAt: 5000 },
      b: { word: 'star', submittedAt: 5000 },
    }
  );

  assert.ok(result.scores.a > 0);
  assert.equal(result.scores.b, 0);
});

test('Double Letter enforces the ending letter', () => {
  const result = enhancedRound(
    { mode: 'double' },
    { endingLetter: 'E', roundMode: 'double' },
    {
      a: { word: 'snake', submittedAt: 2000 },
      b: { word: 'star', submittedAt: 2000 },
    }
  );

  assert.ok(result.scores.a > 0);
  assert.equal(result.scores.b, 0);
});

test('Minimum length applies to scoring', () => {
  const result = enhancedRound(
    { minimumLength: 5 },
    {},
    {
      a: { word: 'star', submittedAt: 2000 },
      b: { word: 'snake', submittedAt: 2000 },
    }
  );

  assert.equal(result.scores.a, 0);
  assert.ok(result.scores.b > 0);
});

test('Repeated words can be explicitly allowed', () => {
  const result = enhancedRound(
    { allowRepeatedWords: true },
    {},
    {
      a: { word: 'snake', submittedAt: 2000 },
    },
    ['snake']
  );

  assert.ok(result.scores.a > 0);
});

test('Duplicate words remain worthless with streak bonuses', () => {
  const result = enhancedRound(
    {
      mode: 'longest',
      streakBonus: true,
    },
    {
      roundMode: 'longest',
      streaks: { a: 5, b: 5 },
    },
    {
      a: { word: 'sunshine', submittedAt: 1000 },
      b: { word: 'sunshine', submittedAt: 3000 },
    }
  );

  assert.equal(result.scores.a, 0);
  assert.equal(result.scores.b, 0);
  assert.equal(result.streaks.a, 0);
  assert.equal(result.streaks.b, 0);
});

test('Valid words increase streaks', () => {
  const result = enhancedRound(
    { streakBonus: true },
    { streaks: { a: 2, b: 1 } },
    {
      a: { word: 'snake', submittedAt: 10000 },
    }
  );

  assert.equal(result.streaks.a, 3);
  assert.equal(result.scores.a, 45);
  assert.equal(result.streaks.b, 0);
});

test('Custom winning targets are respected', () => {
  assert.deepEqual(
    findWinners({
      players: { a: 'Alice', b: 'Bob' },
      scores: { a: 150, b: 110 },
      matchSettings: { winningScore: 100 },
    }),
    ['a']
  );

  assert.deepEqual(
    findWinners({
      players: { a: 'Alice', b: 'Bob' },
      scores: { a: 250, b: 230 },
      matchSettings: { winningScore: 500 },
    }),
    []
  );
});

test('Classic offers three distinct letters', () => {
  const challenge = createChallenge(
    DEFAULT_SETTINGS,
    2,
    []
  );

  assert.equal(challenge.letterOptions.length, 3);
  assert.equal(
    new Set(challenge.letterOptions).size,
    3
  );
});

test('Mystery Letter produces an automatic letter', () => {
  const challenge = createChallenge({
    ...DEFAULT_SETTINGS,
    mode: 'mystery',
  }, 2, []);

  assert.ok(challenge.automaticLetter);
  assert.deepEqual(
    challenge.letterOptions,
    [challenge.automaticLetter]
  );
});

test('Word Chain uses the previous winning word', () => {
  const challenge = createChallenge({
    ...DEFAULT_SETTINGS,
    mode: 'chain',
  }, 2, [], 'tiger');

  assert.equal(challenge.automaticLetter, 'R');
});

test('Category challenges contain a category', () => {
  const challenge = createChallenge({
    ...DEFAULT_SETTINGS,
    mode: 'category',
  }, 2, []);

  assert.equal(challenge.mode, 'category');
  assert.ok(challenge.category);
  assert.ok(challenge.letterOptions.length > 0);
});

test('Double Letter challenges contain an ending letter', () => {
  const challenge = createChallenge({
    ...DEFAULT_SETTINGS,
    mode: 'double',
  }, 2, []);

  assert.equal(challenge.mode, 'double');
  assert.ok(challenge.endingLetter);
});

test('Chaos selects a supported special mode', () => {
  for (let i = 0; i < 15; i++) {
    const challenge = createChallenge({
      ...DEFAULT_SETTINGS,
      mode: 'chaos',
    }, 2, []);

    assert.ok([
      'classic', 'longest', 'category',
      'double', 'quick', 'mystery', 'chain',
    ].includes(challenge.mode));
  }
});


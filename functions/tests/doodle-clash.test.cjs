const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const compiled = process.env.DOODLE_ENGINE_DIR;

if (!compiled) {
  throw new Error('Compiled engine directory not supplied.');
}

const {
  pointsForGuess,
  pointsForArtist,
} = require(path.join(compiled, 'rounds.js'));

const {
  editDistance,
  evaluateGuess,
  progressiveHint,
} = require(path.join(compiled, 'intelligence.js'));

const {
  emptyDrawing,
  validateStroke,
  applyDrawingAction,
} = require(path.join(compiled, 'engine.js'));

test('Faster guesses earn more points', () => {
  assert.ok(
    pointsForGuess(0, 55000) >
    pointsForGuess(0, 10000)
  );
});

test('First place earns more than second place', () => {
  assert.ok(
    pointsForGuess(0, 30000) >
    pointsForGuess(1, 30000)
  );
});

test('Guess scores remain within valid bounds', () => {
  assert.equal(pointsForGuess(0, 60000), 100);
  assert.equal(pointsForGuess(7, 0), 20);
  assert.equal(pointsForGuess(0, 999999), 100);
});

test('Artist rewards depend on guessing speed', () => {
  assert.equal(pointsForArtist(60000), 20);
  assert.equal(pointsForArtist(0), 10);
});

test('Guess matching ignores capitalization and spaces', () => {
  assert.equal(
    evaluateGuess('ICE CREAM', 'Ice cream'),
    'correct'
  );
});

test('Common aliases are accepted', () => {
  assert.equal(
    evaluateGuess('fridge', 'Refrigerator'),
    'correct'
  );
});

test('Minor letter transposition is accepted', () => {
  assert.equal(
    evaluateGuess('umbrelal', 'Umbrella'),
    'correct'
  );
});

test('Close guesses receive a helpful response', () => {
  assert.equal(
    evaluateGuess('appl', 'Apple'),
    'close'
  );
});

test('Unrelated guesses are rejected', () => {
  assert.equal(
    evaluateGuess('car', 'Elephant'),
    'wrong'
  );
});

test('Edit distance works', () => {
  assert.equal(editDistance('cat', 'bat'), 1);
  assert.equal(editDistance('cat', 'cat'), 0);
});

test('Hints initially conceal all letters', () => {
  assert.equal(
    progressiveHint('Umbrella', 0, 3),
    '________'
  );
});

test('Hints reveal one letter after 20 seconds', () => {
  const hint = progressiveHint(
    'Umbrella',
    20000,
    3
  );

  assert.equal(
    hint.replace(/_/g, '').length,
    1
  );
});

test('Hints reveal two letters after 40 seconds', () => {
  const hint = progressiveHint(
    'Umbrella',
    40000,
    3
  );

  assert.equal(
    hint.replace(/_/g, '').length,
    2
  );
});

test('Short words are never completely revealed', () => {
  const hint = progressiveHint(
    'Cat',
    50000,
    2
  );

  assert.ok(
    hint.split('_').length - 1 >= 2
  );
});

const stroke = {
  id: 'test-stroke',
  color: '#171717',
  width: 8,
  points: [
    { x: 100, y: 100 },
    { x: 200, y: 200 },
  ],
};

test('Valid drawing strokes are accepted', () => {
  assert.deepEqual(
    validateStroke(stroke),
    stroke
  );
});

test('Out-of-bounds drawing coordinates are rejected', () => {
  assert.throws(() => {
    validateStroke({
      ...stroke,
      points: [{ x: -50, y: 100 }],
    });
  });
});

test('Oversized strokes are rejected', () => {
  assert.throws(() => {
    validateStroke({
      ...stroke,
      points: Array.from(
        { length: 501 },
        () => ({ x: 100, y: 100 })
      ),
    });
  });
});

test('Unsupported brush sizes are rejected', () => {
  assert.throws(() => {
    validateStroke({
      ...stroke,
      width: 999,
    });
  });
});

test('Adding, undoing and redoing strokes works', () => {
  let state = emptyDrawing(1);

  state = applyDrawingAction(
    state,
    'add',
    stroke
  );

  assert.equal(state.strokes.length, 1);

  state = applyDrawingAction(state, 'undo');
  assert.equal(state.strokes.length, 0);
  assert.equal(state.redoStack.length, 1);

  state = applyDrawingAction(state, 'redo');
  assert.equal(state.strokes.length, 1);

  state = applyDrawingAction(state, 'clear');
  assert.equal(state.strokes.length, 0);
  assert.equal(state.redoStack.length, 0);
});

test('Duplicate stroke IDs do not duplicate drawings', () => {
  let state = emptyDrawing(1);

  state = applyDrawingAction(
    state,
    'add',
    stroke
  );

  state = applyDrawingAction(
    state,
    'add',
    stroke
  );

  assert.equal(state.strokes.length, 1);
});

// CUSTOM SETTINGS AND GAME MODES

const {
  DEFAULT_SETTINGS,
  validateSettings,
  calculateTurns,
  chooseRoundMode,
  drawingDuration,
  validateModeAction,
  inkUsed,
  INK_LIMIT,
} = require(path.join(compiled, 'settings.js'));

const {
  chooseWords,
} = require(path.join(compiled, 'words.js'));

test('Default settings preserve Classic gameplay', () => {
  const settings = validateSettings();

  assert.equal(settings.mode, 'classic');
  assert.equal(settings.drawingSeconds, 60);
  assert.equal(settings.turnsPerPlayer, 0);
});

test('Adaptive turns work for small rooms', () => {
  assert.equal(
    calculateTurns(2, DEFAULT_SETTINGS),
    5
  );

  assert.equal(
    calculateTurns(3, DEFAULT_SETTINGS),
    4
  );
});

test('Quick match reduces drawing turns', () => {
  assert.equal(
    calculateTurns(2, {
      ...DEFAULT_SETTINGS,
      matchLength: 'quick',
    }),
    3
  );
});

test('Extended match increases drawing turns', () => {
  assert.equal(
    calculateTurns(2, {
      ...DEFAULT_SETTINGS,
      matchLength: 'extended',
    }),
    10
  );
});

test('Explicit turns override the match length', () => {
  assert.equal(
    calculateTurns(2, {
      ...DEFAULT_SETTINGS,
      matchLength: 'extended',
      turnsPerPlayer: 3,
    }),
    3
  );
});

test('Invalid settings are rejected', () => {
  for (const invalid of [
    { mode: 'invalid-mode' },
    { drawingSeconds: 99999 },
    { turnsPerPlayer: -1 },
    { turnsPerPlayer: 1000 },
    { difficulty: 'unsupported' },
    { hints: 'true' },
  ]) {
    assert.throws(() =>
      validateSettings(invalid)
    );
  }
});

test('Speed Clash overrides custom drawing duration', () => {
  assert.equal(
    drawingDuration({
      ...DEFAULT_SETTINGS,
      drawingSeconds: 120,
    }, 'speed'),
    30000
  );
});

test('Classic respects custom drawing duration', () => {
  assert.equal(
    drawingDuration({
      ...DEFAULT_SETTINGS,
      drawingSeconds: 90,
    }, 'classic'),
    90000
  );
});

test('Scoring scales with custom round duration', () => {
  assert.equal(
    pointsForGuess(0, 15000, 30000),
    pointsForGuess(0, 30000, 60000)
  );

  assert.equal(
    pointsForArtist(45000, 90000),
    pointsForArtist(30000, 60000)
  );
});

test('Chaos selects only supported special restrictions', () => {
  for (let i = 0; i < 30; i++) {
    assert.ok([
      'speed',
      'ink',
      'stroke',
      'blind',
      'nohint',
    ].includes(chooseRoundMode('chaos')));
  }
});

test('Specific difficulties return three unique words', () => {
  for (const difficulty of [
    'easy',
    'medium',
    'hard',
  ]) {
    const choices = chooseWords(
      [],
      difficulty
    );

    assert.equal(choices.length, 3);

    assert.equal(
      new Set(
        choices.map(item => item.word)
      ).size,
      3
    );

    assert.ok(
      choices.every(
        item => item.difficulty === difficulty
      )
    );
  }
});

test('Mixed difficulty returns three difficulty levels', () => {
  const choices = chooseWords([]);

  assert.deepEqual(
    choices.map(item => item.difficulty),
    ['easy', 'medium', 'hard']
  );
});

test('Classic mode allows normal drawing actions', () => {
  assert.doesNotThrow(() =>
    validateModeAction(
      'classic',
      emptyDrawing(1),
      'clear'
    )
  );
});

test('One Stroke rejects a second distinct stroke', () => {
  const state = applyDrawingAction(
    emptyDrawing(1),
    'add',
    stroke
  );

  assert.throws(() =>
    validateModeAction(
      'stroke',
      state,
      'add',
      {
        ...stroke,
        id: 'second-stroke',
      }
    )
  );
});

test('One Stroke disables undo, redo and clear', () => {
  for (const action of [
    'undo',
    'redo',
    'clear',
  ]) {
    assert.throws(() =>
      validateModeAction(
        'stroke',
        emptyDrawing(1),
        action
      )
    );
  }
});

test('Limited Ink rejects excessive drawing distance', () => {
  const longStroke = {
    ...stroke,
    points: Array.from(
      { length: 20 },
      (_, index) => ({
        x: index % 2 === 0 ? 0 : 1000,
        y: 100,
      })
    ),
  };

  assert.ok(
    inkUsed([longStroke]) > INK_LIMIT
  );

  assert.throws(() =>
    validateModeAction(
      'ink',
      emptyDrawing(1),
      'add',
      longStroke
    )
  );
});

test('Limited Ink disables erasing and clearing', () => {
  assert.throws(() =>
    validateModeAction(
      'ink',
      emptyDrawing(1),
      'add',
      {
        ...stroke,
        color: '#FFFFFF',
      }
    )
  );

  assert.throws(() =>
    validateModeAction(
      'ink',
      emptyDrawing(1),
      'clear'
    )
  );
});

test('Duplicate stroke requests remain idempotent', () => {
  const state = applyDrawingAction(
    emptyDrawing(1),
    'add',
    stroke
  );

  assert.doesNotThrow(() =>
    validateModeAction(
      'ink',
      state,
      'add',
      stroke
    )
  );
});


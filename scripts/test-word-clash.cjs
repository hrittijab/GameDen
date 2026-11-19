const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomInt } = require('node:crypto');

const { initializeApp, deleteApp } =
  require('firebase/app');

const {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
} = require('firebase/auth');

const {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
  updateDoc,
  getDocFromServer,
  terminate,
} = require('firebase/firestore');

const {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} = require('firebase/functions');

const projectId = JSON.parse(
  fs.readFileSync('.firebaserc', 'utf8')
).projects.default;

const alphabet =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const code = Array.from(
  { length: 8 },
  () => alphabet[randomInt(alphabet.length)]
).join('');

const clients = [];
let created = false;
let passed = 0;

function pass(message) {
  passed++;
  console.log(`PASS: ${message}`);
}

async function client(name) {
  const app = initializeApp({
    projectId,
    apiKey: 'demo-api-key',
    authDomain: `${projectId}.firebaseapp.com`,
  }, `word-test-${name}-${Date.now()}`);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'us-central1');

  connectAuthEmulator(
    auth,
    'http://127.0.0.1:9099',
    { disableWarnings: true }
  );

  connectFirestoreEmulator(db, '127.0.0.1', 8080);

  connectFunctionsEmulator(
    functions,
    '127.0.0.1',
    5001
  );

  const value = {
    app, db, functions, uid: '',
  };

  clients.push(value);

  const credentials =
    await signInAnonymously(auth);

  value.uid = credentials.user.uid;

  return value;
}

function roomRef(c) {
  return doc(c.db, 'wordClashRooms', code);
}

async function room(c) {
  return (
    await getDocFromServer(roomRef(c))
  ).data();
}

async function call(c, name, data = {}) {
  return (
    await httpsCallable(c.functions, name)({
      code,
      ...data,
    })
  ).data;
}

async function denied(action) {
  await assert.rejects(
    action,
    error => String(error.code)
      .includes('permission-denied')
  );
}

async function wait(ms) {
  return new Promise(resolve =>
    setTimeout(resolve, ms)
  );
}

async function main() {
  const host = await client('host');
  const guest = await client('guest');
  const third = await client('third');
  const outsider = await client('outsider');

  const players = {
    [host.uid]: 'Host',
  };

  await setDoc(roomRef(host), {
    hostId: host.uid,
    status: 'lobby',
    players,
  });

  created = true;

  players[guest.uid] = 'Guest';

  await updateDoc(roomRef(guest), {
    players,
  });

  players[third.uid] = 'Third';

  await updateDoc(roomRef(third), {
    players,
  });

  pass('Room creation and joining');

  await denied(() =>
    call(guest, 'configureWordClashRoom', {
      settings: { winningScore: 500 },
    })
  );

  pass('Guests cannot configure the room');

  await denied(() =>
    updateDoc(roomRef(guest), {
      matchSettings: { winningScore: 500 },
    })
  );

  pass('Direct settings writes are blocked');

  await assert.rejects(() =>
    call(host, 'configureWordClashRoom', {
      settings: { winningScore: 99999 },
    })
  );

  pass('Invalid settings are rejected');

  await call(host, 'configureWordClashRoom', {
    settings: {
      winningScore: 300,
      roundSeconds: 45,
      minimumLength: 3,
      mode: 'classic',
    },
  });

  assert.equal(
    (await room(guest)).matchSettings.winningScore,
    300
  );

  pass('Host settings synchronize with guests');

  await denied(() =>
    call(guest, 'startWordClashMatch')
  );

  pass('Only the host can start');

  await call(host, 'startWordClashMatch');

  const initial = await room(host);

  const roundData = {
    matchNumber: initial.matchNumber,
    roundNumber: initial.roundNumber,
  };

  assert.equal(initial.roundMs, 45000);
  assert.equal(initial.letterOptions.length, 3);

  pass('Custom duration and letter options are applied');

  await assert.rejects(() =>
    call(host, 'configureWordClashRoom', {
      settings: { minimumLength: 5 },
    })
  );

  pass('Settings are locked during gameplay');

  const letter = initial.letterOptions[0];

  await denied(() =>
    call(guest, 'selectWordClashLetter', {
      ...roundData,
      letter,
    })
  );

  pass('Only the current chooser can select');

  const forbidden = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    .split('')
    .find(value =>
      !initial.letterOptions.includes(value)
    );

  await assert.rejects(() =>
    call(host, 'selectWordClashLetter', {
      ...roundData,
      letter: forbidden,
    })
  );

  pass('Unlisted starting letters are rejected');

  await call(host, 'selectWordClashLetter', {
    ...roundData,
    letter,
  });

  const countdown = await room(host);

  assert.equal(countdown.phase, 'countdown');

  pass('Preparation countdown starts');

  const word = letter.toLowerCase() + 'zzzz';

  await assert.rejects(() =>
    call(guest, 'submitWordClashWord', {
      ...roundData,
      word,
    })
  );

  pass('Early submissions are rejected');

  await wait(
    Math.max(0, countdown.deadline - Date.now()) + 250
  );

  await call(host, 'advanceWordClashPhase', {
    ...roundData,
    phase: 'countdown',
  });

  assert.equal(
    (await room(host)).phase,
    'typing'
  );

  pass('Countdown advances to submission phase');

  await denied(() =>
    call(outsider, 'submitWordClashWord', {
      ...roundData,
      word,
    })
  );

  pass('Outsiders cannot submit words');

  await call(guest, 'submitWordClashWord', {
    ...roundData,
    word,
  });

  await denied(() =>
    getDocFromServer(
      doc(host.db, 'wordClashSecrets', code)
    )
  );

  pass('Even the host cannot read private submissions');

  const publicRoom = await room(host);

  assert.equal(publicRoom.submissions, undefined);
  assert.deepEqual(publicRoom.results, []);

  pass('Pending words are absent from public room state');

  assert.equal(
    (await call(
      guest,
      'getMyWordClashSubmission',
      roundData
    )).word,
    word
  );

  assert.equal(
    (await call(
      host,
      'getMyWordClashSubmission',
      roundData
    )).word,
    null
  );

  pass('Players can recover only their own submission');

  await assert.rejects(() =>
    call(guest, 'submitWordClashWord', {
      ...roundData,
      word,
    })
  );

  pass('Duplicate submissions are rejected');

  await denied(() =>
    updateDoc(roomRef(guest), {
      scores: { [guest.uid]: 999999 },
    })
  );

  pass('Direct score manipulation is blocked');

  await assert.rejects(() =>
    call(host, 'submitWordClashWord', {
      ...roundData,
      roundNumber: roundData.roundNumber + 1,
      word,
    })
  );

  pass('Mismatched round requests are rejected');

  await denied(() =>
    call(outsider, 'reactWordClash', {
      ...roundData,
      emoji: '🔥',
    })
  );

  pass('Outsiders cannot react');

  await call(guest, 'reactWordClash', {
    ...roundData,
    emoji: '🔥',
  });

  assert.equal(
    (await room(host)).reactions[guest.uid].emoji,
    '🔥'
  );

  pass('Reactions synchronize between members');

  await assert.rejects(() =>
    call(guest, 'reactWordClash', {
      ...roundData,
      emoji: '👏',
    }),
    error => String(error.code)
      .includes('resource-exhausted')
  );

  pass('Reaction cooldown is enforced');

  await call(host, 'submitWordClashWord', {
    ...roundData,
    word,
  });

  await call(third, 'submitWordClashWord', {
    ...roundData,
    word,
  });

  const results = await room(host);

  assert.equal(results.phase, 'results');
  assert.equal(results.results.length, 3);

  assert.ok(
    results.results.every(
      item => item.word === word && item.points === 0
    )
  );

  pass('All submissions reveal together with zero invalid or duplicate points');

  await call(host, 'advanceWordClashPhase', {
    ...roundData,
    phase: 'typing',
  });

  assert.equal(
    (await room(host)).phase,
    'results'
  );

  pass('Stale phase advancement cannot score twice');

  console.log(`\n${passed} multiplayer tests passed.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (created) {
      for (const c of clients.slice(0, 3)) {
        try {
          await call(c, 'leaveWordClashRoom');
        } catch {}
      }
    }

    await Promise.allSettled(
      clients.map(async c => {
        await terminate(c.db);
        await deleteApp(c.app);
      })
    );
  });

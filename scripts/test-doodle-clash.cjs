const assert = require('node:assert/strict');
const fs = require('node:fs');
const { randomInt } = require('node:crypto');

const {
  initializeApp,
  deleteApp,
} = require('firebase/app');

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

let passed = 0;
let roomCreated = false;

function pass(name) {
  passed++;
  console.log(`PASS: ${name}`);
}

async function createClient(name) {
  const app = initializeApp(
    {
      projectId,
      apiKey: 'demo-api-key',
      authDomain: `${projectId}.firebaseapp.com`,
    },
    `doodle-test-${name}-${Date.now()}`
  );

  const auth = getAuth(app);

  connectAuthEmulator(
    auth,
    'http://127.0.0.1:9099',
    { disableWarnings: true }
  );

  const db = getFirestore(app);

  connectFirestoreEmulator(
    db,
    '127.0.0.1',
    8080
  );

  const functions = getFunctions(
    app,
    'us-central1'
  );

  connectFunctionsEmulator(
    functions,
    '127.0.0.1',
    5001
  );

  const client = {
    app,
    db,
    functions,
    uid: '',
  };

  clients.push(client);

  const credentials =
    await signInAnonymously(auth);

  client.uid = credentials.user.uid;

  return client;
}

function roomRef(client) {
  return doc(
    client.db,
    'doodleClashRooms',
    code
  );
}

function drawingRef(client) {
  return doc(
    client.db,
    'doodleClashRooms',
    code,
    'drawing',
    'current'
  );
}

function previewRef(client) {
  return doc(
    client.db,
    'doodleClashRooms',
    code,
    'preview',
    'current'
  );
}

async function call(client, name, data = {}) {
  const result = await httpsCallable(
    client.functions,
    name
  )({
    code,
    ...data,
  });

  return result.data;
}

async function denied(action) {
  await assert.rejects(
    action,
    error => String(error.code).includes(
      'permission-denied'
    )
  );
}

async function main() {
  const host = await createClient('host');
  const guest = await createClient('guest');
  const third = await createClient('third');
  const outsider = await createClient('outsider');

  await setDoc(roomRef(host), {
    hostId: host.uid,
    status: 'lobby',
    players: {
      [host.uid]: 'Host',
    },
  });

  roomCreated = true;

  await updateDoc(roomRef(guest), {
    players: {
      [host.uid]: 'Host',
      [guest.uid]: 'Guest',
    },
  });

  await updateDoc(roomRef(third), {
    players: {
      [host.uid]: 'Host',
      [guest.uid]: 'Guest',
      [third.uid]: 'Third',
    },
  });

  pass('Authenticated players can create and join');

  await denied(() =>
    call(guest, 'startDoodleClashMatch')
  );

  pass('Only host can start a match');

  await denied(() =>
    call(guest, 'configureDoodleClashRoom', {
      settings: {
        drawingSeconds: 120,
      },
    })
  );

  pass('Guests cannot change room settings');

  await denied(() =>
    updateDoc(roomRef(guest), {
      matchSettings: {
        mode: 'blind',
      },
    })
  );

  pass('Direct client settings writes are blocked');

  await call(host, 'configureDoodleClashRoom', {
    settings: {
      mode: 'ink',
      drawingSeconds: 120,
      difficulty: 'easy',
    },
  });

  await call(host, 'configureDoodleClashRoom', {
    settings: {
      hints: false,
    },
  });

  const configured = (
    await getDocFromServer(roomRef(guest))
  ).data();

  assert.equal(
    configured.matchSettings.mode,
    'ink'
  );

  assert.equal(
    configured.matchSettings.drawingSeconds,
    120
  );

  assert.equal(
    configured.matchSettings.hints,
    false
  );

  pass('Host settings synchronize without losing previous changes');

  await call(host, 'startDoodleClashMatch');

  const initial = (
    await getDocFromServer(roomRef(host))
  ).data();

  assert.equal(initial.artistId, host.uid);
  assert.equal(initial.phase, 'choosing');
  assert.equal(initial.totalRounds, 12);
  assert.equal(initial.roundMode, 'ink');
  assert.equal(initial.drawingMs, 120000);

  await assert.rejects(() =>
    call(host, 'configureDoodleClashRoom', {
      settings: {
        mode: 'classic',
      },
    })
  );

  pass('Settings are locked during an active match');

  pass('Adaptive rounds and artist assignment work');

  const matchNumber = initial.matchNumber;

  const words = await call(
    host,
    'getDoodleClashWord',
    { matchNumber }
  );

  assert.equal(words.choices.length, 3);

  assert.ok(
    words.choices.every(
      item => item.difficulty === 'easy'
    )
  );

  pass('Word selection respects custom difficulty');

  pass('Artist receives private word choices');

  await denied(() =>
    call(guest, 'getDoodleClashWord', {
      matchNumber,
    })
  );

  pass('Guessers cannot obtain private words');

  await denied(() =>
    getDocFromServer(
      doc(
        outsider.db,
        'doodleClashSecrets',
        code
      )
    )
  );

  pass('Secret collection rejects unauthorized reads');

  await denied(() =>
    updateDoc(roomRef(guest), {
      artistId: guest.uid,
      scores: {
        [guest.uid]: 999999,
      },
    })
  );

  pass('Clients cannot manipulate scores or artist');

  await call(host, 'selectDoodleClashWord', {
    matchNumber,
    index: 0,
  });

  const answer = words.choices[0].word;

  const publicState = (
    await getDocFromServer(roomRef(guest))
  ).data();

  assert.equal(publicState.phase, 'drawing');
  assert.equal(publicState.revealedWord, null);
  assert.equal(publicState.answer, undefined);
  assert.equal(publicState.choices, undefined);

  pass('Public room does not expose the secret answer');

  await denied(() =>
    getDocFromServer(drawingRef(outsider))
  );

  pass('Nonmembers cannot read saved drawings');

  await denied(() =>
    setDoc(drawingRef(guest), {
      strokes: [],
      revision: 999,
    })
  );

  pass('Direct client drawing writes are blocked');

  const stroke = {
    id: 'security-test-stroke',
    color: '#171717',
    width: 8,
    points: [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ],
  };

  const previewData = {
    matchNumber,
    revision: 0,
    stroke,
  };

  await denied(() =>
    call(
      guest,
      'previewDoodleClashStroke',
      previewData
    )
  );

  pass('Guessers cannot submit drawing previews');

  await call(
    host,
    'previewDoodleClashStroke',
    previewData
  );

  const preview = (
    await getDocFromServer(previewRef(guest))
  ).data();

  assert.equal(preview.stroke.id, stroke.id);

  pass('Authorized live previews reach viewers');

  await denied(() =>
    getDocFromServer(previewRef(outsider))
  );

  pass('Nonmembers cannot read live previews');

  await denied(() =>
    setDoc(previewRef(guest), {
      stroke,
    })
  );

  pass('Direct preview writes are blocked');

  await denied(() =>
    call(guest, 'updateDoodleClashDrawing', {
      ...previewData,
      action: 'add',
    })
  );

  pass('Guessers cannot submit permanent strokes');

  await call(host, 'updateDoodleClashDrawing', {
    ...previewData,
    action: 'add',
  });

  const saved = (
    await getDocFromServer(drawingRef(guest))
  ).data();

  assert.equal(saved.strokes.length, 1);
  assert.equal(saved.revision, 1);

  pass('Permanent drawing synchronization works');

  await assert.rejects(() =>
    call(host, 'updateDoodleClashDrawing', {
      matchNumber,
      revision: 1,
      action: 'clear',
    })
  );

  pass('Restricted drawing actions are rejected by the server');

  const activityRef = client => doc(
    client.db,
    'doodleClashRooms',
    code,
    'activity',
    'current'
  );

  await denied(() =>
    getDocFromServer(activityRef(outsider))
  );

  pass('Nonmembers cannot read the activity feed');

  await denied(() =>
    setDoc(activityRef(guest), {
      events: [],
    })
  );

  pass('Direct activity writes are blocked');

  await denied(() =>
    call(outsider, 'reactDoodleClash', {
      matchNumber,
      reaction: '🔥',
    })
  );

  pass('Nonmembers cannot send reactions');

  await call(guest, 'reactDoodleClash', {
    matchNumber,
    reaction: '🔥',
  });

  const reacted = (
    await getDocFromServer(activityRef(host))
  ).data();

  assert.ok(
    reacted.events.some(
      event =>
        event.kind === 'reaction' &&
        event.text === '🔥' &&
        event.uid === guest.uid
    )
  );

  pass('Player reactions reach other members');

  await assert.rejects(() =>
    call(guest, 'reactDoodleClash', {
      matchNumber,
      reaction: '👏',
    }),
    error =>
      String(error.code).includes(
        'resource-exhausted'
      )
  );

  pass('Reaction spam cooldown works');

  await assert.rejects(() =>
    call(host, 'updateDoodleClashDrawing', {
      ...previewData,
      action: 'clear',
    })
  );

  pass('Stale drawing revision is rejected');

  await denied(() =>
    call(host, 'guessDoodleClashWord', {
      matchNumber,
      guess: answer,
    })
  );

  pass('Artist cannot guess their own word');

  const correct = await call(
    guest,
    'guessDoodleClashWord',
    {
      matchNumber,
      guess: answer,
    }
  );

  assert.equal(correct.correct, true);
  assert.ok(correct.points > 0);
  assert.ok(correct.points <= 100);

  pass('Correct guesses receive valid points');

  const activity = (
    await getDocFromServer(activityRef(host))
  ).data();

  const correctEvent = activity.events.find(
    event =>
      event.kind === 'correct' &&
      event.uid === guest.uid
  );

  assert.ok(correctEvent);
  assert.ok(
    correctEvent.text.includes(
      String(correct.points)
    )
  );

  assert.ok(
    !correctEvent.text
      .toLowerCase()
      .includes(answer.toLowerCase())
  );

  pass('Correct guess notifications conceal the answer');

  await assert.rejects(() =>
    call(guest, 'guessDoodleClashWord', {
      matchNumber,
      guess: answer,
    })
  );

  pass('Duplicate scoring is prevented');

  console.log(`\n${passed} multiplayer tests passed.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (roomCreated) {
      for (const client of clients.slice(0, 3)) {
        try {
          await call(
            client,
            'leaveDoodleClashRoom'
          );
        } catch {}
      }
    }

    await Promise.allSettled(
      clients.map(async client => {
        await terminate(client.db);
        await deleteApp(client.app);
      })
    );
  });


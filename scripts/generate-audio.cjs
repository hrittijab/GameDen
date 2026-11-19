const fs = require('node:fs');
const path = require('node:path');

const RATE = 22050;

function writeWav(file, duration, sample) {
  const count = Math.floor(RATE * duration);
  const buffer = Buffer.alloc(44 + count * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(RATE, 24);
  buffer.writeUInt32LE(RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(count * 2, 40);

  for (let i = 0; i < count; i++) {
    const t = i / RATE;

    const value = Math.max(
      -1,
      Math.min(1, sample(t))
    );

    buffer.writeInt16LE(
      Math.round(value * 32767),
      44 + i * 2
    );
  }

  fs.mkdirSync(path.dirname(file), {
    recursive: true,
  });

  fs.writeFileSync(file, buffer);

  console.log(`Created ${file}`);
}

function sine(frequency, time) {
  return Math.sin(
    2 * Math.PI * frequency * time
  );
}

function tone(time, frequency, duration) {
  if (time < 0 || time >= duration) {
    return 0;
  }

  const attack = Math.min(1, time / 0.012);

  const decay = Math.pow(
    1 - time / duration,
    2
  );

  return (
    sine(frequency, time) +
    0.18 * sine(frequency * 2, time)
  ) * attack * decay;
}

function sequence(file, frequencies, step, length) {
  writeWav(
    file,
    frequencies.length * step + length,
    time => frequencies.reduce(
      (sum, frequency, index) =>
        sum + tone(
          time - index * step,
          frequency,
          length
        ) * 0.32,
      0
    )
  );
}

sequence(
  'assets/audio/common/tap.wav',
  [680],
  0.05,
  0.08
);

sequence(
  'assets/audio/common/reaction.wav',
  [660, 990],
  0.065,
  0.14
);

sequence(
  'assets/audio/common/countdown.wav',
  [880],
  0.05,
  0.12
);

sequence(
  'assets/audio/common/defeat.wav',
  [392, 330, 262],
  0.14,
  0.3
);

sequence(
  'assets/audio/common/duplicate.wav',
  [440, 350],
  0.08,
  0.18
);

// Original ambient instrumental.
// Soft arpeggios with a gentle chord progression.

const chords = [
  [261.63, 329.63, 392.00, 493.88],
  [220.00, 261.63, 329.63, 392.00],
  [174.61, 220.00, 261.63, 329.63],
  [196.00, 246.94, 293.66, 392.00],
];

const pattern = [0, 2, 1, 3, 2, 1, 3, 2];

writeWav(
  'assets/audio/music/ambient.wav',
  24,
  time => {
    const chordIndex =
      Math.floor(time / 6) % chords.length;

    const chord = chords[chordIndex];

    const local = time % 6;

    const beat = Math.floor(local / 0.75);

    const withinBeat = local % 0.75;

    const melody = tone(
      withinBeat,
      chord[pattern[beat]] * 2,
      0.72
    ) * 0.055;

    const bass = tone(
      local % 3,
      chord[0] / 2,
      2.9
    ) * 0.035;

    const envelope = Math.min(
      1,
      local / 0.25,
      (6 - local) / 0.25
    );

    const pad = chord.reduce(
      (sum, frequency) =>
        sum + sine(frequency, time) * 0.009,
      0
    ) * envelope;

    const edge = Math.min(
      1,
      time / 0.15,
      (24 - time) / 0.15
    );

    return (melody + bass + pad) * edge;
  }
);

console.log('Audio generation complete.');

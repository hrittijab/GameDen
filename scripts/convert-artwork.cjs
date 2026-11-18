const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const os = require('os');

const downloads = path.join(os.homedir(), 'Downloads');

const categories = [
  'party',
  'multiplayer',
  'solo',
];

const games = [
  'imposter',
  'charades',
  'never-have-i-ever',
  'who-am-i',
  'color-clash',
];

function findImage(name) {
  for (const extension of ['png', 'jpg', 'jpeg', 'webp']) {
    const file = path.join(
      downloads,
      `${name}.${extension}`,
    );

    if (fs.existsSync(file)) {
      return file;
    }
  }

  throw new Error(`Missing image: ${name}`);
}

async function convert(name, folder, width, height) {
  const input = findImage(name);

  const output = path.join(
    'assets',
    folder,
    `${name}.webp`,
  );

  await sharp(input)
    .rotate()
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85 })
    .toFile(output);

  const size = fs.statSync(output).size;

  console.log(
    `Created: ${output} (${Math.round(size / 1024)} KB)`
  );
}

async function main() {
  for (const name of [...categories, ...games]) {
    findImage(name);
  }

  for (const name of categories) {
    await convert(name, 'categories', 960, 540);
  }

  for (const name of games) {
    await convert(name, 'games', 512, 512);
  }

  console.log('All GameDen artwork is ready!');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

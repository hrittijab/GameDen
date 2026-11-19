import { randomInt } from 'node:crypto';

export const WORDS = {
  easy: [
    'Apple', 'Banana', 'Cat', 'Dog', 'Fish',
    'Bird', 'Sun', 'Moon', 'Star', 'Cloud',
    'House', 'Tree', 'Flower', 'Chair', 'Table',
    'Book', 'Pencil', 'Clock', 'Shoe', 'Hat',
    'Ball', 'Pizza', 'Cake', 'Car', 'Bus',
    'Boat', 'Train', 'Door', 'Window', 'Bed',
    'Shirt', 'Cup', 'Spoon', 'Fork', 'Umbrella',
    'Butterfly', 'Snake', 'Rabbit', 'Duck', 'Frog',
    'Lion', 'Tiger', 'Bear', 'Elephant', 'Giraffe',
    'Heart', 'Candle', 'Key', 'Banana peel',
    'Ice cream', 'Snowman', 'Rainbow', 'Balloon',
    'Cookie', 'Basket', 'Bread', 'Eye', 'Hand',
    'Tooth', 'Glasses', 'Sock', 'Lemon',
    'Orange', 'Grapes', 'Carrot', 'Potato',
  ],

  medium: [
    'Helicopter', 'Airplane', 'Waterfall',
    'Lighthouse', 'Skateboard', 'Motorcycle',
    'Backpack', 'Suitcase', 'Microscope',
    'Telescope', 'Robot', 'Astronaut',
    'Octopus', 'Jellyfish', 'Kangaroo',
    'Crocodile', 'Penguin', 'Peacock',
    'Dinosaur', 'Unicorn', 'Mermaid',
    'Vampire', 'Zombie', 'Pirate',
    'Treasure chest', 'Castle', 'Igloo',
    'Volcano', 'Windmill', 'Traffic light',
    'Fire truck', 'School bus', 'Hot air balloon',
    'Shopping cart', 'Popcorn', 'Hamburger',
    'Sandwich', 'Birthday party', 'Wedding cake',
    'Swimming pool', 'Football field',
    'Electric guitar', 'Headphones',
    'Microphone', 'Camera', 'Washing machine',
    'Refrigerator', 'Vacuum cleaner',
    'Spider web', 'Teddy bear', 'Scarecrow',
    'Dream catcher', 'Fishing rod',
    'Camping tent', 'Roller skates',
    'Magic wand', 'Snowflake', 'Seahorse',
  ],

  hard: [
    'Roller coaster', 'Time machine',
    'Alien invasion', 'Earthquake',
    'Solar eclipse', 'Northern lights',
    'Space station', 'Black hole',
    'Treasure hunt', 'Secret agent',
    'Detective investigation', 'Bank robbery',
    'Broken heart', 'Love at first sight',
    'Traffic jam', 'Job interview',
    'Graduation ceremony', 'Wedding proposal',
    'Birthday surprise', 'Pillow fight',
    'Food delivery', 'Online shopping',
    'Going viral', 'Identity crisis',
    'Monday morning', 'Sleepwalking',
    'Brain freeze', 'Stage fright',
    'Daydreaming', 'Homesickness',
    'Bad luck', 'Good luck',
    'Magic trick', 'Invisible man',
    'Parallel universe', 'Artificial intelligence',
    'Video conference', 'Lost luggage',
    'Road trip', 'Power outage',
    'Fashion show', 'Red carpet',
    'Concert ticket', 'Fire drill',
    'Science experiment', 'Movie premiere',
    'Escape room', 'Mirror maze',
    'Sandstorm', 'Underwater city',
  ],
};

export type WordOption = {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export function normalizeWord(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function chooseWords(
  used: string[] = [],
): WordOption[] {
  const difficulties = [
    'easy',
    'medium',
    'hard',
  ] as const;

  return difficulties.map(difficulty => {
    const unused = WORDS[difficulty].filter(
      word => !used.includes(word),
    );

    const pool = unused.length
      ? unused
      : WORDS[difficulty];

    return {
      word: pool[randomInt(pool.length)],
      difficulty,
    };
  });
}

export function maskWord(word: string): string {
  return word.replace(/[a-z0-9]/gi, '_');
}

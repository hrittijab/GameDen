import type { ImageSourcePropType } from 'react-native';

export type CategoryId =
  | 'party'
  | 'multiplayer'
  | 'solo';

export type GameCategory = {
  id: CategoryId;
  title: string;
  description: string;
  image: ImageSourcePropType;
  color: string;
  accent: string;
};

export type Game = {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  image?: ImageSourcePropType;
  mode: 'offline' | 'online';
  players: string;
  color: string;
  available: boolean;
};

export const CATEGORIES: GameCategory[] = [
  {
    id: 'party',
    title: 'Party Games',
    description: 'One device. Endless laughs.',
    image: require('../../assets/categories/party.webp'),
    color: '#39265B',
    accent: '#C8A7FF',
  },
  {
    id: 'multiplayer',
    title: 'Board & Multiplayer',
    description: 'Connect, compete and play together.',
    image: require('../../assets/categories/multiplayer.webp'),
    color: '#203F49',
    accent: '#A5E1EB',
  },
  {
    id: 'solo',
    title: 'Solo Games',
    description: 'Your game. Your pace.',
    image: require('../../assets/categories/solo.webp'),
    color: '#493B29',
    accent: '#FFD071',
  },
];

export const GAMES: Game[] = [
  {
    id: 'word-clash',
    image: require('../../assets/games/word-clash.webp'),
    name: 'Word Clash',
    description: 'Race to submit unique words before time runs out.',
    category: 'multiplayer',
    mode: 'online',
    players: '2-12 players',
    color: '#594378',
    available: true,
  },

  {
    id: 'doodle-clash',
    name: 'Doodle Clash',
    description: 'Draw mysterious words and challenge your friends to guess.',
    category: 'multiplayer',
    image: require('../../assets/games/doodle-clash.webp'),
    mode: 'online',
    players: '2-12 players',
    color: '#49365F',
    available: true,
  },
  {
    id: 'imposter',
    name: 'Imposter',
    description: 'Find the imposter hiding among your friends.',
    category: 'party',
    image: require('../../assets/games/imposter.webp'),
    mode: 'offline',
    players: 'Group play',
    color: '#49365F',
    available: true,
  },
  {
    id: 'charades',
    name: 'Charades',
    description: 'Act it out and let your friends guess.',
    category: 'party',
    image: require('../../assets/games/charades.webp'),
    mode: 'offline',
    players: 'Group play',
    color: '#244F51',
    available: true,
  },
  {
    id: 'never-have-i-ever',
    name: 'Never Have I Ever',
    description: 'Discover hilarious secrets about your friends.',
    category: 'party',
    image: require('../../assets/games/never-have-i-ever.webp'),
    mode: 'offline',
    players: 'Group play',
    color: '#60394C',
    available: true,
  },
  {
    id: 'who-am-i',
    name: 'Who Am I?',
    description: 'Discover your mysterious identity.',
    category: 'party',
    image: require('../../assets/games/who-am-i.webp'),
    mode: 'offline',
    players: 'Group play',
    color: '#594A32',
    available: true,
  },
  {
    id: 'color-clash',
    name: 'Color Clash',
    description: 'Outsmart your friends in a colorful card battle.',
    category: 'multiplayer',
    image: require('../../assets/games/color-clash.webp'),
    mode: 'online',
    players: '2–20 players',
    color: '#244F51',
    available: true,
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'The classic battle of strategy.',
    category: 'multiplayer',
    mode: 'online',
    players: '2 players',
    color: '#343B55',
    available: false,
  },
];

export function getCategory(id: string) {
  return CATEGORIES.find(category => category.id === id);
}

export function getGamesByCategory(id: CategoryId) {
  return GAMES.filter(game => game.category === id);
}

export function getAvailableGameCount(id: CategoryId) {
  return getGamesByCategory(id).filter(
    game => game.available,
  ).length;
}




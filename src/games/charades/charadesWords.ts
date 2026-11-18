
export const CHARADES_CATEGORIES = {
  bollywood: {
    name: 'Bollywood Movies',
    emoji: '🎬',
    words: [
      'Sholay',
      '3 Idiots',
      'Dilwale Dulhania Le Jayenge',
      'Kabhi Khushi Kabhie Gham',
      'Jawan',
      'Pathaan',
      'Dangal',
      'PK',
      'Om Shanti Om',
      'Yeh Jawaani Hai Deewani',
      'Zindagi Na Milegi Dobara',
      'Bajrangi Bhaijaan',
      'Chennai Express',
      'Jab We Met',
      'Kuch Kuch Hota Hai',
      'Rockstar',
      'Stree',
      'Bhool Bhulaiyaa',
      'Golmaal',
      'Welcome',
    ],
  },

  hollywood: {
    name: 'Hollywood Movies',
    emoji: '🎥',
    words: [
      'Titanic',
      'Avatar',
      'Barbie',
      'Oppenheimer',
      'Inception',
      'Interstellar',
      'The Avengers',
      'Iron Man',
      'Spider-Man',
      'Jurassic Park',
      'The Lion King',
      'Frozen',
      'The Dark Knight',
      'Harry Potter',
      'The Matrix',
      'Jumanji',
      'Home Alone',
      'The Conjuring',
      'Twilight',
      'The Hunger Games',
    ],
  },

  bollywoodSongs: {
    name: 'Bollywood Songs',
    emoji: '🎶',
    words: [
      'Kala Chashma',
      'Chaiyya Chaiyya',
      'Badtameez Dil',
      'Bole Chudiyan',
      'Gallan Goodiyaan',
      'London Thumakda',
      'Ghungroo',
      'Kesariya',
      'Tum Hi Ho',
      'Channa Mereya',
      'Kabira',
      'Gerua',
      'Tujh Mein Rab Dikhta Hai',
      'Mauja Hi Mauja',
      'Sheila Ki Jawani',
      'Chikni Chameli',
      'Desi Girl',
      'Pehla Nasha',
      'Kajra Re',
      'Kar Gayi Chull',
    ],
  },

  hollywoodSongs: {
    name: 'Hollywood Songs',
    emoji: '🎤',
    words: [
      'My Heart Will Go On',
      'Let It Go',
      'A Whole New World',
      'Can You Feel the Love Tonight',
      'Hakuna Matata',
      'Circle of Life',
      'Under the Sea',
      'Beauty and the Beast',
      'Part of Your World',
      'Into the Unknown',
      'Show Yourself',
      'This Is Me',
      'Rewrite the Stars',
      'Shallow',
      'City of Stars',
      'What Was I Made For?',
      'I Will Always Love You',
      'Eye of the Tiger',
      'Footloose',
      'Ghostbusters',
    ],
  },

  hindiPhrases: {
    name: 'Hindi Proverbs & Phrases',
    emoji: '🪔',
    words: [
      'नौ दो ग्यारह होना',
      'नाक में दम करना',
      'आँखों का तारा',
      'आँखों में धूल झोंकना',
      'हाथ पर हाथ धरे बैठना',
      'दाल में कुछ काला है',
      'ऊँट के मुँह में जीरा',
      'नाच न जाने आँगन टेढ़ा',
      'घर की मुर्गी दाल बराबर',
      'एक तीर से दो निशाने',
      'आसमान सिर पर उठाना',
      'नाक कटना',
      'रंगे हाथ पकड़ा जाना',
      'मुँह में पानी आना',
      'पेट में चूहे दौड़ना',
      'हवा में बातें करना',
      'आग बबूला होना',
      'हाथ मलते रह जाना',
      'आँखें दिखाना',
      'अपने पैर पर कुल्हाड़ी मारना',
    ],
  },

  englishPhrases: {
    name: 'English Proverbs, Idioms & Phrases',
    emoji: '💬',
    words: [
      'Break the ice',
      'Spill the beans',
      'A piece of cake',
      'Under the weather',
      'Hit the nail on the head',
      'The ball is in your court',
      'Bite the bullet',
      'Let the cat out of the bag',
      'When pigs fly',
      'Once in a blue moon',
      'Burning the midnight oil',
      'A blessing in disguise',
      'Cost an arm and a leg',
      'Cry over spilled milk',
      'Kill two birds with one stone',
      'The early bird catches the worm',
      'Actions speak louder than words',
      'Barking up the wrong tree',
      'Walking on thin ice',
      'Better late than never',
    ],
  },
} as const;

export type CharadesCategory =
  keyof typeof CHARADES_CATEGORIES;

export type CharadesSelection =
  CharadesCategory | 'mixed';

export const CHARADES_OPTIONS: {
  id: CharadesSelection;
  name: string;
  emoji: string;
}[] = [
  ...(
    Object.keys(CHARADES_CATEGORIES) as CharadesCategory[]
  ).map((id) => ({
    id,
    name: CHARADES_CATEGORIES[id].name,
    emoji: CHARADES_CATEGORIES[id].emoji,
  })),
  {
    id: 'mixed',
    name: 'Mixed',
    emoji: '🎲',
  },
];

export function getCharadesWords(
  selection: CharadesSelection
): string[] {
  if (selection === 'mixed') {
    return Array.from(
      new Set(
        Object.values(CHARADES_CATEGORIES)
          .flatMap((category) => [...category.words])
      )
    );
  }

  return [...CHARADES_CATEGORIES[selection].words];
}

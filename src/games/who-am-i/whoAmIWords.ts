
export const WHO_AM_I_CATEGORIES = {
  bollywood: {
    name: 'Bollywood Stars',
    emoji: '🎬',
    words: [
      'Shah Rukh Khan', 'Salman Khan', 'Aamir Khan',
      'Ranbir Kapoor', 'Ranveer Singh', 'Hrithik Roshan',
      'Amitabh Bachchan', 'Akshay Kumar', 'Deepika Padukone',
      'Alia Bhatt', 'Katrina Kaif', 'Kareena Kapoor',
      'Priyanka Chopra', 'Kajol', 'Madhuri Dixit',
      'Kiara Advani', 'Shraddha Kapoor', 'Anushka Sharma',
      'Vicky Kaushal', 'Kartik Aaryan',
    ],
  },
  hollywood: {
    name: 'Hollywood Stars',
    emoji: '🌟',
    words: [
      'Leonardo DiCaprio', 'Tom Cruise', 'Brad Pitt',
      'Robert Downey Jr.', 'Chris Hemsworth', 'Tom Holland',
      'Ryan Reynolds', 'Dwayne Johnson', 'Johnny Depp',
      'Keanu Reeves', 'Emma Watson', 'Jennifer Lawrence',
      'Zendaya', 'Margot Robbie', 'Emma Stone',
      'Scarlett Johansson', 'Anne Hathaway', 'Angelina Jolie',
      'Will Smith', 'Cillian Murphy',
    ],
  },
  fictional: {
    name: 'Fictional Characters',
    emoji: '🦸',
    words: [
      'Harry Potter', 'Hermione Granger', 'Spider-Man',
      'Iron Man', 'Batman', 'Superman', 'Wonder Woman',
      'Elsa', 'Barbie', 'Doraemon', 'Shinchan',
      'Mickey Mouse', 'SpongeBob', 'Sherlock Holmes',
      'Wednesday Addams', 'Hulk', 'Thor', 'Joker',
      'Pikachu', 'Cinderella',
    ],
  },
  famous: {
    name: 'Famous Personalities',
    emoji: '🏆',
    words: [
      'Virat Kohli', 'Sachin Tendulkar', 'MS Dhoni',
      'Lionel Messi', 'Cristiano Ronaldo', 'Serena Williams',
      'Taylor Swift', 'Ariana Grande', 'Selena Gomez',
      'Billie Eilish', 'Beyonce', 'Rihanna',
      'Ed Sheeran', 'Justin Bieber', 'Shakira',
      'Albert Einstein', 'Isaac Newton', 'Marie Curie',
      'Steve Jobs', 'Elon Musk',
    ],
  },
  professions: {
    name: 'Professions',
    emoji: '👩‍🚀',
    words: [
      'Doctor', 'Teacher', 'Chef', 'Pilot',
      'Astronaut', 'Police Officer', 'Firefighter',
      'Dentist', 'Lawyer', 'Scientist',
      'Software Developer', 'Photographer',
      'Singer', 'Dancer', 'Actor', 'Farmer',
      'Mechanic', 'Magician', 'Journalist', 'Architect',
    ],
  },
  animals: {
    name: 'Animals',
    emoji: '🐼',
    words: [
      'Panda', 'Tiger', 'Lion', 'Elephant',
      'Penguin', 'Dolphin', 'Shark', 'Giraffe',
      'Kangaroo', 'Monkey', 'Zebra', 'Rabbit',
      'Crocodile', 'Snake', 'Peacock', 'Horse',
      'Koala', 'Octopus', 'Camel', 'Butterfly',
    ],
  },
} as const;

export type WhoAmICategory = keyof typeof WHO_AM_I_CATEGORIES;
export type WhoAmISelection = WhoAmICategory | 'mixed';

export const WHO_AM_I_OPTIONS: {
  id: WhoAmISelection;
  name: string;
  emoji: string;
}[] = [
  ...(
    Object.keys(WHO_AM_I_CATEGORIES) as WhoAmICategory[]
  ).map((id) => ({
    id,
    name: WHO_AM_I_CATEGORIES[id].name,
    emoji: WHO_AM_I_CATEGORIES[id].emoji,
  })),
  {
    id: 'mixed',
    name: 'Mixed',
    emoji: '🎲',
  },
];

export function getWhoAmIWords(
  selection: WhoAmISelection
): string[] {
  if (selection === 'mixed') {
    return Array.from(
      new Set(
        Object.values(WHO_AM_I_CATEGORIES).flatMap(
          (category) => [...category.words]
        )
      )
    );
  }

  return [...WHO_AM_I_CATEGORIES[selection].words];
}

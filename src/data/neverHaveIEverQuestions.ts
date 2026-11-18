
export const NEVER_HAVE_I_EVER_CATEGORIES = {
  friends: {
    name: 'Friends',
    emoji: '👥',
    questions: [
      "Never have I ever had a crush on a friend.",
      "Never have I ever lied to get out of plans.",
      "Never have I ever kept a friend's secret for years.",
      "Never have I ever been jealous of a friend.",
      "Never have I ever accidentally exposed a secret.",
      "Never have I ever pretended to like a friend's partner.",
      "Never have I ever forgotten a friend's birthday.",
      "Never have I ever had a friendship breakup.",
      "Never have I ever borrowed something and forgotten to return it.",
      "Never have I ever planned a surprise party.",
      "Never have I ever had a secret group chat.",
      "Never have I ever ghosted a friend.",
      "Never have I ever made friends with someone I initially disliked.",
      "Never have I ever cried because of a friendship.",
      "Never have I ever sent a screenshot to the wrong person.",
      "Never have I ever had a crush on the same person as a friend.",
    ],
  },

  funny: {
    name: 'Funny',
    emoji: '😂',
    questions: [
      "Never have I ever laughed at the wrong moment.",
      "Never have I ever waved at someone who wasn't waving at me.",
      "Never have I ever talked to myself in public.",
      "Never have I ever fallen asleep during an online class.",
      "Never have I ever walked into the wrong room.",
      "Never have I ever sent a message to the wrong chat.",
      "Never have I ever pretended to understand a joke.",
      "Never have I ever tripped in front of a crowd.",
      "Never have I ever sung loudly when I thought nobody was listening.",
      "Never have I ever forgotten why I entered a room.",
      "Never have I ever laughed so hard that I cried.",
      "Never have I ever worn clothes inside out accidentally.",
      "Never have I ever called someone by the wrong name.",
      "Never have I ever accidentally liked an old social media post.",
      "Never have I ever danced in front of a mirror.",
      "Never have I ever practiced a conversation before having it.",
    ],
  },

  couples: {
    name: 'Couples',
    emoji: '💞',
    questions: [
      "Never have I ever fallen in love at first sight.",
      "Never have I ever imagined a future with someone I just met.",
      "Never have I ever checked someone's last-seen status.",
      "Never have I ever gotten jealous over a harmless interaction.",
      "Never have I ever written a romantic letter.",
      "Never have I ever had a secret crush.",
      "Never have I ever rehearsed a confession of love.",
      "Never have I ever stayed up all night talking to someone special.",
      "Never have I ever planned a surprise romantic date.",
      "Never have I ever saved a cute message.",
      "Never have I ever stalked my crush's social media profile.",
      "Never have I ever pretended not to care about someone.",
      "Never have I ever dreamed about my crush.",
      "Never have I ever been nervous before a first date.",
      "Never have I ever made a playlist for someone.",
      "Never have I ever caught feelings unexpectedly.",
    ],
  },

  deep: {
    name: 'Deep Conversations',
    emoji: '🧠',
    questions: [
      "Never have I ever felt misunderstood by people close to me.",
      "Never have I ever been afraid of failing.",
      "Never have I ever changed a major life goal.",
      "Never have I ever regretted not taking a chance.",
      "Never have I ever wanted to start my life over in a new city.",
      "Never have I ever cried from happiness.",
      "Never have I ever hidden my feelings to protect someone.",
      "Never have I ever questioned my career choices.",
      "Never have I ever forgiven someone without receiving an apology.",
      "Never have I ever felt proud of overcoming a fear.",
      "Never have I ever struggled to say goodbye.",
      "Never have I ever wished I could relive a particular day.",
      "Never have I ever made a decision that changed my life.",
      "Never have I ever felt lonely in a crowded room.",
      "Never have I ever learned a lesson from heartbreak.",
      "Never have I ever wanted to tell my younger self something important.",
    ],
  },

  family: {
    name: 'Family',
    emoji: '🏠',
    questions: [
      "Never have I ever eaten dessert before dinner.",
      "Never have I ever blamed a sibling for something I did.",
      "Never have I ever hidden a bad grade.",
      "Never have I ever accidentally broken something at home.",
      "Never have I ever pretended to be asleep.",
      "Never have I ever sneaked a snack at midnight.",
      "Never have I ever forgotten a family member's birthday.",
      "Never have I ever planned a family surprise.",
      "Never have I ever cried while watching an animated movie.",
      "Never have I ever argued about what to watch on TV.",
      "Never have I ever lost something important at home.",
      "Never have I ever laughed during a serious family conversation.",
      "Never have I ever told a funny story about a family member.",
      "Never have I ever cooked a meal for my family.",
      "Never have I ever taken the last piece of food.",
      "Never have I ever pretended to like a meal.",
    ],
  },
} as const;

export type NeverCategory =
  keyof typeof NEVER_HAVE_I_EVER_CATEGORIES;

export type NeverSelection = NeverCategory | 'mixed';

export const NEVER_CATEGORY_OPTIONS: {
  id: NeverSelection;
  name: string;
  emoji: string;
}[] = [
  ...(
    Object.keys(NEVER_HAVE_I_EVER_CATEGORIES) as NeverCategory[]
  ).map((id) => ({
    id,
    name: NEVER_HAVE_I_EVER_CATEGORIES[id].name,
    emoji: NEVER_HAVE_I_EVER_CATEGORIES[id].emoji,
  })),
  {
    id: 'mixed',
    name: 'Mixed',
    emoji: '🎲',
  },
];

export function getNeverQuestions(
  category: NeverSelection
): string[] {
  if (category === 'mixed') {
    return Array.from(
      new Set(
        Object.values(NEVER_HAVE_I_EVER_CATEGORIES)
          .flatMap((entry) => [...entry.questions])
      )
    );
  }

  return [...NEVER_HAVE_I_EVER_CATEGORIES[category].questions];
}

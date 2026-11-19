const banks = {
  Animals: `
    aardvark alligator alpaca ant anteater antelope ape armadillo
    baboon badger bat bear beaver bee beetle bison boar buffalo
    butterfly camel cat caterpillar cheetah chicken chimpanzee
    cobra cockroach cougar cow coyote crab crocodile crow
    deer dog dolphin donkey dove dragonfly duck eagle eel
    elephant falcon ferret flamingo fox frog gazelle gecko
    giraffe goat goldfish goose gorilla grasshopper hamster
    hare hawk hedgehog hippopotamus horse hyena iguana
    jaguar jellyfish kangaroo koala leopard lion lizard
    llama lobster lynx meerkat monkey moose mosquito moth
    mouse octopus ostrich otter owl panda panther parrot
    peacock pelican penguin pigeon pony porcupine rabbit
    raccoon rat raven reindeer rhinoceros salmon scorpion
    seal shark sheep shrimp skunk snail snake sparrow
    spider squid squirrel swan tiger tortoise trout turkey
    turtle vulture walrus wasp whale wolf wombat woodpecker
    zebra
  `,

  Countries: `
    afghanistan albania algeria andorra angola argentina armenia
    australia austria azerbaijan bahamas bahrain bangladesh
    barbados belarus belgium belize benin bhutan bolivia botswana
    brazil brunei bulgaria burundi cambodia cameroon canada
    chad chile china colombia comoros croatia cuba cyprus
    czechia denmark djibouti dominica ecuador egypt eritrea
    estonia eswatini ethiopia fiji finland france gabon gambia
    georgia germany ghana greece grenada guatemala guinea
    guyana haiti honduras hungary iceland india indonesia
    iran iraq ireland israel italy jamaica japan jordan
    kazakhstan kenya kiribati kuwait kyrgyzstan laos latvia
    lebanon lesotho liberia libya liechtenstein lithuania
    luxembourg madagascar malawi malaysia maldives mali
    malta mauritania mauritius mexico micronesia moldova
    monaco mongolia montenegro morocco mozambique myanmar
    namibia nauru nepal netherlands nicaragua niger nigeria
    norway oman pakistan palau panama paraguay peru philippines
    poland portugal qatar romania russia rwanda samoa senegal
    serbia seychelles singapore slovakia slovenia somalia
    spain sudan suriname sweden switzerland syria tajikistan
    tanzania thailand togo tonga tunisia turkey turkmenistan
    tuvalu uganda ukraine uruguay uzbekistan vanuatu
    venezuela vietnam yemen zambia zimbabwe
  `,

  Food: `
    bagel baguette banana barbecue biscuit bread brownie
    burger burrito butter cake candy caramel cereal cheese
    cheesecake chicken chocolate chutney cookie couscous
    cracker croissant curry custard doughnut dumpling
    falafel fries fudge garlic granola gravy hamburger
    honey hummus icecream jam jelly kebab ketchup lasagna
    lentils macaroni mayonnaise meatball muffin mustard
    nachos noodles omelette pancake pasta pastry pizza
    popcorn porridge pretzel pudding quesadilla ramen
    ravioli rice risotto salad salsa sandwich sausage
    seafood soup spaghetti steak sushi taco tofu tortilla
    waffle yogurt yoghurt
  `,

  Produce: `
    apple apricot artichoke asparagus avocado banana beetroot
    blackberry blueberry broccoli cabbage carrot cauliflower
    celery cherry coconut corn cranberry cucumber date
    dragonfruit eggplant fig garlic ginger grape grapefruit
    guava kale kiwi leek lemon lettuce lime lychee mango
    melon mushroom nectarine olive onion orange papaya
    passionfruit peach pear peas pepper pineapple plum
    pomegranate potato pumpkin radish raspberry spinach
    squash strawberry tomato turnip watermelon zucchini
  `,

  Professions: `
    accountant actor actress architect artist astronaut
    author baker barber biologist butcher carpenter cashier
    chef chemist cleaner coach consultant dentist designer
    detective developer dietitian doctor driver electrician
    engineer farmer firefighter florist gardener geologist
    illustrator journalist judge lawyer librarian mechanic
    musician nurse optician painter pharmacist photographer
    physician pilot plumber poet politician programmer
    psychologist receptionist researcher scientist secretary
    singer surgeon tailor teacher technician therapist
    translator veterinarian waiter waitress writer
  `,

  Sports: `
    archery badminton baseball basketball bowling boxing
    climbing cricket curling cycling darts diving fencing
    football golf gymnastics handball hockey jogging
    karate kayaking lacrosse netball rowing rugby running
    sailing skating skiing snowboarding soccer softball
    squash surfing swimming tennis triathlon volleyball
    weightlifting wrestling
  `,

  Objects: `
    backpack basket bed bell blanket board book bottle bowl
    box bracelet broom brush bucket button cabinet calculator
    calendar camera candle carpet cart chair clock comb
    computer cooker cup curtain cushion desk diary door
    drawer drill envelope eraser fan fork frame fridge
    glass hammer hanger helmet kettle key keyboard knife
    ladder lamp laptop lock machine marker mirror mug
    notebook oven paintbrush pan paper pencil phone pillow
    plate radio remote ruler scissors shelf shoe socket
    sofa spoon stapler table tablet telephone television
    toothbrush towel umbrella vase wallet watch wheel
    window
  `,

  Clothing: `
    apron belt blazer blouse boots bra cap cardigan coat
    dress gloves gown hat hoodie jacket jeans jersey
    jumpsuit leggings mittens overalls pajamas pants
    polo poncho raincoat robe sandals scarf shirt shoes
    shorts skirt slippers socks suit sweater sweatshirt
    swimsuit tie trousers tunic underwear vest waistcoat
  `,
} as const;

export type Category = keyof typeof banks;

export const CATEGORIES =
  Object.keys(banks) as Category[];

export const CATEGORY_WORDS = Object.fromEntries(
  CATEGORIES.map(category => [
    category,
    [...new Set(
      banks[category].trim().split(/\s+/),
    )],
  ]),
) as Record<Category, string[]>;

export function isCategoryWord(
  word: string,
  category: Category,
): boolean {
  return CATEGORY_WORDS[category]?.includes(word)
    ?? false;
}

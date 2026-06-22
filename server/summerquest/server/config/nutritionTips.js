// Summer Quest — Nutrition Tips
// Read-only content. No logging, no calorie/weight data — see spec section 8.8.

export const NUTRITION_TIPS = [
  { title: 'Stay topped up', body: 'Water helps your legs feel ready for training.', category: 'hydration', sortOrder: 1 },
  { title: 'Sip, don\u2019t gulp', body: 'Bring a bottle and take small sips regularly during activity.', category: 'hydration', sortOrder: 2 },
  { title: 'Energy before training', body: 'Before training, a banana or toast with honey can give you energy.', category: 'before_training', sortOrder: 3 },
  { title: 'Simple snacks work best', body: 'Cereal or toast an hour before training is a great choice.', category: 'before_training', sortOrder: 4 },
  { title: 'Refuel after', body: 'After training, try a snack with protein and carbs \u2014 like milk or a sandwich.', category: 'after_training', sortOrder: 5 },
  { title: 'Yogurt and fruit', body: 'Yogurt with fruit is a great recovery snack after a session.', category: 'after_training', sortOrder: 6 },
  { title: 'Balance every day', body: 'Protein, carbohydrates, fruit and veg, and water every day help you train and grow.', category: 'everyday', sortOrder: 7 },
  { title: 'Energy drinks are not for kids', body: 'Energy drinks are not for children \u2014 water is always the best choice.', category: 'everyday', sortOrder: 8 },
  { title: 'Rest helps too', body: 'Rest and sleep help you improve just as much as training does.', category: 'everyday', sortOrder: 9 },
  { title: 'Encourage, don\u2019t pressure', body: 'Support healthy habits without pressure \u2014 involve your child in meal prep where you can.', category: 'parent_tip', sortOrder: 10 },
  { title: 'Water as default', body: 'Keep water as the default drink at home and on the sideline.', category: 'parent_tip', sortOrder: 11 },
];

export const NUTRITION_PAGE_SECTIONS = {
  foodsToLimit: [
    'Sugary or fizzy drinks',
    'Sweets and chocolate',
    'Crisps and processed snacks',
    'Fast food',
    'Energy drinks',
  ],
};

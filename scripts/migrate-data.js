import { ingredients, cocktails } from '../src/data/mockData.js';

const CATEGORY_MAP = {
  '基酒': 'Base Spirit',
  '利口酒': 'Liqueur',
  '果汁': 'Juice',
  '糖浆': 'Syrup',
  '汽水': 'Soda',
  '装饰': 'Garnish',
  '其他': 'Other',
  '自定义': 'Other',
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function transformIngredient(ing) {
  return {
    id: ing.id,
    name: ing.name,
    name_en: ing.nameEn || ing.name,
    category: CATEGORY_MAP[ing.category] || 'Other',
    icon: ing.icon,
    description: null,
    aliases: [ing.name, ing.nameEn || ing.name].filter(Boolean),
    abv: ing.category === '基酒' ? 40.0 : null,
  };
}

function transformCocktail(cocktail) {
  const difficultyMap = {
    '⭐': 'Easy',
    '⭐⭐': 'Easy',
    '⭐⭐⭐': 'Medium',
    '⭐⭐⭐⭐': 'Hard',
  };

  return {
    id: cocktail.id,
    name: cocktail.name,
    name_en: cocktail.nameEn,
    description: cocktail.story,
    story: cocktail.story,
    difficulty: difficultyMap[cocktail.difficulty] || 'Easy',
    glass_type: cocktail.tools?.[0] || null,
    preparation_method: inferMethod(cocktail),
    image_url: cocktail.image,
    video_url: null,
    tags: generateTags(cocktail),
    is_verified: true,
    is_featured: false,
  };
}

function transformCocktailIngredients(cocktailId, cocktailIngredients) {
  return cocktailIngredients.map(ing => ({
    cocktail_id: cocktailId,
    ingredient_id: ing.id,
    amount: ing.amount,
    unit: extractUnit(ing.amount),
    is_optional: false,
  }));
}

function transformSteps(cocktailId, steps) {
  return steps.map((step, idx) => ({
    id: generateUUID(),
    cocktail_id: cocktailId,
    step_number: idx + 1,
    instruction: step,
    image_url: null,
  }));
}

function extractUnit(amount) {
  if (!amount) return 'ml';
  if (amount.includes('ml')) return 'ml';
  if (amount.includes('oz')) return 'oz';
  if (amount.includes('dash')) return 'dash';
  if (amount.includes('片') || amount.includes('颗')) return 'piece';
  if (amount.includes('补满')) return 'top';
  return 'ml';
}

function inferMethod(cocktail) {
  const steps = cocktail.steps || [];
  const stepText = steps.join('').toLowerCase();
  
  if (stepText.includes('摇匀') || stepText.includes('摇壶')) return 'Shake';
  if (stepText.includes('搅拌') && stepText.includes('调酒杯')) return 'Stir';
  if (stepText.includes('搅拌机') || stepText.includes('blend')) return 'Blend';
  if (stepText.includes('捣压') || stepText.includes('muddle')) return 'Muddle';
  if (stepText.includes('倒入') || stepText.includes('补满')) return 'Build';
  
  return 'Build';
}

function generateTags(cocktail) {
  const tags = [];
  
  if (cocktail.nameEn) {
    if (cocktail.nameEn.toLowerCase().includes('sour')) tags.push('sour');
    if (cocktail.nameEn.toLowerCase().includes('martini')) tags.push('martini');
    if (cocktail.nameEn.toLowerCase().includes('mojito')) tags.push('mojito');
    if (cocktail.nameEn.toLowerCase().includes('margarita')) tags.push('margarita');
  }
  
  if (cocktail.difficulty.includes('⭐')) {
    tags.push(cocktail.difficulty === '⭐' ? 'easy' : cocktail.difficulty === '⭐⭐⭐' ? 'hard' : 'medium');
  }
  
  return tags;
}

function generateMigration() {
  console.log('Generating migration SQL...\n');

  const ingredientsSQL = ingredients.map(ing => {
    const data = transformIngredient(ing);
    return `('${data.id}', '${data.name}', '${data.name_en}', '${data.category}', '${data.icon}', '${JSON.stringify(data.aliases).replace(/'/g, "''")}'${data.abv ? `, ${data.abv}` : ', NULL'})`;
  }).join(',\n  ');

  console.log('-- Ingredients');
  console.log(`INSERT INTO ingredients (id, name, name_en, category, icon, aliases, abv) VALUES\n  ${ingredientsSQL};`);
  console.log('\n');

  for (const cocktail of cocktails) {
    const data = transformCocktail(cocktail);
    console.log(`-- Cocktail: ${data.name}`);
    console.log(`INSERT INTO cocktails (id, name, name_en, description, story, difficulty, glass_type, preparation_method, image_url, tags, is_verified) VALUES`);
    console.log(`  ('${data.id}', '${data.name}', '${data.name_en}', ${data.description ? `'${data.description}'` : 'NULL'}, ${data.story ? `'${data.story}'` : 'NULL'}, '${data.difficulty}', ${data.glass_type ? `'${data.glass_type}'` : 'NULL'}, '${data.preparation_method}', '${data.image_url}', '${JSON.stringify(data.tags).replace(/'/g, "''")}', ${data.is_verified});`);
    console.log('');

    const cocktailIngs = transformCocktailIngredients(data.id, cocktail.ingredients);
    if (cocktailIngs.length > 0) {
      const ingValues = cocktailIngs.map(ci => 
        `('${ci.cocktail_id}', '${ci.ingredient_id}', '${ci.amount}', '${ci.unit}', ${ci.is_optional})`
      ).join(',\n  ');
      console.log(`INSERT INTO cocktail_ingredients (cocktail_id, ingredient_id, amount, unit, is_optional) VALUES\n  ${ingValues};`);
      console.log('');
    }

    const steps = transformSteps(data.id, cocktail.steps);
    const stepValues = steps.map(s => 
      `('${s.id}', '${s.cocktail_id}', ${s.step_number}, '${s.instruction.replace(/'/g, "''")}')`
    ).join(',\n  ');
    console.log(`INSERT INTO steps (id, cocktail_id, step_number, instruction) VALUES\n  ${stepValues};`);
    console.log('');
  }

  console.log('-- Tools');
  const allTools = new Set();
  cocktails.forEach(c => {
    (c.tools || []).forEach(t => allTools.add(t));
  });
  
  const toolValues = Array.from(allTools).map(t => 
    `('${generateUUID()}', '${t}', NULL, NULL)`
  ).join(',\n  ');
  console.log(`INSERT INTO tools (id, name, icon, description) VALUES\n  ${toolValues};`);
}

function generateJSON() {
  const data = {
    ingredients: ingredients.map(transformIngredient),
    cocktails: cocktails.map(c => ({
      ...transformCocktail(c),
      ingredients: transformCocktailIngredients(c.id, c.ingredients),
      steps: transformSteps(c.id, c.steps),
    })),
  };

  console.log(JSON.stringify(data, null, 2));
}

if (process.argv.includes('--json')) {
  generateJSON();
} else {
  generateMigration();
}

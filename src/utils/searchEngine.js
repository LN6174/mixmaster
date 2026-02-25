import { ingredients, cocktails } from '../data/mockData';

const WEIGHTS = {
  'Base Spirit': 3.0,
  'Liqueur': 2.0,
  'Juice': 1.5,
  'Syrup': 1.2,
  'Soda': 0.5,
  'Garnish': 0.3,
  'Other': 1.0,
};

const CATEGORY_MAP = {
  '基酒': 'Base Spirit',
  '利口酒': 'Liqueur',
  '果汁': 'Juice',
  '糖浆': 'Syrup',
  '汽水': 'Soda',
  '装饰': 'Garnish',
  '其他': 'Other',
};

export function getIngredientCategory(ingredientId) {
  const ing = ingredients.find(i => i.id === ingredientId);
  if (!ing) return 'Other';
  return CATEGORY_MAP[ing.category] || 'Other';
}

export function calculateMatchScore(cocktailIngredients, userIngredients) {
  const userSet = new Set(userIngredients);
  
  let totalWeight = 0;
  let matchedWeight = 0;
  let matchedCount = 0;
  const missing = [];
  const matched = [];

  for (const ing of cocktailIngredients) {
    const category = getIngredientCategory(ing.id);
    const weight = WEIGHTS[category] || 1.0;
    totalWeight += weight;

    if (userSet.has(ing.id)) {
      matchedWeight += weight;
      matchedCount++;
      matched.push(ing.id);
    } else {
      missing.push(ing.id);
    }
  }

  const coverageRatio = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  const matchRatio = cocktailIngredients.length > 0 ? matchedCount / cocktailIngredients.length : 0;

  return {
    matchedCount,
    missingCount: missing.length,
    matchedWeight,
    totalWeight,
    coverageRatio,
    matchRatio,
    score: coverageRatio * 100,
    missing,
    matched,
    canMake: missing.length === 0,
  };
}

export function searchCocktails(userIngredients, options = {}) {
  const {
    maxMissing = 2,
    sortBy = 'score',
    includeOptional = true,
  } = options;

  if (!userIngredients || userIngredients.length === 0) {
    return cocktails.map(c => ({
      ...c,
      matchedCount: 0,
      missingCount: c.ingredients.length,
      score: 0,
      canMake: false,
      missingIngredients: c.ingredients.map(i => i.id),
      matchedIngredients: [],
    }));
  }

  const results = cocktails.map(cocktail => {
    const cocktailIngredients = includeOptional 
      ? cocktail.ingredients 
      : cocktail.ingredients.filter(i => !i.optional);

    const match = calculateMatchScore(cocktailIngredients, userIngredients);

    return {
      ...cocktail,
      matchedCount: match.matchedCount,
      missingCount: match.missingCount,
      score: match.score,
      canMake: match.canMake,
      missingIngredients: match.missing,
      matchedIngredients: match.matched,
      coverageRatio: match.coverageRatio,
      matchRatio: match.matchRatio,
    };
  });

  let filtered = results;

  if (maxMissing !== Infinity) {
    filtered = results.filter(c => c.missingCount <= maxMissing);
  }

  switch (sortBy) {
    case 'score':
      filtered.sort((a, b) => b.score - a.score);
      break;
    case 'matched':
      filtered.sort((a, b) => b.matchedCount - a.matchedCount);
      break;
    case 'missing':
      filtered.sort((a, b) => a.missingCount - b.missingCount);
      break;
    case 'difficulty':
      const difficultyOrder = { '⭐': 1, '⭐⭐': 2, '⭐⭐⭐': 3, '⭐⭐⭐⭐': 4 };
      filtered.sort((a, b) => 
        (difficultyOrder[a.difficulty] || 2) - (difficultyOrder[b.difficulty] || 2)
      );
      break;
    default:
      filtered.sort((a, b) => b.score - a.score);
  }

  return filtered;
}

export function findSimilarCocktails(cocktailId, limit = 5) {
  const target = cocktails.find(c => c.id === cocktailId);
  if (!target) return [];

  const targetIngredients = target.ingredients.map(i => i.id);
  const targetCategory = getIngredientCategory(targetIngredients[0]);

  const similarities = cocktails
    .filter(c => c.id !== cocktailId)
    .map(cocktail => {
      const cocktailIngredients = cocktail.ingredients.map(i => i.id);
      
      const intersection = targetIngredients.filter(id => 
        cocktailIngredients.includes(id)
      );
      
      const union = [...new Set([...targetIngredients, ...cocktailIngredients])];
      const jaccard = intersection.length / union.length;

      const baseSpiritMatch = getIngredientCategory(cocktailIngredients[0]) === targetCategory;

      return {
        ...cocktail,
        similarity: jaccard * 0.7 + (baseSpiritMatch ? 0.3 : 0),
        sharedIngredients: intersection,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return similarities;
}

export function getShoppingSuggestions(userIngredients, limit = 5) {
  const userSet = new Set(userIngredients);
  
  const ingredientScores = {};

  cocktails.forEach(cocktail => {
    const match = calculateMatchScore(cocktail.ingredients, userIngredients);
    
    if (match.missingCount > 0 && match.missingCount <= 3) {
      cocktail.ingredients.forEach(ing => {
        if (!userSet.has(ing.id)) {
          if (!ingredientScores[ing.id]) {
            ingredientScores[ing.id] = {
              id: ing.id,
              score: 0,
              appearIn: 0,
              priority: 'low',
            };
          }
          ingredientScores[ing.id].score += (3 - match.missingCount) * 10;
          ingredientScores[ing.id].appearIn++;
          
          const category = getIngredientCategory(ing.id);
          if (category === 'Base Spirit') {
            ingredientScores[ing.id].priority = 'high';
          } else if (category === 'Liqueur' && ingredientScores[ing.id].priority !== 'high') {
            ingredientScores[ing.id].priority = 'medium';
          }
        }
      });
    }
  });

  const suggestions = Object.values(ingredientScores)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.score - a.score;
    })
    .slice(0, limit);

  return suggestions;
}

export function filterByBaseSpirit(baseSpirit, userIngredients = []) {
  return searchCocktails(userIngredients).filter(c => {
    if (!baseSpirit) return true;
    const baseIng = c.ingredients[0]?.id;
    return baseIng === baseSpirit;
  });
}

export function filterByDifficulty(difficulty, userIngredients = []) {
  return searchCocktails(userIngredients).filter(c => {
    if (!difficulty) return true;
    return c.difficulty === difficulty;
  });
}

export function quickSearch(query, userIngredients = []) {
  const lowerQuery = query.toLowerCase();
  
  return searchCocktails(userIngredients).filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.nameEn.toLowerCase().includes(lowerQuery) ||
    c.ingredients.some(ing => {
      const ingName = ingredients.find(i => i.id === ing.id)?.name || '';
      const ingNameEn = ingredients.find(i => i.id === ing.id)?.nameEn || '';
      return ingName.toLowerCase().includes(lowerQuery) || 
             ingNameEn.toLowerCase().includes(lowerQuery);
    })
  );
}

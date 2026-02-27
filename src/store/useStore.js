import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cocktails, ingredients } from '../data/mockData';

const CATEGORY_MAP = {
  '基酒': 'Base Spirit',
  '利口酒': 'Liqueur',
  '果汁': 'Juice',
  '糖浆': 'Syrup',
  '汽水': 'Soda',
  '装饰': 'Garnish',
  '其他': 'Other',
};

const getIngredientCategory = (ingredientId) => {
  const ing = ingredients.find(i => i.id === ingredientId);
  if (!ing) return 'Other';
  return CATEGORY_MAP[ing.category] || 'Other';
};

export const useStore = create(
  persist(
    (set, get) => ({
      selectedIngredients: [],
      customIngredients: [],
      favorites: [],
      selectedCocktail: null,
      isModalOpen: false,
      showCabinet: false,
      history: [],
      filters: {
        difficulty: null,
        baseSpirit: null,
      },

  toggleIngredient: (id) => {
    set((state) => {
      const isSelected = state.selectedIngredients.includes(id);
      return {
        selectedIngredients: isSelected
          ? state.selectedIngredients.filter(i => i !== id)
          : [...state.selectedIngredients, id],
      };
    });
  },

  addCustomIngredient: (name) => {
    if (name.trim()) {
      const id = `custom_${Date.now()}`;
      set((state) => ({
        customIngredients: [...state.customIngredients, { id, name, category: '自定义' }],
      }));
    }
  },

  removeCustomIngredient: (id) => {
    set((state) => ({
      customIngredients: state.customIngredients.filter(i => i.id !== id),
    }));
  },

  clearCabinet: () => {
    set({ selectedIngredients: [], customIngredients: [] });
  },

  toggleFavorite: (cocktailId) => {
    set((state) => {
      const isFavorite = state.favorites.includes(cocktailId);
      return {
        favorites: isFavorite
          ? state.favorites.filter(id => id !== cocktailId)
          : [...state.favorites, cocktailId],
      };
    });
  },

  openModal: (cocktail) => {
    set((state) => ({
      selectedCocktail: cocktail,
      isModalOpen: true,
      history: [
        { cocktailId: cocktail.id, viewedAt: new Date().toISOString() },
        ...state.history.filter(h => h.cocktailId !== cocktail.id).slice(0, 49),
      ],
    }));
  },

  closeModal: () => {
    set({ selectedCocktail: null, isModalOpen: false });
  },

  toggleCabinet: () => {
    set((state) => ({ showCabinet: !state.showCabinet }));
  },

  setFilter: (type, value) => {
    set((state) => ({
      filters: { ...state.filters, [type]: value },
    }));
  },

  clearFilters: () => {
    set({ filters: { difficulty: null, baseSpirit: null } });
  },

  getFilteredCocktails: () => {
    const { selectedIngredients, customIngredients, filters } = get();
    const allUserIngredients = [...selectedIngredients, ...customIngredients.map(i => i.name)];
    
    let result = allUserIngredients.length === 0
      ? cocktails
      : cocktails
          .map(cocktail => {
            const cocktailIngredientIds = cocktail.ingredients.map(i => i.id);
            const matched = cocktailIngredientIds.filter(id => 
              selectedIngredients.includes(id)
            ).length;
            const missing = cocktailIngredientIds.filter(id => 
              !selectedIngredients.includes(id)
            );
            
            return {
              ...cocktail,
              matchedCount: matched,
              missingCount: missing.length,
              missingIngredients: missing,
              canMake: missing.length === 0,
            };
          })
          .sort((a, b) => b.matchedCount - a.matchedCount);

    if (filters.difficulty) {
      result = result.filter(c => c.difficulty === filters.difficulty);
    }

    if (filters.baseSpirit) {
      result = result.filter(c => c.ingredients[0]?.id === filters.baseSpirit);
    }

    return result;
  },

  getDailyRecommendations: () => {
    const shuffled = [...cocktails].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  },

  getSimilarCocktails: (cocktailId, limit = 5) => {
    const target = cocktails.find(c => c.id === cocktailId);
    if (!target) return [];

    const targetIngredients = target.ingredients.map(i => i.id);
    const targetCategory = getIngredientCategory(targetIngredients[0]);

    return cocktails
      .filter(c => c.id !== cocktailId)
      .map(cocktail => {
        const cocktailIngredients = cocktail.ingredients.map(i => i.id);
        const intersection = targetIngredients.filter(id => 
          cocktailIngredients.includes(id)
        );
        const union = [...new Set([...targetIngredients, ...cocktailIngredients])];
        const jaccard = union.length > 0 ? intersection.length / union.length : 0;
        const baseSpiritMatch = getIngredientCategory(cocktailIngredients[0]) === targetCategory;

        return {
          ...cocktail,
          similarity: jaccard * 0.7 + (baseSpiritMatch ? 0.3 : 0),
          sharedIngredients: intersection,
        };
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  },

  getShoppingSuggestions: (limit = 5) => {
    const { selectedIngredients } = get();
    const userSet = new Set(selectedIngredients);
    
    const ingredientScores = {};

    cocktails.forEach(cocktail => {
      const cocktailIngredientIds = cocktail.ingredients.map(i => i.id);
      const matched = cocktailIngredientIds.filter(id => userSet.has(id)).length;
      const missing = cocktailIngredientIds.filter(id => !userSet.has(id));

      if (matched > 0 && missing.length > 0 && missing.length <= 3) {
        missing.forEach(ingId => {
          if (!ingredientScores[ingId]) {
            const category = getIngredientCategory(ingId);
            ingredientScores[ingId] = {
              id: ingId,
              score: 0,
              appearIn: 0,
              priority: 'low',
            };
          }
          ingredientScores[ingId].score += (3 - missing.length) * 10;
          ingredientScores[ingId].appearIn++;
          
          const category = getIngredientCategory(ingId);
          if (category === 'Base Spirit') {
            ingredientScores[ingId].priority = 'high';
          } else if (category === 'Liqueur' && ingredientScores[ingId].priority !== 'high') {
            ingredientScores[ingId].priority = 'medium';
          }
        });
      }
    });

    return Object.values(ingredientScores)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.score - a.score;
      })
      .slice(0, limit);
  },

  getHistory: () => {
    const { history } = get();
    return history
      .map(h => {
        const cocktail = cocktails.find(c => c.id === h.cocktailId);
        return cocktail ? { ...cocktail, viewedAt: h.viewedAt } : null;
      })
      .filter(Boolean);
  },
}), {
    name: 'mixmaster-storage',
    partialize: (state) => ({
      selectedIngredients: state.selectedIngredients,
      customIngredients: state.customIngredients,
      favorites: state.favorites,
      history: state.history,
    }),
  })
);

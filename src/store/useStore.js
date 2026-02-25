import { create } from 'zustand';
import { cocktails } from '../data/mockData';

export const useStore = create((set, get) => ({
  selectedIngredients: [],
  customIngredients: [],
  favorites: [],
  selectedCocktail: null,
  isModalOpen: false,
  showCabinet: false,

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
    set({ selectedCocktail: cocktail, isModalOpen: true });
  },

  closeModal: () => {
    set({ selectedCocktail: null, isModalOpen: false });
  },

  toggleCabinet: () => {
    set((state) => ({ showCabinet: !state.showCabinet }));
  },

  getFilteredCocktails: () => {
    const { selectedIngredients, customIngredients } = get();
    const allUserIngredients = [...selectedIngredients, ...customIngredients.map(i => i.name)];
    
    if (allUserIngredients.length === 0) {
      return cocktails;
    }

    return cocktails
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
  },

  getDailyRecommendations: () => {
    const shuffled = [...cocktails].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  },
}));

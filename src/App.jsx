import { useState } from 'react';
import { useStore } from './store/useStore';
import { ingredients, cocktails } from './data/mockData';
import { 
  Search, GlassWater, X, Plus, Trash2, Heart, 
  ChefHat, Clock, Sparkles, ChevronDown, ChevronUp, 
  Shuffle, Scale, Filter, RotateCcw
} from 'lucide-react';
import { getIngredientName } from './data/mockData';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('基酒');
  const [isShaking, setIsShaking] = useState(false);
  
  const {
    selectedIngredients,
    customIngredients,
    favorites,
    showCabinet,
    toggleIngredient,
    addCustomIngredient,
    removeCustomIngredient,
    clearCabinet,
    toggleCabinet,
    toggleFavorite,
    openModal,
    getFilteredCocktails,
    getDailyRecommendations,
    filters,
    setFilter,
    clearFilters,
    getShoppingSuggestions,
  } = useStore();

  const filteredCocktails = getFilteredCocktails().filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const dailyCocktails = getDailyRecommendations();
  
  const categories = [...new Set(ingredients.map(i => i.category))];
  
  const allUserIngredients = [...selectedIngredients, ...customIngredients.map(i => i.id)];

  const handleRandomShake = () => {
    setIsShaking(true);
    setTimeout(() => {
      const randomCocktail = cocktails[Math.floor(Math.random() * cocktails.length)];
      openModal(randomCocktail);
      setIsShaking(false);
    }, 600);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card rounded-b-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-bar-amber rounded-xl flex items-center justify-center glow-amber">
                <GlassWater className="w-6 h-6 text-bar-dark" />
              </div>
              <span className="text-xl font-bold text-bar-amber">MixMaster</span>
            </div>
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="搜索鸡尾酒..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-bar-amber/50"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-bar-amber text-bar-dark' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleCabinet}
              className={`p-2 rounded-xl transition-colors ${showCabinet ? 'bg-bar-amber text-bar-dark' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <GlassWater className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-bar-amber">家里有什么</span>，就调什么
            </h1>
            <p className="text-white/60 text-sm">根据家中现有材料，发现专属鸡尾酒</p>
          </div>

          {/* Random Shake Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={handleRandomShake}
              className={`group relative px-8 py-4 bg-gradient-to-r from-bar-purple via-bar-neon to-bar-purple bg-size-200 hover:bg-pos-100 rounded-2xl transition-all duration-300 ${isShaking ? 'animate-pulse' : ''}`}
            >
              <div className="absolute inset-0 bg-white/10 rounded-2xl blur-lg group-hover:blur-xl transition-all"></div>
              <div className="relative flex items-center gap-3 text-white font-medium">
                <Shuffle className={`w-5 h-5 ${isShaking ? 'animate-spin' : ''}`} />
                <span>随机摇一摇</span>
              </div>
            </button>
          </div>
          
          {/* Daily Recommendations */}
          {allUserIngredients.length === 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-bar-gold" />
                <span className="font-medium">今日推荐</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dailyCocktails.map((cocktail) => (
                  <CocktailCard 
                    key={cocktail.id} 
                    cocktail={cocktail} 
                    onClick={() => openModal(cocktail)}
                    onFavorite={() => toggleFavorite(cocktail.id)}
                    isFavorite={favorites.includes(cocktail.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="glass-card rounded-2xl p-4 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4 text-bar-amber" />
                  筛选
                </h3>
                <button
                  onClick={clearFilters}
                  className="text-xs text-white/50 hover:text-bar-amber flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  重置
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Difficulty Filter */}
                <div>
                  <span className="text-sm text-white/60 mb-2 block">难度</span>
                  <div className="flex flex-wrap gap-2">
                    {['⭐', '⭐⭐', '⭐⭐⭐'].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setFilter('difficulty', filters.difficulty === diff ? null : diff)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          filters.difficulty === diff 
                            ? 'bg-bar-amber text-bar-dark' 
                            : 'bg-white/10 hover:bg-white/20'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Base Spirit Filter */}
                <div>
                  <span className="text-sm text-white/60 mb-2 block">基酒</span>
                  <div className="flex flex-wrap gap-2">
                    {['whiskey', 'vodka', 'gin', 'rum', 'tequila'].map((spirit) => {
                      const ing = ingredients.find(i => i.id === spirit);
                      return (
                        <button
                          key={spirit}
                          onClick={() => setFilter('baseSpirit', filters.baseSpirit === spirit ? null : spirit)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            filters.baseSpirit === spirit 
                              ? 'bg-bar-amber text-bar-dark' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          {ing?.icon} {ing?.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shopping Suggestions */}
          {allUserIngredients.length > 0 && getShoppingSuggestions().length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-bar-neon" />
                <span className="font-medium">购买了这些可以做更多</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {getShoppingSuggestions().map((suggestion) => {
                  const ing = ingredients.find(i => i.id === suggestion.id);
                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => toggleIngredient(suggestion.id)}
                      className="px-3 py-1.5 bg-bar-purple/20 text-bar-purple rounded-lg text-sm hover:bg-bar-purple/30 transition-colors"
                    >
                      {ing?.icon} {ing?.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Ingredient Selector */}
      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card rounded-2xl p-4">
            <h2 className="font-medium mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-bar-amber" />
              选择你有的材料
              {allUserIngredients.length > 0 && (
                <span className="text-xs bg-bar-amber/20 text-bar-amber px-2 py-0.5 rounded-full">
                  {allUserIngredients.length}种
                </span>
              )}
            </h2>
            
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category} className="border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                    className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium">{category}</span>
                    {expandedCategory === category ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  {expandedCategory === category && (
                    <div className="p-3 flex flex-wrap gap-2 bg-black/20">
                      {ingredients
                        .filter(i => i.category === category)
                        .map((ingredient) => (
                          <button
                            key={ingredient.id}
                            onClick={() => toggleIngredient(ingredient.id)}
                            className={`ingredient-tag ${selectedIngredients.includes(ingredient.id) ? 'selected' : ''}`}
                          >
                            <span className="mr-1">{ingredient.icon}</span>
                            {ingredient.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <GlassWater className="w-5 h-5 text-bar-amber" />
            可制作的鸡尾酒
            <span className="text-xs text-white/50">
              ({filteredCocktails.filter(c => c.canMake).length}款可做)
            </span>
          </h2>
          
          {filteredCocktails.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🍸</div>
              <p className="text-white/60">没有找到匹配的鸡尾酒</p>
              <p className="text-sm text-white/40 mt-2">尝试添加更多材料</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCocktails.map((cocktail) => (
                <CocktailCard 
                  key={cocktail.id} 
                  cocktail={cocktail}
                  onClick={() => openModal(cocktail)}
                  onFavorite={() => toggleFavorite(cocktail.id)}
                  isFavorite={favorites.includes(cocktail.id)}
                  showMissing={cocktail.missingCount > 0 && cocktail.missingCount <= 2}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Cabinet Modal */}
      {showCabinet && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="glass-modal rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-medium flex items-center gap-2">
                <GlassWater className="w-5 h-5 text-bar-amber" />
                我的酒柜
              </h2>
              <button onClick={toggleCabinet} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <AddIngredientForm onAdd={addCustomIngredient} />
              
              {allUserIngredients.length === 0 ? (
                <p className="text-center text-white/40 py-8">还没有添加任何材料</p>
              ) : (
                <div className="space-y-2">
                  {selectedIngredients.map(id => {
                    const ing = ingredients.find(i => i.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <span>{ing?.icon}</span>
                          <span>{ing?.name}</span>
                        </div>
                        <button
                          onClick={() => toggleIngredient(id)}
                          className="text-white/40 hover:text-bar-neon"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {customIngredients.map(ing => (
                    <div key={ing.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span>{ing.name}</span>
                      </div>
                      <button
                        onClick={() => removeCustomIngredient(ing.id)}
                        className="text-white/40 hover:text-bar-neon"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {allUserIngredients.length > 0 && (
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={clearCabinet}
                  className="w-full py-3 bg-bar-neon/20 text-bar-neon rounded-xl flex items-center justify-center gap-2 hover:bg-bar-neon/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  清空酒柜
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <CocktailModal />
    </div>
  );
}

function CocktailCard({ cocktail, onClick, onFavorite, isFavorite, showMissing }) {
  return (
    <div className="cocktail-card group" onClick={onClick}>
      <div className="relative h-40 overflow-hidden">
        <img 
          src={cocktail.image} 
          alt={cocktail.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-bar-neon text-bar-neon' : 'text-white'}`} />
        </button>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold">{cocktail.name}</h3>
          <p className="text-xs text-white/60">{cocktail.nameEn}</p>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
          <Clock className="w-3 h-3" />
          <span>{cocktail.difficulty}</span>
        </div>
        {showMissing && cocktail.canMake === false && cocktail.missingCount <= 2 && (
          <div className="text-xs bg-bar-purple/20 text-bar-purple px-2 py-1 rounded-lg">
            仅需购买: {cocktail.missingIngredients?.map(id => getIngredientName(id)).join(', ')}
          </div>
        )}
        {cocktail.canMake && (
          <div className="text-xs bg-bar-amber/20 text-bar-amber px-2 py-1 rounded-lg">
            ✓ 可制作
          </div>
        )}
      </div>
    </div>
  );
}

function AddIngredientForm({ onAdd }) {
  const [name, setName] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="添加自定义材料..."
        className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bar-amber/50"
      />
      <button type="submit" className="p-2 bg-bar-amber text-bar-dark rounded-xl hover:bg-bar-amber/80">
        <Plus className="w-5 h-5" />
      </button>
    </form>
  );
}

function CocktailModal() {
  const { isModalOpen, selectedCocktail, closeModal, toggleFavorite, favorites, getSimilarCocktails } = useStore();
  const [useMetric, setUseMetric] = useState(false);
  
  if (!isModalOpen || !selectedCocktail) return null;
  
  const isFavorite = favorites.includes(selectedCocktail.id);
  const similarCocktails = getSimilarCocktails(selectedCocktail.id, 3);

  const convertAmount = (amount) => {
    if (!useMetric) return amount;
    
    const ozMatch = amount.match(/(\d+(?:\.\d+)?)\s*oz/);
    if (ozMatch) {
      const ml = Math.round(parseFloat(ozMatch[1]) * 29.5735);
      return amount.replace(ozMatch[0], `${ml}ml`);
    }
    
    const mlMatch = amount.match(/(\d+(?:\.\d+)?)\s*ml/);
    if (mlMatch) {
      const oz = (parseFloat(mlMatch[1]) / 29.5735).toFixed(1);
      return amount.replace(mlMatch[0], `${oz}oz`);
    }
    
    return amount;
  };
  
  return (
    <div className="modal-overlay animate-fade-in" onClick={closeModal}>
      <div className="modal-content glass-modal" onClick={e => e.stopPropagation()}>
        <div className="relative h-64">
          <img 
            src={selectedCocktail.image} 
            alt={selectedCocktail.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f1a] via-transparent to-transparent" />
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/30 backdrop-blur-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 -mt-16 relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedCocktail.name}</h2>
              <p className="text-white/50">{selectedCocktail.nameEn}</p>
            </div>
            <button
              onClick={() => toggleFavorite(selectedCocktail.id)}
              className={`p-3 rounded-xl transition-colors ${isFavorite ? 'bg-bar-neon text-white' : 'bg-white/10 hover:bg-white/20'}`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          <p className="text-white/70 mb-6">{selectedCocktail.story}</p>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-bar-amber" />
                配方
              </h3>
              <button
                onClick={() => setUseMetric(!useMetric)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${useMetric ? 'bg-bar-amber text-bar-dark' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                <Scale className="w-3 h-3" />
                {useMetric ? '公制 (ml)' : '美制 (oz)'}
              </button>
            </div>
            <div className="space-y-2">
              {selectedCocktail.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                  <span>{getIngredientName(ing.id)}</span>
                  <span className="text-bar-amber font-medium">{convertAmount(ing.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-bar-amber" />
              步骤
            </h3>
            <ol className="space-y-3">
              {selectedCocktail.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-bar-amber/20 text-bar-amber flex items-center justify-center text-sm flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-white/70">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium mb-3">工具需求</h3>
            <div className="flex flex-wrap gap-2">
              {selectedCocktail.tools.map((tool, idx) => (
                <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-sm">
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Similar Cocktails */}
          {similarCocktails.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-bar-neon" />
                相似推荐
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {similarCocktails.map((cocktail) => (
                  <div
                    key={cocktail.id}
                    onClick={() => {
                      closeModal();
                      setTimeout(() => openModal(cocktail), 100);
                    }}
                    className="cursor-pointer"
                  >
                    <img
                      src={cocktail.image}
                      alt={cocktail.name}
                      className="w-full h-16 object-cover rounded-lg mb-1"
                    />
                    <p className="text-xs text-center truncate">{cocktail.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

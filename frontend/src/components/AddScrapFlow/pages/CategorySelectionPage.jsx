import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import plasticImage from '../../../assets/plastic.jpg';
import metalImage from '../../../assets/metal.jpg';
import scrapImage2 from '../../../modules/user/assets/scrab.png';
import electronicImage from '../../../modules/user/assets/electronicbg.png';

import { publicAPI } from '../../../modules/shared/utils/api';
import { getEffectivePriceFeed } from '../../../modules/shared/utils/priceFeedUtils';
import { usePageTranslation } from '../../../hooks/usePageTranslation';

const CategorySelectionPage = () => {
  const staticTexts = [
    "Select Scrap Category",
    "Step 1 of 4",
    "Continue with",
    "Category",
    "Categories",
    "Selected:",
    "Select one or more categories to continue",
    "kg",
    "Plastic",
    "Metal",
    "Paper",
    "Electronics",
    "Copper",
    "Aluminium",
    "Steel",
    "Brass"
  ];
  const { getTranslatedText } = usePageTranslation(staticTexts);
  const navigate = useNavigate();
  const location = useLocation();
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to get image based on category name
  const getCategoryImage = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('plastic')) return plasticImage;
    if (lowerName.includes('metal') || lowerName.includes('iron') || lowerName.includes('steel') || lowerName.includes('copper') || lowerName.includes('brass') || lowerName.includes('aluminium') || lowerName.includes('gold') || lowerName.includes('silver')) return metalImage;
    if (lowerName.includes('paper') || lowerName.includes('book') || lowerName.includes('cardboard') || lowerName.includes('newspaper')) return scrapImage2;
    if (lowerName.includes('electron') || lowerName.includes('device') || lowerName.includes('computer') || lowerName.includes('phone') || lowerName.includes('wire')) return electronicImage;
    if (lowerName.includes('glass')) return scrapImage2; // Use a default or specific if available
    return scrapImage2; // Default fallback
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        // Try to fetch from API first
        const response = await publicAPI.getPrices();

        if (response.success && response.data?.prices && response.data.prices.length > 0) {
          const mappedCategories = response.data.prices.map(price => ({
            id: price.category.toLowerCase().replace(/\s+/g, '-'),
            name: price.category.charAt(0).toUpperCase() + price.category.slice(1).toLowerCase(),
            image: price.image || getCategoryImage(price.category),
            price: price.pricePerKg
          }));
          setCategories(mappedCategories);
        } else {
          throw new Error('No prices from API');
        }
      } catch (error) {
        console.error('Failed to fetch categories from API, using default:', error);
        // Fallback to local default feed
        const defaultFeed = getEffectivePriceFeed();
        const mappedCategories = defaultFeed.map(item => ({
          id: item.category.toLowerCase().replace(/\s+/g, '-'),
          name: item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase(),
          image: getCategoryImage(item.category),
          price: item.pricePerKg
        }));
        setCategories(mappedCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Auto-select category if coming from AllCategoriesPage
  useEffect(() => {
    const preSelectedCategoryName = location.state?.preSelectedCategory;
    if (preSelectedCategoryName && categories.length > 0) {
      const categoryToSelect = categories.find(
        cat => cat.name.toLowerCase() === preSelectedCategoryName.toLowerCase()
      );
      if (categoryToSelect && selectedCategories.length === 0) {
        setSelectedCategories([categoryToSelect]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, categories]);

  const handleCategoryClick = (category) => {
    setSelectedCategories(prev => {
      // Toggle selection: if already selected, remove it; otherwise add it
      const isSelected = prev.some(cat => cat.id === category.id);
      if (isSelected) {
        return prev.filter(cat => cat.id !== category.id);
      } else {
        return [...prev, category];
      }
    });
  };

  const handleContinue = () => {
    if (selectedCategories.length > 0) {
      // Store selected categories in sessionStorage for next step
      sessionStorage.setItem('selectedCategories', JSON.stringify(selectedCategories));
      // Navigate to next step (will be Stage 2: Image Upload)
      navigate('/add-scrap/upload');
    }
  };

  const isCategorySelected = (categoryId) => {
    return selectedCategories.some(cat => cat.id === categoryId);
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ backgroundColor: '#f0f9ff' }}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b shadow-sm" style={{ borderColor: '#e0f2fe', backgroundColor: '#ffffff' }}>
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          style={{ backgroundColor: '#ffffff', border: '1.5px solid #e0f2fe' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#000000' }}>
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h2
          className="text-lg md:text-xl font-bold"
          style={{ color: '#1e293b' }}
        >
          {getTranslatedText("Select Scrap Category")}
        </h2>
        <div className="w-9"></div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="px-3 md:px-4 pt-3 bg-white">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#e0f2fe' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ backgroundColor: '#0ea5e9', width: '25%' }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: '#1e293b' }}>{getTranslatedText("Step 1 of 4")}</span>
        </div>
      </div>

      {/* Optimized Categories Grid */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-6">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {categories.map((category, index) => (
            <div
              key={category.id}
              onClick={() => handleCategoryClick(category)}
              className="cursor-pointer flex flex-col items-center"
            >
              {/* Compact Circular Image */}
              <div
                className="relative w-16 h-16 md:w-18 md:h-18 lg:w-20 lg:h-20 rounded-full overflow-hidden shadow-md hover:shadow-lg transition-all duration-200"
                style={{
                  border: isCategorySelected(category.id) ? '2.5px solid #0ea5e9' : '1.5px solid #e0f2fe',
                  backgroundColor: 'white'
                }}
              >
                <img
                  src={category.image}
                  alt={getTranslatedText(category.name)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isCategorySelected(category.id) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(14, 165, 233, 0.25)' }}
                  >
                    <div
                      className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: '#0ea5e9' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white md:w-5 md:h-5">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Category Info */}
              <div className="mt-1.5 md:mt-2 text-center">
                <p
                  className="text-xs md:text-sm font-bold mb-0.5 truncate max-w-full"
                  style={{ color: '#1e293b' }}
                >
                  {getTranslatedText(category.name)}
                </p>
                <p
                  className="text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded-md inline-block"
                  style={{ 
                    color: '#000000',
                    backgroundColor: '#f1f5f9'
                  }}
                >
                  ₹{category.price}/{getTranslatedText("kg")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compact Footer */}
      <div
        className="fixed md:relative bottom-0 left-0 right-0 p-3 md:p-4 border-t z-50 shadow-lg"
        style={{
          borderColor: '#e0f2fe',
          backgroundColor: '#ffffff'
        }}
      >
        {selectedCategories.length > 0 ? (
          <div>
            <button
              onClick={handleContinue}
              className="w-full py-2.5 md:py-3 rounded-full text-white font-bold text-sm md:text-base shadow-lg hover:shadow-xl transition-shadow duration-200"
              style={{ backgroundColor: '#0ea5e9' }}
            >
              {getTranslatedText("Continue with")} {selectedCategories.length} {selectedCategories.length === 1 ? getTranslatedText("Category") : getTranslatedText("Categories")}
            </button>
            <p
              className="text-xs text-center mt-1.5 font-semibold truncate"
              style={{ color: '#1e293b' }}
            >
              {getTranslatedText("Selected:")} {selectedCategories.map(cat => getTranslatedText(cat.name)).join(', ')}
            </p>
          </div>
        ) : (
          <p
            className="text-xs text-center font-semibold"
            style={{ color: '#64748b' }}
          >
            {getTranslatedText("Select one or more categories to continue")}
          </p>
        )}
      </div>
    </div>
  );
};

export default CategorySelectionPage;



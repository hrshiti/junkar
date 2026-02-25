import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import plasticImage from '../../../modules/user/assets/plastic.jpg';
import metalImage from '../../../modules/user/assets/metal1.jpg';
import copperImage from '../../../modules/user/assets/metal.jpg';
import aluminiumImage from '../../../modules/user/assets/Aluminium.jpg';
import brassImage from '../../../modules/user/assets/brass.jpg';
import steelImage from '../../../modules/user/assets/metal2.jpg';
import scrapImage2 from '../../../modules/user/assets/scrab.png';
import electronicImage from '../../../modules/user/assets/electronicbg.png';

import { publicAPI } from '../../../modules/shared/utils/api';
import { getEffectivePriceFeed } from '../../../modules/shared/utils/priceFeedUtils';
import { usePageTranslation } from '../../../hooks/usePageTranslation';

const CategorySelectionPage = () => {
  const staticTexts = [
    "Select Scrap Category",
    "Step 1 of 5",
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

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);

      // 1. Start with the fixed 8 static categories
      const staticCategories = [
        { id: 'plastic', name: 'Plastic', image: plasticImage, price: 45 },
        { id: 'metal', name: 'Metal', image: metalImage, price: 180 },
        { id: 'paper', name: 'Paper', image: scrapImage2, price: 12 },
        { id: 'electronics', name: 'Electronics', image: electronicImage, price: 85 },
        { id: 'copper', name: 'Copper', image: copperImage, price: 650 },
        { id: 'aluminium', name: 'Aluminium', image: aluminiumImage, price: 180 },
        { id: 'steel', name: 'Steel', image: steelImage, price: 35 },
        { id: 'brass', name: 'Brass', image: brassImage, price: 420 },
      ];

      try {
        // 2. Fetch latest prices from API
        const response = await publicAPI.getPrices();

        if (response.success && response.data?.prices) {
          // 3. Create a map for easy lookup
          const apiPrices = {};
          response.data.prices.forEach(p => {
            apiPrices[p.category.toLowerCase()] = p.pricePerKg;
          });

          // 4. Update only the prices in our static list
          const updatedCategories = staticCategories.map(cat => ({
            ...cat,
            price: apiPrices[cat.name.toLowerCase()] !== undefined
              ? apiPrices[cat.name.toLowerCase()]
              : cat.price
          }));

          setCategories(updatedCategories);
        } else {
          setCategories(staticCategories);
        }
      } catch (error) {
        console.error('Failed to fetch prices from API, using defaults:', error);
        setCategories(staticCategories);
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

  // Optimized Categories Grid
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  const subCategoriesMap = {
    'electronics': [
      { id: 'elec_comp', name: 'Computer Items', image: electronicImage, price: 85 },
      { id: 'elec_mob', name: 'Laptops/Mobiles', image: electronicImage, price: 150 },
      { id: 'elec_mb', name: 'Motherboard', image: electronicImage, price: 400 },
      { id: 'elec_cable', name: 'Cables/Wires', image: electronicImage, price: 80 },
      { id: 'elec_batt', name: 'Batteries', image: electronicImage, price: 60 },
      { id: 'elec_other', name: 'Other Electronics', image: electronicImage, price: 50 },
    ]
  };

  const currentLevelCategories = expandedCategoryId
    ? subCategoriesMap[expandedCategoryId] || []
    : categories;

  const handleCategoryClick = (category) => {
    // If it's a main category that has subcategories, drill down
    if (!expandedCategoryId && subCategoriesMap[category.id]) {
      setExpandedCategoryId(category.id);
      return;
    }

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
      navigate('/add-scrap/weight');
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
          onClick={() => expandedCategoryId ? setExpandedCategoryId(null) : navigate('/')}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
          style={{ backgroundColor: '#ffffff', border: '1.5px solid #e0f2fe' }}
        >
          {expandedCategoryId ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#000000' }}>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#000000' }}>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
        <h2
          className="text-lg md:text-xl font-bold"
          style={{ color: '#1e293b' }}
        >
          {expandedCategoryId
            ? getTranslatedText(categories.find(c => c.id === expandedCategoryId)?.name || "Sub Categories")
            : getTranslatedText("Select Scrap Category")}
        </h2>
        <div className="w-9"></div>
      </div>

      {/* Compact Progress Indicator */}
      <div className="px-3 md:px-4 pt-3 bg-white">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#e0f2fe' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '20%' }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: '#0ea5e9' }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: '#1e293b' }}>{getTranslatedText("Step 1 of 5")}</span>
        </div>
      </div>

      {/* Optimized Categories Grid */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 pb-24 md:pb-6">
        {expandedCategoryId && (
          <p className="text-xs font-bold mb-3 text-sky-600 flex items-center gap-1" onClick={() => setExpandedCategoryId(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to All Categories
          </p>
        )}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {currentLevelCategories.map((category, index) => (
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
                {!expandedCategoryId && subCategoriesMap[category.id] && (
                  <div
                    className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: '#0ea5e9' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
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



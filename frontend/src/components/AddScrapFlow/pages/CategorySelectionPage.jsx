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
import woodTableImage from '../../../modules/user/assets/wooditem/table.jpg';
import woodChairImage from '../../../modules/user/assets/wooditem/chair.jpg';
import woodBedImage from '../../../modules/user/assets/wooditem/Beds.jpg';
import woodOtherImage from '../../../modules/user/assets/wooditem/other_furniture.jpg';
import woodAnotherImage from '../../../modules/user/assets/wooditem/wood_another.jpg';
import v2WheelerImage from '../../../modules/user/assets/vehicle_categry/2 wheecle.png';
import v4WheelerImage from '../../../modules/user/assets/vehicle_categry/4 wheecle.jpg';
import vAutoPartsImage from '../../../modules/user/assets/vehicle_categry/autoparts.png';
import vTyreImage from '../../../modules/user/assets/vehicle_categry/tyre.jpg';
import vBatteryImage from '../../../modules/user/assets/vehicle_categry/baterry.jpg';
import vOtherVehicleImage from '../../../modules/user/assets/vehicle_categry/other_vehical_parts.jpg';
import hACImage from '../../../modules/user/assets/home_appliance/Ac.jpg';
import hFridgeImage from '../../../modules/user/assets/home_appliance/Fridge.jpg';
import hWMImage from '../../../modules/user/assets/home_appliance/washing_machine.jpg';
import hTVImage from '../../../modules/user/assets/home_appliance/TV.jpg';
import hMicroImage from '../../../modules/user/assets/home_appliance/Microwave.jpg';
import hOtherApplianceImage from '../../../modules/user/assets/home_appliance/other.jpg';
import eBatteryImage from '../../../modules/user/assets/e-waste/battery.png';
import eCablesImage from '../../../modules/user/assets/e-waste/cables.png';
import eComputerImage from '../../../modules/user/assets/e-waste/computer.png';
import eLaptopImage from '../../../modules/user/assets/e-waste/laptop.png';
import eMotherboardImage from '../../../modules/user/assets/e-waste/motherboar.png';
import eOtherEWasteImage from '../../../modules/user/assets/e-waste/other_e-waste.png';





import { publicAPI } from '../../../modules/shared/utils/api';
import { getEffectivePriceFeed, NEGOTIABLE_CATEGORIES } from '../../../modules/shared/utils/priceFeedUtils';
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
    "Copper",
    "Aluminium",
    "Steel",
    "Brass",
    "E-Waste",
    "Scrap Iron",
    "Raddi",
    "Furniture",
    "Vehicle Scrap",
    "Home Appliance",
    "Table",
    "Chair",
    "Sofa",
    "Bed",
    "Wooden Items",
    "Other Furniture",
    "AC",
    "Fridge",
    "Washing Machine",
    "TV",
    "Microwave",
    "Other Appliance",
    "2-Wheeler",
    "4-Wheeler",
    "Auto Parts",
    "Tyre",
    "Battery",
    "Other Vehicle Parts"
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

      // 1. Start with the fixed 14 static categories
      const staticCategories = [
        { id: 'plastic', name: 'Plastic', image: plasticImage, price: 45, pricingType: 'kg_based' },
        { id: 'metal', name: 'Metal', image: metalImage, price: 180, pricingType: 'kg_based' },
        { id: 'paper', name: 'Paper', image: scrapImage2, price: 12, pricingType: 'kg_based' },
        { id: 'copper', name: 'Copper', image: copperImage, price: 650, pricingType: 'kg_based' },
        { id: 'aluminium', name: 'Aluminium', image: aluminiumImage, price: 180, pricingType: 'kg_based' },
        { id: 'steel', name: 'Steel', image: steelImage, price: 35, pricingType: 'kg_based' },
        { id: 'brass', name: 'Brass', image: brassImage, price: 420, pricingType: 'kg_based' },
        { id: 'e_waste', name: 'E-Waste', image: electronicImage, price: 100, pricingType: 'negotiable' },
        { id: 'scrap_iron', name: 'Scrap Iron', image: steelImage, price: 30, pricingType: 'kg_based' },
        { id: 'raddi', name: 'Raddi', image: scrapImage2, price: 8, pricingType: 'kg_based' },
        { id: 'furniture', name: 'Furniture', image: scrapImage2, price: 15, pricingType: 'negotiable' },
        { id: 'vehicle_scrap', name: 'Vehicle Scrap', image: steelImage, price: 25, pricingType: 'negotiable' },
        { id: 'home_appliance', name: 'Home Appliance', image: electronicImage, price: 20, pricingType: 'negotiable' },
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

  // Auto-select or expand category if coming from homepage/AllCategoriesPage
  useEffect(() => {
    const preSelectedCategoryName = location.state?.preSelectedCategory;
    if (preSelectedCategoryName && categories.length > 0) {
      const categoryToSelect = categories.find(
        cat => cat.name.toLowerCase() === preSelectedCategoryName.toLowerCase()
      );

      if (categoryToSelect) {
        // If it has subcategories, expand it
        if (subCategoriesMap[categoryToSelect.id]) {
          setExpandedCategoryId(categoryToSelect.id);
        } else if (selectedCategories.length === 0) {
          // Otherwise just select it
          setSelectedCategories([categoryToSelect]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, categories]);

  // Optimized Categories Grid
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  const subCategoriesMap = {
    'e_waste': [
      { id: 'ew_comp', name: 'Computer Items', image: eComputerImage, price: 100, pricingType: 'negotiable' },
      { id: 'ew_mob', name: 'Laptops/Mobiles', image: eLaptopImage, price: 150, pricingType: 'negotiable' },
      { id: 'ew_mb', name: 'Motherboard', image: eMotherboardImage, price: 400, pricingType: 'negotiable' },
      { id: 'ew_cable', name: 'Cables/Wires', image: eCablesImage, price: 80, pricingType: 'negotiable' },
      { id: 'ew_batt', name: 'Batteries', image: eBatteryImage, price: 60, pricingType: 'negotiable' },
      { id: 'ew_other', name: 'Other E-Waste', image: eOtherEWasteImage, price: 50, pricingType: 'negotiable' },
    ],
    'furniture': [
      { id: 'furn_table', name: 'Table', image: woodTableImage, price: 20, pricingType: 'negotiable' },
      { id: 'furn_chair', name: 'Chair', image: woodChairImage, price: 15, pricingType: 'negotiable' },
      { id: 'furn_sofa', name: 'Sofa', image: woodAnotherImage, price: 25, pricingType: 'negotiable' },
      { id: 'furn_bed', name: 'Bed', image: woodBedImage, price: 30, pricingType: 'negotiable' },
      { id: 'furn_wood', name: 'Wooden Items', image: woodAnotherImage, price: 10, pricingType: 'negotiable' },
      { id: 'furn_other', name: 'Other Furniture', image: woodOtherImage, price: 12, pricingType: 'negotiable' },
    ],
    'home_appliance': [
      { id: 'ha_ac', name: 'AC', image: hACImage, price: 35, pricingType: 'negotiable' },
      { id: 'ha_fridge', name: 'Fridge', image: hFridgeImage, price: 30, pricingType: 'negotiable' },
      { id: 'ha_wm', name: 'Washing Machine', image: hWMImage, price: 25, pricingType: 'negotiable' },
      { id: 'ha_tv', name: 'TV', image: hTVImage, price: 20, pricingType: 'negotiable' },
      { id: 'ha_micro', name: 'Microwave', image: hMicroImage, price: 15, pricingType: 'negotiable' },
      { id: 'ha_other', name: 'Other Appliance', image: hOtherApplianceImage, price: 18, pricingType: 'negotiable' },
    ],
    'vehicle_scrap': [
      { id: 'vs_2w', name: '2-Wheeler', image: v2WheelerImage, price: 30, pricingType: 'negotiable' },
      { id: 'vs_4w', name: '4-Wheeler', image: v4WheelerImage, price: 25, pricingType: 'negotiable' },
      { id: 'vs_parts', name: 'Auto Parts', image: vAutoPartsImage, price: 35, pricingType: 'negotiable' },
      { id: 'vs_tyre', name: 'Tyre', image: vTyreImage, price: 10, pricingType: 'negotiable' },
      { id: 'vs_batt', name: 'Battery', image: vBatteryImage, price: 60, pricingType: 'negotiable' },
      { id: 'vs_other', name: 'Other Vehicle Parts', image: vOtherVehicleImage, price: 20, pricingType: 'negotiable' },
    ]
  };

  const currentLevelCategories = expandedCategoryId
    ? subCategoriesMap[expandedCategoryId] || []
    : categories;

  // Modal for "Other" category input
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [otherItemInput, setOtherItemInput] = useState('');
  const [activeOtherCategory, setActiveOtherCategory] = useState(null);

  const handleCategoryClick = (category) => {
    // If it's a main category that has subcategories, drill down
    if (!expandedCategoryId && subCategoriesMap[category.id]) {
      setExpandedCategoryId(category.id);
      return;
    }

    // Check if it's an "Other" category
    if (category.id.endsWith('_other')) {
      setActiveOtherCategory(category);
      setOtherItemInput('');
      setShowOtherModal(true);
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

  const handleOtherSubmit = (e) => {
    e.preventDefault();
    if (otherItemInput.trim()) {
      const customCategory = {
        ...activeOtherCategory,
        name: otherItemInput.trim(), // Replace generic name with user input
        id: `${activeOtherCategory.id}_${Date.now()}` // Unique ID for this specific selection
      };
      setSelectedCategories(prev => [...prev, customCategory]);
      setShowOtherModal(false);
      setActiveOtherCategory(null);
    }
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
    return selectedCategories.some(cat => cat.id === categoryId || (typeof cat.id === 'string' && cat.id.startsWith(categoryId + '_')));
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
          <p className="text-xs font-bold mb-3 text-sky-600 flex items-center gap-1 cursor-pointer" onClick={() => setExpandedCategoryId(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {getTranslatedText("Back to All Categories")}
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
                  className="w-full h-full object-contain p-1"
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
                    color: category.pricingType === 'negotiable' ? '#b45309' : '#000000',
                    backgroundColor: category.pricingType === 'negotiable' ? 'rgba(245,158,11,0.12)' : '#f1f5f9'
                  }}
                >
                  {category.pricingType === 'negotiable'
                    ? '🤝 ' + getTranslatedText('Negotiable')
                    : `₹${category.price}/${getTranslatedText('kg')}`
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* "Other" Item Input Modal */}
      {showOtherModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-800">
                {getTranslatedText("Specify Item")}
              </h3>
              <button onClick={() => setShowOtherModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {getTranslatedText("Please enter the name of the item you want to sell.")}
            </p>

            <form onSubmit={handleOtherSubmit}>
              <input
                autoFocus
                type="text"
                placeholder={getTranslatedText("e.g. Broken Scanner, Iron Chair...")}
                value={otherItemInput}
                onChange={(e) => setOtherItemInput(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-sky-500 focus:outline-none transition-colors text-lg font-medium mb-6"
              />

              <button
                type="submit"
                disabled={!otherItemInput.trim()}
                className="w-full py-4 rounded-2xl bg-sky-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {getTranslatedText("Add Item")}
              </button>
            </form>
          </motion.div>
        </div>
      )}

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
              className="text-xs text-center mt-1.5 font-semibold truncate px-2"
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



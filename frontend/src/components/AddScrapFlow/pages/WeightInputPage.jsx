import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageTranslation } from '../../../hooks/usePageTranslation';
import { ITEM_CONDITIONS, NEGOTIABLE_CATEGORIES } from '../../../modules/shared/utils/priceFeedUtils';

const WeightInputPage = () => {
  const staticTexts = [
    "Enter Weight",
    "Step 1 of 5",
    "Uploaded Images",
    "Auto Detect",
    "Manual Input",
    "Analyzing Images...",
    "Detecting weight from your images",
    "Auto-detected Weight",
    "Based on image analysis",
    "Edit",
    "Click \"Auto Detect\" to analyze your images",
    "Enter Weight (kg)",
    "kg",
    "Quick Select:",
    "Estimated Payout",
    "for",
    "Enter weight to continue",
    "Continue with",
    "Plastic",
    "Metal",
    "Paper",
    "Electronics",
    "Copper",
    "Aluminium",
    "Steel",
    "Brass",
    "Note: The final payout will be determined by the scrap partner after inspection based on the material's quality, quantity, and condition. The displayed amount is only an estimate and may vary.",
    // Model B texts
    "Item Details",
    "Item Condition",
    "Select condition...",
    "Good Condition",
    "Average Condition",
    "Damaged / Broken",
    "Expected Price (₹)",
    "Enter your expected price",
    "Optional - Vendor will send you a quote",
    "Note: For this category, the final price will be decided by the vendor after inspection. Upload clear images for an accurate quote.",
    "Select item condition to continue",
    "Continue",
    "Negotiable",
    "Price decided by vendor",
    "Household",
    "Commercial",
    "Small Quantity",
    "Bulk (>100kg)",
    "Request Type:"
  ];
  const { getTranslatedText } = usePageTranslation(staticTexts);
  const navigate = useNavigate();
  const location = useLocation();
  const [uploadedImages, setUploadedImages] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [weightMode, setWeightMode] = useState('manual');
  const [autoDetectedWeight, setAutoDetectedWeight] = useState(null);
  const [manualWeight, setManualWeight] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [marketPrices, setMarketPrices] = useState({});
  const [estimatedPayout, setEstimatedPayout] = useState(0);
  const [requestType, setRequestType] = useState('household');

  // Model B states
  const [itemCondition, setItemCondition] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');

  // Determine pricing type from selected categories
  const isNegotiable = selectedCategories.some(cat =>
    cat.pricingType === 'negotiable' || NEGOTIABLE_CATEGORIES.includes(cat.id)
  );

  // Load data from sessionStorage
  useEffect(() => {
    const storedImages = sessionStorage.getItem('uploadedImages');
    let storedCategories = sessionStorage.getItem('selectedCategories');

    if (storedImages) {
      setUploadedImages(JSON.parse(storedImages));
    }

    // Check for pre-selected category from navigation state
    if (location.state?.preSelectedCategory) {
      const cat = { id: location.state.preSelectedCategory.toLowerCase(), name: location.state.preSelectedCategory };
      setSelectedCategories([cat]);
      sessionStorage.setItem('selectedCategories', JSON.stringify([cat]));
    } else if (storedCategories) {
      setSelectedCategories(JSON.parse(storedCategories));
    }
  }, [navigate, location.state]);

  // Fetch market prices from backend
  useEffect(() => {
    const fetchMarketPrices = async () => {
      try {
        const { publicAPI } = await import('../../../modules/shared/utils/api');
        const response = await publicAPI.getPrices();

        if (response.success && response.data?.prices) {
          const pricesMap = {};
          response.data.prices.forEach(price => {
            pricesMap[price.category] = price.pricePerKg;
          });
          setMarketPrices(pricesMap);
        } else {
          setMarketPrices({
            'Plastic': 45,
            'Metal': 180,
            'Paper': 12,
            'Electronics': 85,
            'Copper': 650,
            'Aluminium': 180,
            'Steel': 35,
            'Brass': 420,
          });
        }
      } catch (error) {
        console.error('Failed to fetch market prices:', error);
        setMarketPrices({
          'Plastic': 45,
          'Metal': 180,
          'Paper': 12,
          'Electronics': 85,
          'Copper': 650,
          'Aluminium': 180,
          'Steel': 35,
          'Brass': 420,
        });
      }
    };

    fetchMarketPrices();
  }, []);

  // Calculate estimated payout (only for kg_based)
  useEffect(() => {
    if (!isNegotiable && selectedCategories.length > 0) {
      const currentWeight = weightMode === 'auto' && autoDetectedWeight
        ? autoDetectedWeight
        : parseFloat(manualWeight) || 0;

      if (currentWeight > 0) {
        const totalPrice = selectedCategories.reduce((sum, cat) => {
          const apiInfo = marketPrices[cat.name];
          const apiPrice = typeof apiInfo === 'object' ? apiInfo.pricePerKg : (apiInfo || 0);
          const priceToUse = apiPrice || cat.price || 0;
          return sum + priceToUse;
        }, 0);
        const avgPrice = totalPrice / selectedCategories.length;
        const payout = currentWeight * avgPrice;
        setEstimatedPayout(payout);
      } else {
        setEstimatedPayout(0);
      }
    }
  }, [selectedCategories, weightMode, autoDetectedWeight, manualWeight, marketPrices, isNegotiable]);

  const handleWeightChange = (value) => {
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value) || value === '') {
      setManualWeight(value);
    }
  };

  const handleQuickWeight = (weight) => {
    setManualWeight(weight.toString());
    setWeightMode('manual');
  };

  const handleExpectedPriceChange = (value) => {
    const regex = /^\d*$/;
    if (regex.test(value) || value === '') {
      setExpectedPrice(value);
    }
  };

  const handleContinue = () => {
    if (isNegotiable) {
      // Model B: condition is required
      if (!itemCondition) return;

      const weightData = {
        weight: 0,
        mode: 'negotiable',
        estimatedPayout: 0,
        quantityType: requestType === 'commercial' ? 'large' : 'small',
        // Model B specific data
        pricingType: 'negotiable',
        itemCondition,
        expectedPrice: expectedPrice ? parseFloat(expectedPrice) : null,
      };
      sessionStorage.setItem('weightData', JSON.stringify(weightData));
      navigate('/add-scrap/upload');
    } else {
      // Model A: weight is required
      const finalWeight = weightMode === 'auto' && autoDetectedWeight
        ? autoDetectedWeight
        : parseFloat(manualWeight);

      if (finalWeight > 0) {
        const weightData = {
          weight: finalWeight,
          mode: weightMode,
          autoDetected: autoDetectedWeight,
          estimatedPayout: estimatedPayout,
          quantityType: requestType === 'commercial' ? 'large' : 'small',
          pricingType: 'kg_based',
        };
        sessionStorage.setItem('weightData', JSON.stringify(weightData));
        navigate('/add-scrap/upload');
      }
    }
  };

  const currentWeight = weightMode === 'auto' && autoDetectedWeight
    ? autoDetectedWeight
    : parseFloat(manualWeight) || 0;

  const quickWeights = [5, 10, 15, 20, 25, 30];

  // Can continue? depends on model
  const canContinue = isNegotiable ? !!itemCondition : currentWeight > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen w-full flex flex-col"
      style={{ backgroundColor: '#f4ebe2' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-6 border-b" style={{ borderColor: 'rgba(100, 148, 110, 0.2)' }}>
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white transition-colors"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: '#2d3748' }}>
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2
          className="text-lg md:text-2xl font-bold"
          style={{ color: '#2d3748' }}
        >
          {isNegotiable ? getTranslatedText("Item Details") : getTranslatedText("Enter Weight")}
        </h2>
        <div className="w-10"></div>
      </div>

      {/* Progress Indicator */}
      <div className="px-3 md:px-6 pt-3 md:pt-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: 'rgba(100, 148, 110, 0.2)' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '20%' }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: '#38bdf8' }}
            />
          </div>
          <span className="text-xs md:text-sm" style={{ color: '#718096' }}>{getTranslatedText("Step 1 of 5")}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 pb-24 md:pb-6">
        {/* Image Preview */}
        {uploadedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:mb-6"
          >
            <p className="text-xs md:text-sm mb-2" style={{ color: '#718096' }}>
              {getTranslatedText("Uploaded Images")} ({uploadedImages.length})
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {uploadedImages.slice(0, 3).map((image) => (
                <div
                  key={image.id}
                  className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden shadow-md"
                >
                  <img
                    src={image.preview}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {uploadedImages.length > 3 && (
                <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center bg-gray-200">
                  <span className="text-xs md:text-sm font-semibold" style={{ color: '#718096' }}>
                    +{uploadedImages.length - 3}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Request Type Selection */}
        <div className="mb-6">
          <p className="text-xs md:text-sm mb-2" style={{ color: '#718096' }}>
            {getTranslatedText("Request Type:")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setRequestType('household')}
              className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${requestType === 'household'
                ? 'border-sky-600 bg-sky-50 text-sky-700 shadow-md transform scale-[1.02]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200'
                }`}
            >
              <span className="text-2xl">🏠</span>
              <span className="text-sm font-bold">{getTranslatedText("Household")}</span>
              <span className="text-[10px] opacity-75">{getTranslatedText("Small Quantity")}</span>
            </button>

            <button
              onClick={() => setRequestType('commercial')}
              className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${requestType === 'commercial'
                ? 'border-sky-600 bg-sky-50 text-sky-700 shadow-md transform scale-[1.02]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200'
                }`}
            >
              <span className="text-2xl">🏭</span>
              <span className="text-sm font-bold">{getTranslatedText("Commercial")}</span>
              <span className="text-[10px] opacity-75">{getTranslatedText("Bulk (>100kg)")}</span>
            </button>
          </div>
        </div>

        {/* ============== MODEL B: NEGOTIABLE FORM ============== */}
        {isNegotiable ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Negotiable Badge */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <span className="text-xl">🤝</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#b45309' }}>
                  {getTranslatedText("Negotiable")}
                </p>
                <p className="text-xs" style={{ color: '#92400e' }}>
                  {getTranslatedText("Price decided by vendor")}
                </p>
              </div>
            </div>

            {/* Item Condition Dropdown */}
            <div className="rounded-xl p-4 md:p-6" style={{ backgroundColor: '#ffffff' }}>
              <label className="block text-xs md:text-sm font-semibold mb-3" style={{ color: '#2d3748' }}>
                {getTranslatedText("Item Condition")} <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <div className="flex flex-col gap-2">
                {ITEM_CONDITIONS.map((condition) => (
                  <button
                    key={condition.value}
                    onClick={() => setItemCondition(condition.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${itemCondition === condition.value
                        ? 'border-sky-500 bg-sky-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-sky-200'
                      }`}
                  >
                    <span className="text-xl">
                      {condition.value === 'good' ? '✅' : condition.value === 'average' ? '⚠️' : '🔧'}
                    </span>
                    <span className={`text-sm font-semibold ${itemCondition === condition.value ? 'text-sky-700' : 'text-slate-600'
                      }`}>
                      {getTranslatedText(condition.label)}
                    </span>
                    {itemCondition === condition.value && (
                      <svg className="ml-auto w-5 h-5 text-sky-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Expected Price Input (Optional) */}
            <div className="rounded-xl p-4 md:p-6" style={{ backgroundColor: '#ffffff' }}>
              <label className="block text-xs md:text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                {getTranslatedText("Expected Price (₹)")}
              </label>
              <p className="text-xs mb-3" style={{ color: '#a0aec0' }}>
                {getTranslatedText("Optional - Vendor will send you a quote")}
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg md:text-xl font-semibold" style={{ color: '#718096' }}>₹</span>
                <input
                  type="text"
                  value={expectedPrice}
                  onChange={(e) => handleExpectedPriceChange(e.target.value)}
                  placeholder="0"
                  className="w-full py-3 md:py-4 pl-10 pr-4 text-2xl md:text-3xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: expectedPrice ? '#38bdf8' : 'rgba(100, 148, 110, 0.3)',
                    color: '#2d3748',
                    backgroundColor: '#f9f9f9'
                  }}
                />
              </div>
            </div>

            {/* Negotiable Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border-l-4 shadow-sm"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: '#f59e0b'
              }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#4a5568', fontWeight: '500' }}>
                  <span style={{ color: '#b45309', fontWeight: '700' }}>Note:</span> {getTranslatedText("Note: For this category, the final price will be decided by the vendor after inspection. Upload clear images for an accurate quote.")}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          /* ============== MODEL A: KG-BASED FORM (EXISTING) ============== */
          <>
            {/* Manual Input Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 md:mb-6"
            >
              <div className="rounded-xl p-4 md:p-6" style={{ backgroundColor: '#ffffff' }}>
                <label className="block text-xs md:text-sm font-semibold mb-2" style={{ color: '#2d3748' }}>
                  {getTranslatedText("Enter Weight (kg)")}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualWeight}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full py-3 md:py-4 px-4 text-2xl md:text-3xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 transition-all"
                    style={{
                      borderColor: manualWeight ? '#38bdf8' : 'rgba(100, 148, 110, 0.3)',
                      color: '#2d3748',
                      backgroundColor: '#f9f9f9'
                    }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg md:text-xl font-semibold" style={{ color: '#718096' }}>
                    {getTranslatedText("kg")}
                  </span>
                </div>
              </div>

              {/* Quick Weight Buttons */}
              <div className="mt-4">
                <p className="text-xs md:text-sm mb-2" style={{ color: '#718096' }}>
                  {getTranslatedText("Quick Select:")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickWeights.map((weight) => (
                    <button
                      key={weight}
                      onClick={() => handleQuickWeight(weight)}
                      className="px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-300 border-2"
                      style={{
                        borderColor: manualWeight === weight.toString() ? '#38bdf8' : 'rgba(100, 148, 110, 0.3)',
                        backgroundColor: manualWeight === weight.toString() ? '#38bdf8' : 'transparent',
                        color: manualWeight === weight.toString() ? '#ffffff' : '#38bdf8'
                      }}
                      onMouseEnter={(e) => {
                        if (manualWeight !== weight.toString()) {
                          e.target.style.backgroundColor = 'rgba(100, 148, 110, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (manualWeight !== weight.toString()) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {weight} {getTranslatedText("kg")}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Price Calculation Preview */}
            {currentWeight > 0 && selectedCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl p-4 md:p-6 mb-4 md:mb-6"
                style={{ backgroundColor: 'rgba(100, 148, 110, 0.1)' }}
              >
                <p className="text-xs md:text-sm mb-3" style={{ color: '#718096' }}>
                  {getTranslatedText("Estimated Payout")}
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl md:text-3xl font-bold" style={{ color: '#38bdf8' }}>
                    ₹{estimatedPayout.toFixed(0)}
                  </span>
                  <span className="text-sm md:text-base" style={{ color: '#718096' }}>
                    {getTranslatedText("for")} {currentWeight} {getTranslatedText("kg")}
                  </span>
                </div>
                <div className="text-xs md:text-sm" style={{ color: '#718096' }}>
                  {selectedCategories.map((cat, idx) => {
                    const apiInfo = marketPrices[cat.name];
                    const price = (typeof apiInfo === 'object' ? apiInfo.pricePerKg : (apiInfo || 0)) || cat.price || 0;
                    return (
                      <span key={cat.id}>
                        {getTranslatedText(cat.name)} @ ₹{price}/{getTranslatedText("kg")}
                        {idx < selectedCategories.length - 1 && ' • '}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Disclaimer Note */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl border-l-4 shadow-sm"
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                borderColor: '#38bdf8'
              }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
                <p className="text-xs md:text-sm leading-relaxed" style={{ color: '#4a5568', fontWeight: '500' }}>
                  <span style={{ color: '#38bdf8', fontWeight: '700' }}>Note:</span> {getTranslatedText("Note: The final payout will be determined by the scrap partner after inspection based on the material's quality, quantity, and condition. The displayed amount is only an estimate and may vary.")}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Footer with Continue Button - Fixed on Mobile */}
      <div
        className="fixed md:relative bottom-0 left-0 right-0 p-3 md:p-6 border-t z-50"
        style={{
          borderColor: 'rgba(100, 148, 110, 0.2)',
          backgroundColor: '#f4ebe2'
        }}
      >
        {canContinue ? (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleContinue}
            className="w-full py-3 md:py-4 rounded-full text-white font-semibold text-sm md:text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            style={{ backgroundColor: '#38bdf8' }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#5a8263'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#38bdf8'}
          >
            {isNegotiable
              ? getTranslatedText("Continue")
              : `${getTranslatedText("Continue with")} ${currentWeight} ${getTranslatedText("kg")}`
            }
          </motion.button>
        ) : (
          <p
            className="text-xs md:text-sm text-center"
            style={{ color: '#718096' }}
          >
            {isNegotiable
              ? getTranslatedText("Select item condition to continue")
              : getTranslatedText("Enter weight to continue")
            }
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default WeightInputPage;

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import plasticImage from "../assets/plastic.jpg";
import metalImage from "../assets/metal2.jpg";
import copperImage from "../assets/metal.jpg";
import aluminiumImage from "../assets/Aluminium.jpg";
import scrapImage2 from "../assets/scrab.png";
import electronicImage from "../assets/electronicbg.png";

import { useState, useEffect } from "react";
import { publicAPI } from "../../shared/utils/api";
import { getEffectivePriceFeed, PRICE_TYPES } from "../../shared/utils/priceFeedUtils";
import { usePageTranslation } from "../../../hooks/usePageTranslation";
import { useDynamicTranslation } from "../../../hooks/useDynamicTranslation";

const AllCategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const staticTexts = [
    "All Categories",
    "Browse all available scrap categories",
    "Scrap Materials",
    "Sell your {category} scrap",
  ];

  const { getTranslatedText } = usePageTranslation(staticTexts);
  const { translateBatch } = useDynamicTranslation();

  // Helper to get image based on category name
  const getCategoryImage = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("plastic")) return plasticImage;
    if (lowerName.includes("aluminium")) return aluminiumImage;
    if (lowerName.includes("copper")) return copperImage;
    if (
      lowerName.includes("metal") ||
      lowerName.includes("iron") ||
      lowerName.includes("steel") ||
      lowerName.includes("brass")
    )
      return metalImage;
    if (
      lowerName.includes("paper") ||
      lowerName.includes("book") ||
      lowerName.includes("cardboard")
    )
      return scrapImage2;
    if (
      lowerName.includes("electron") ||
      lowerName.includes("device") ||
      lowerName.includes("computer") ||
      lowerName.includes("phone")
    )
      return electronicImage;
    return scrapImage2; // Default fallback
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await publicAPI.getPrices();
        if (
          response.success &&
          response.data?.prices &&
          response.data.prices.length > 0
        ) {
          const allItems = response.data.prices;

          // Filter Materials
          const materialsRaw = allItems.filter(
            (p) => !p.type || p.type === PRICE_TYPES.MATERIAL
          );

          const mappedMaterials = materialsRaw.map((price) => ({
            name: price.category,
            image: price.image || getCategoryImage(price.category),
            // We don't translate here to avoid dependency loops
            type: PRICE_TYPES.MATERIAL,
          }));
          setCategories(mappedMaterials);
        } else {
          throw new Error("No prices from API");
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        // Fallback
        const defaultFeed = getEffectivePriceFeed();
        const mapped = defaultFeed.map((item) => ({
          name: item.category,
          image: getCategoryImage(item.category),
          type: PRICE_TYPES.MATERIAL,
        }));
        setCategories(mapped);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []); // Removed dependency to prevent re-fetching loop

  const handleCategoryClick = (item) => {
    // Navigate to scrap flow
    navigate("/add-scrap/weight", {
      state: { preSelectedCategory: item.name },
    });
  };

  return (
    <div
      className="min-h-screen w-full relative z-0 pb-20 md:pb-0 overflow-x-hidden"
      style={{ background: "linear-gradient(to bottom, #7dd3fc, #e0f2fe)" }}>
      {/* Sticky Header with Back Button */}
      <div
        className="sticky top-0 z-40 px-4 md:px-6 lg:px-8 py-5 md:py-6 backdrop-blur-md"
        style={{ backgroundColor: "rgba(125, 211, 252, 0.9)" }}>
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="p-3 rounded-xl hover:opacity-80 transition-all flex-shrink-0 shadow-lg"
            style={{
              backgroundColor: "#ffffff",
              color: "#0ea5e9",
            }}
            aria-label={getTranslatedText("Go back")}>
            <FaArrowLeft size={20} />
          </button>
          <div>
            <h1
              className="text-xl md:text-2xl font-bold"
              style={{ color: "#ffffff" }}>
              {getTranslatedText("All Categories")}
            </h1>
            <p
              className="text-sm md:text-base mt-0.5"
              style={{ color: "#f1f5f9" }}>
              {getTranslatedText("Browse all available scrap categories")}
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 md:px-6 lg:px-8 max-w-7xl mx-auto pb-8">
        {/* Scrap Materials Section */}
        <div className="mb-8">
          <h2
            className="text-2xl md:text-3xl font-bold mb-5 ml-1"
            style={{ color: "#1e293b" }}>
            {getTranslatedText("Scrap Materials")}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {categories.map((category, index) => (
              <motion.div
                key={`cat-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onClick={() => handleCategoryClick(category)}
                className="cursor-pointer">
                <div
                  className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-sky-100"
                  style={{ backgroundColor: "#ffffff" }}>
                  <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      style={{ display: "block" }}
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3 md:p-4">
                    <p
                      className="text-sm md:text-base font-bold text-center mb-1"
                      style={{ color: "#1e293b" }}>
                      {category.name}
                    </p>
                    <p
                      className="text-xs text-center font-medium"
                      style={{ color: "#64748b" }}>
                      {getTranslatedText("Sell your {category} scrap", {
                        category: category.name,
                      })}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllCategoriesPage;


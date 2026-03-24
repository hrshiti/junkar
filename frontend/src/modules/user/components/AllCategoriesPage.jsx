import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import plasticImage from "../assets/plastic.jpg";
import metalImage from "../assets/metal2.jpg";
import copperImage from "../assets/metal.jpg";
import aluminiumImage from "../assets/Aluminium.jpg";
import scrapImage2 from "../assets/scrab.png";
import electronicImage from "../assets/electronicbg.png";

// Specific Category Images
import vehicleImage from "../assets/vehicle_categry/4 wheecle.jpg";
import furnitureImage from "../assets/wooditem/chair.jpg";
import homeApplianceImage from "../assets/home_appliance/washing_machine.jpg";
import eWasteImage from "../assets/e-waste/motherboar.png";
import paperImage from "../assets/scrap5.png";

// Subcategory Specific Images
import brassImage from "../assets/brass.jpg";
import steelImage from "../assets/metal2.jpg";
import woodTableImage from "../assets/wooditem/table.jpg";
import woodChairImage from "../assets/wooditem/chair.jpg";
import woodBedImage from "../assets/wooditem/Beds.jpg";
import woodAnotherImage from "../assets/wooditem/wood_another.jpg";
import v2WheelerImage from "../assets/vehicle_categry/2 wheecle.png";
import v4WheelerImage from "../assets/vehicle_categry/4 wheecle.jpg";
import vAutoPartsImage from "../assets/vehicle_categry/autoparts.png";
import vTyreImage from "../assets/vehicle_categry/tyre.jpg";
import vBatteryImage from "../assets/vehicle_categry/baterry.jpg";
import hACImage from "../assets/home_appliance/Ac.jpg";
import hFridgeImage from "../assets/home_appliance/Fridge.jpg";
import hWMImage from "../assets/home_appliance/washing_machine.jpg";
import hTVImage from "../assets/home_appliance/TV.jpg";
import hMicroImage from "../assets/home_appliance/Microwave.jpg";
import eBatteryImage from "../assets/e-waste/battery.png";
import eCablesImage from "../assets/e-waste/cables.png";
import eComputerImage from "../assets/e-waste/computer.png";
import eLaptopImage from "../assets/e-waste/laptop.png";
import eMotherboardImage from "../assets/e-waste/motherboar.png";

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
    "Go back"
  ];

  const { getTranslatedText } = usePageTranslation(staticTexts);
  const { translateBatch } = useDynamicTranslation();

  // Helper to get image based on category name
  const getCategoryImage = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("plastic")) return plasticImage;
    if (lowerName.includes("aluminium")) return aluminiumImage;
    if (lowerName.includes("copper")) return copperImage;
    if (lowerName.includes("brass")) return brassImage;
    if (lowerName.includes("steel")) return steelImage;
    if (
      lowerName.includes("iron") ||
      lowerName.includes("metal")
    )
      return metalImage;
    if (
      lowerName.includes("paper") ||
      lowerName.includes("book") ||
      lowerName.includes("cardboard") ||
      lowerName.includes("raddi")
    )
      return scrapImage2;
    
    // E-Waste / Electronics
    if (lowerName.includes("computer")) return eComputerImage;
    if (lowerName.includes("laptop") || lowerName.includes("mobile")) return eLaptopImage;
    if (lowerName.includes("motherboard")) return eMotherboardImage;
    if (lowerName.includes("cable") || lowerName.includes("wire")) return eCablesImage;
    if (lowerName.includes("battery")) return eBatteryImage;
    if (
      lowerName.includes("electron") ||
      lowerName.includes("device") ||
      lowerName.includes("e-waste")
    )
      return eWasteImage;

    // Appliances
    if (lowerName.includes("ac")) return hACImage;
    if (lowerName.includes("fridge")) return hFridgeImage;
    if (lowerName.includes("washing machine")) return hWMImage;
    if (lowerName.includes("tv")) return hTVImage;
    if (lowerName.includes("microwave")) return hMicroImage;
    if (lowerName.includes("appliance")) return homeApplianceImage;

    // Furniture
    if (lowerName.includes("table")) return woodTableImage;
    if (lowerName.includes("chair")) return woodChairImage;
    if (lowerName.includes("bed")) return woodBedImage;
    if (lowerName.includes("sofa")) return woodAnotherImage;
    if (lowerName.includes("furniture") || lowerName.includes("wooden")) return furnitureImage;

    // Vehicle
    if (lowerName.includes("2-wheeler") || lowerName.includes("bike")) return v2WheelerImage;
    if (lowerName.includes("4-wheeler") || lowerName.includes("car")) return v4WheelerImage;
    if (lowerName.includes("tyre")) return vTyreImage;
    if (lowerName.includes("auto parts")) return vAutoPartsImage;
    if (lowerName.includes("vehicle")) return vehicleImage;

    return scrapImage2; // Default fallback
  };

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        // 1. Get default categories
        const defaultFeed = getEffectivePriceFeed();
        const defaultMapped = defaultFeed.map((item) => ({
          name: item.category,
          image: getCategoryImage(item.category),
          type: PRICE_TYPES.MATERIAL,
        }));

        // 2. Try to get categories from API
        const response = await publicAPI.getPrices();
        let finalCategories = [...defaultMapped];

        if (response.success && response.data?.prices) {
          const apiItems = response.data.prices.filter(
            (p) => (!p.type || p.type === PRICE_TYPES.MATERIAL)
          );

          const apiMapped = apiItems.map((price) => ({
            name: price.category,
            image: price.image || getCategoryImage(price.category),
            type: PRICE_TYPES.MATERIAL,
            isActive: price.isActive !== false,
            isNegotiable: price.isNegotiable || false
          }));

          // 3. Merge: prefer API data for items that exist in both
          // If in API and isActive is false, it's hidden.
          // If not in API, it shows by default.
          const merged = [];
          const processedNames = new Set();

          // Process API items first
          apiMapped.forEach(apiItem => {
            if (apiItem.isActive) {
              merged.push(apiItem);
            }
            processedNames.add(apiItem.name.toLowerCase());
          });

          // Add defaults that aren't in API
          defaultMapped.forEach(def => {
            if (!processedNames.has(def.name.toLowerCase())) {
              merged.push(def);
            }
          });

          finalCategories = merged;
        }

        // 4. Define sub-categories for flattening (matching CategorySelectionPage)
        const subCategoriesMap = {
          'e_waste': [
            { name: 'Computer Items', image: eComputerImage, isNegotiable: true },
            { name: 'Laptops/Mobiles', image: eLaptopImage, isNegotiable: true },
            { name: 'Motherboard', image: eMotherboardImage, isNegotiable: true },
            { name: 'Cables/Wires', image: eCablesImage, isNegotiable: true },
            { name: 'Batteries', image: eBatteryImage, isNegotiable: true },
          ],
          'furniture': [
            { name: 'Table', image: woodTableImage, isNegotiable: true },
            { name: 'Chair', image: woodChairImage, isNegotiable: true },
            { name: 'Sofa', image: woodAnotherImage, isNegotiable: true },
            { name: 'Bed', image: woodBedImage, isNegotiable: true },
            { name: 'Wooden Items', image: woodAnotherImage, isNegotiable: true },
          ],
          'home_appliance': [
            { name: 'AC', image: hACImage, isNegotiable: true },
            { name: 'Fridge', image: hFridgeImage, isNegotiable: true },
            { name: 'Washing Machine', image: hWMImage, isNegotiable: true },
            { name: 'TV', image: hTVImage, isNegotiable: true },
            { name: 'Microwave', image: hMicroImage, isNegotiable: true },
          ],
          'vehicle_scrap': [
            { name: '2-Wheeler', image: v2WheelerImage, isNegotiable: true },
            { name: '4-Wheeler', image: v4WheelerImage, isNegotiable: true },
            { name: 'Auto Parts', image: vAutoPartsImage, isNegotiable: true },
            { name: 'Tyre', image: vTyreImage, isNegotiable: true },
            { name: 'Battery', image: vBatteryImage, isNegotiable: true },
          ],
        };

        const flattened = [];
        finalCategories.forEach(cat => {
          flattened.push(cat);
          const key = cat.name.toLowerCase().replace(' ', '_').replace('-', '_');
          if (subCategoriesMap[key]) {
            subCategoriesMap[key].forEach(sub => {
              flattened.push({
                ...sub,
                type: PRICE_TYPES.MATERIAL
              });
            });
          }
        });

        setCategories(flattened);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        // Fallback to defaults only
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
  }, []);

  const handleCategoryClick = (item) => {
    // Navigate to category selection to handle subcategories
    navigate("/user/add-scrap/category", {
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
            onClick={() => navigate("/user")}
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
                      {getTranslatedText(category.name)}
                      {category.isNegotiable && (
                        <div className="mt-1 flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#fef3c7] text-[#92400e] border border-amber-200 w-fit mx-auto">
                          <span className="text-amber-500">💛</span> {getTranslatedText('Negotiable')}
                        </div>
                      )}
                    </p>
                    <p
                      className="text-sm md:text-center font-medium"
                      style={{ color: "#64748b" }}>
                      {getTranslatedText("Sell your {category} scrap", {
                        category: getTranslatedText(category.name),
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


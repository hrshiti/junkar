import { useEffect, useState } from "react";
import { publicAPI } from "../../shared/utils/api";
import { getEffectivePriceFeed } from "../../shared/utils/priceFeedUtils";
import { usePageTranslation } from "../../../hooks/usePageTranslation";
import { useDynamicTranslation } from "../../../hooks/useDynamicTranslation";

const PriceTicker = () => {
  const [prices, setPrices] = useState([]);
  const { getTranslatedText } = usePageTranslation([
    "Price",
    "Source: Admin price feed",
    "No prices found",
    "Failed to fetch live prices, using default:",
  ]);
  const { translate } = useDynamicTranslation();

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await publicAPI.getPrices();
        if (response.success && Array.isArray(response.data?.prices) && response.data.prices.length > 0) {
          const mapped = await Promise.all(
            response.data.prices.map(async (item) => ({
              type: await translate(item.category),
              price: item.pricePerKg,
              unit: "kg",
              change: null,
            }))
          );
          setPrices(mapped);
        } else {
          throw new Error(getTranslatedText("No prices found"));
        }
      } catch (error) {
        console.error(
          getTranslatedText("Failed to fetch live prices, using default:"),
          error
        );
        // Fallback to default
        const feed = getEffectivePriceFeed();
        const mapped = await Promise.all(
          feed.map(async (item) => ({
            type: await translate(item.category),
            price: item.pricePerKg,
            unit: "kg",
            change: null,
          }))
        );
        setPrices(mapped);
      }
    };

    fetchPrices();
  }, [translate]);

  return (
    <div className="mb-6 md:mb-8">
      {/* Header with gradient background */}
      <div className="flex items-center justify-between mb-5 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-sky-400 to-blue-500"></div>
          <h3
            className="text-xl md:text-2xl font-bold"
            style={{ color: "#0f172a" }}>
            {getTranslatedText("Price")}
          </h3>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" 
          style={{ 
            backgroundColor: "#ffffff",
            borderColor: "#e0f2fe",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
          }}>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span 
            className="text-xs font-medium" 
            style={{ color: "#64748b" }}>
            Live Rates
          </span>
        </div>
      </div>

      {/* Horizontal Scrolling Price Cards */}
      <div className="relative -mx-4 md:mx-0">
        <div
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-3 px-4 md:px-0"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}>
          {prices.map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[30%] md:w-48 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
              style={{ backgroundColor: "#f0f9ff" }}>
              {/* Category Name */}
              <p
                className="text-sm md:text-base mb-2 font-semibold"
                style={{ color: "#94a3b8" }}>
                {item.type}
              </p>
              
              {/* Price */}
              <p
                className="text-sm md:text-base font-bold"
                style={{ color: "#1e293b" }}>
                ₹{item.price.toFixed(0)}/{item.unit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceTicker;


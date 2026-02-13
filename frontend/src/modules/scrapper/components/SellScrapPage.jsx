import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { orderAPI, uploadAPI } from '../../shared/utils/api';
import { usePageTranslation } from '../../../hooks/usePageTranslation';

const SellScrapPage = () => {
    const { getTranslatedText } = usePageTranslation(["Sell Bulk Scrap", "Select Categories", "Approx Weight (kg)", "Upload Images", "Pickup Address", "Create Request", "Processing...", "Request Created Successfully!"]);
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [weight, setWeight] = useState('');
    const [images, setImages] = useState([]);
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    // Pre-defined categories matching backend constants
    const availableCategories = [
        { id: 'plastic', name: 'Plastic', icon: '🥤' },
        { id: 'metal', name: 'Metal', icon: '⚙️' },
        { id: 'paper', name: 'Paper', icon: '📄' },
        { id: 'electronic', name: 'Electronics', icon: '🔌' },
        { id: 'other', name: 'Other', icon: '📦' }
    ];

    const handleCategoryToggle = (catId) => {
        if (categories.includes(catId)) {
            setCategories(categories.filter(c => c !== catId));
        } else {
            setCategories([...categories, catId]);
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLoading(true);
        try {
            const response = await uploadAPI.uploadOrderImages(files);
            if (response.success) {
                setImages([...images, ...response.data.files]);
            }
        } catch (error) {
            console.error("Upload failed", error);
            alert("Image upload failed");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (categories.length === 0 || !weight || !address) {
            alert("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                scrapItems: categories.map(cat => ({
                    category: cat,
                    weight: Number(weight) / categories.length, // Distribute weight approx
                    rate: 0,
                    total: 0
                })),
                totalWeight: Number(weight),
                pickupAddress: { street: address }, // Simplified address
                images: images,
                quantityType: 'large', // FORCE LARGE
                notes: 'Scrapper Bulk Request'
            };

            const response = await orderAPI.create(payload);
            if (response.success) {
                alert(getTranslatedText("Request Created Successfully!"));
                navigate('/scrapper/my-active-requests');
            }
        } catch (error) {
            console.error("Creation failed", error);
            alert(error.message || "Failed to create request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 pb-24">
            <header className="mb-6 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm">
                    ⬅️
                </button>
                <h1 className="text-xl font-bold text-slate-800">{getTranslatedText("Sell Bulk Scrap")}</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Categories */}
                <section className="bg-white p-4 rounded-2xl shadow-sm">
                    <h2 className="text-sm font-semibold mb-3 text-slate-700">{getTranslatedText("Select Categories")}</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {availableCategories.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleCategoryToggle(cat.id)}
                                className={`p-3 rounded-xl flex flex-col items-center gap-2 border-2 transition-all ${categories.includes(cat.id)
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-100 bg-slate-50 text-slate-500'
                                    }`}
                            >
                                <span className="text-2xl">{cat.icon}</span>
                                <span className="text-xs font-medium">{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Weight */}
                <section className="bg-white p-4 rounded-2xl shadow-sm">
                    <h2 className="text-sm font-semibold mb-3 text-slate-700">{getTranslatedText("Approx Weight (kg)")}</h2>
                    <input
                        type="number"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 150"
                        className="w-full p-4 text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none"
                    />
                </section>

                {/* Address */}
                <section className="bg-white p-4 rounded-2xl shadow-sm">
                    <h2 className="text-sm font-semibold mb-3 text-slate-700">{getTranslatedText("Pickup Address")}</h2>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter full address..."
                        className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none h-24"
                    />
                </section>

                {/* Images */}
                <section className="bg-white p-4 rounded-2xl shadow-sm">
                    <h2 className="text-sm font-semibold mb-3 text-slate-700">{getTranslatedText("Upload Images")}</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        <label className="w-20 h-20 flex-shrink-0 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-slate-400 cursor-pointer">
                            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
                            <span className="text-2xl">+</span>
                        </label>
                        {images.map((img, idx) => (
                            <img key={idx} src={img.url} alt="preview" className="w-20 h-20 object-cover rounded-xl" />
                        ))}
                    </div>
                </section>

                <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50"
                >
                    {loading ? getTranslatedText("Processing...") : getTranslatedText("Create Request")}
                </motion.button>
            </form>
        </div>
    );
};

export default SellScrapPage;

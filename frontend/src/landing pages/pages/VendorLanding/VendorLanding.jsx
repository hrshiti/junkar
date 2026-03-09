import React from 'react';
import '../../styles/landing-global.css';
import '../../styles/landing-main.css';
import VendorNavbar from '../../components/Vendor/VendorNavbar';
import VendorHero from '../../components/Vendor/VendorHero';
import VendorBenefits from '../../components/Vendor/VendorBenefits';
import VendorHowItWorks from '../../components/Vendor/VendorHowItWorks';
import About from '../../components/About';
import Contact from '../../components/Contact';
import Footer from '../../components/Footer';
import AppSection from '../../components/AppSection';
import { motion } from 'framer-motion';
import { usePageTranslation } from '../../../hooks/usePageTranslation';

const VendorLanding = () => {
    const { getTranslatedText } = usePageTranslation([
        "Ready to Grow Your Business?", "Join 50+ verified vendors already earning with Junkar.",
        "Apply to Become a Vendor"
    ]);

    return (
        <div className="landing-page-container">
            <div className="app-container vendor-theme">
                <VendorNavbar />
                <main>
                    <VendorHero />
                    <VendorHowItWorks />
                    <VendorBenefits />
                    <About />
                    <AppSection />
                    <Contact />

                    {/* CTA Section */}
                    <section className="section" style={{ background: '#10b981', color: 'white', textAlign: 'center' }}>
                        <div className="container">
                            <h2 className="section-title" style={{ color: 'white', marginBottom: '1.5rem' }}>{getTranslatedText("Ready to Grow Your Business?")}</h2>
                            <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem', opacity: 0.9 }}>{getTranslatedText("Join 50+ verified vendors already earning with Junkar.")}</p>
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn"
                                style={{ background: 'white', color: '#10b981', padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 700, borderRadius: '50px' }}
                            >
                                {getTranslatedText("Apply to Become a Vendor")}
                            </motion.button>
                        </div>
                    </section>
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default VendorLanding;

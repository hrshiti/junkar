import React, { useState, useEffect } from 'react';
import { Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const VendorNavbar = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} style={{
            background: 'white',
            borderBottom: '1px solid #f1f5f9',
            position: 'fixed',
            top: 0,
            width: '100%',
            left: 0,
            zIndex: 100,
            transition: 'all 0.3s ease',
            boxShadow: scrolled ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 3rem', width: '100%' }}>
                <Link to="/" className="flex items-center gap-2 cursor-pointer">
                    <img
                        src="/junker.png"
                        alt="Junkar Vendor"
                        style={{ height: '5rem', width: 'auto', objectFit: 'contain', objectPosition: 'left', marginLeft: '-0.5rem' }}
                    />
                </Link>

                <div className="nav-right-section" style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <Link to="/" className="nav-link" style={{ color: '#64748b', fontWeight: 600, fontFamily: 'Poppins' }}>Home</Link>
                        <a href="/vendor#how-it-works" className="nav-link" style={{ color: '#64748b', fontWeight: 600, fontFamily: 'Poppins' }}>Process</a>
                        <a href="/vendor#contact" className="nav-link" style={{ color: '#64748b', fontWeight: 600, fontFamily: 'Poppins' }}>Contact</a>
                    </div>

                    <motion.div
                        className="nav-actions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}
                    >
                        <a href="#app" className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', textDecoration: 'none', color: 'white' }}>
                            <Smartphone size={18} />
                            Get App
                        </a>
                    </motion.div>
                </div>
            </div>
        </nav>
    );
};

export default VendorNavbar;

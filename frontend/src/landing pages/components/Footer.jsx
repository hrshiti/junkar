import { Facebook, Twitter, Instagram, Linkedin, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTranslation } from '../../hooks/usePageTranslation';

const Footer = () => {
    const { getTranslatedText } = usePageTranslation([
        "Revolutionizing the scrap industry with transparency, efficiency, and sustainability. Turn your trash into cash and contribute to a greener planet.",
        "Quick Links", "Support", "Newsletter", "Home", "About Us", "How it Works", "Partners", "FAQ", "Contact Us", "Privacy Policy", "Terms of Service",
        "Subscribe to get latest market rates and eco-tips.", "Email address", "Privacy", "Terms", "Cookies", "All rights reserved."
    ]);

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="logo footer-logo" style={{ color: 'white' }}>
                            <img src="/junker.png" alt="Junkar" style={{ height: '4rem', filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <p className="footer-text">
                            {getTranslatedText("Revolutionizing the scrap industry with transparency, efficiency, and sustainability. Turn your trash into cash and contribute to a greener planet.")}
                        </p>
                        <div className="footer-socials">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                <a key={i} href="#" className="social-link">
                                    <Icon size={20} color="white" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="footer-heading">{getTranslatedText("Quick Links")}</h4>
                        <ul className="footer-links">
                            <li><Link to="/" className="footer-link">{getTranslatedText("Home")}</Link></li>
                            <li><a href="/#about" className="footer-link">{getTranslatedText("About Us")}</a></li>
                            <li><a href="/#how-it-works" className="footer-link">{getTranslatedText("How it Works")}</a></li>
                            <li><a href="/#partners" className="footer-link">{getTranslatedText("Partners")}</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">{getTranslatedText("Support")}</h4>
                        <ul className="footer-links">
                            <li><Link to="/user/help" className="footer-link">{getTranslatedText("FAQ")}</Link></li>
                            <li><a href="/#contact" className="footer-link">{getTranslatedText("Contact Us")}</a></li>
                            <li><Link to="/privacy-policy" className="footer-link">{getTranslatedText("Privacy Policy")}</Link></li>
                            <li><Link to="/terms-of-service" className="footer-link">{getTranslatedText("Terms of Service")}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="footer-heading">{getTranslatedText("Newsletter")}</h4>
                        <p className="footer-text" style={{ fontSize: '0.875rem' }}>{getTranslatedText("Subscribe to get latest market rates and eco-tips.")}</p>
                        <div style={{ position: 'relative', marginTop: '1rem' }}>
                            <input
                                type="email"
                                placeholder={getTranslatedText("Email address")}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                    outline: 'none'
                                }}
                            />
                            <button
                                style={{
                                    position: 'absolute',
                                    right: '5px',
                                    top: '5px',
                                    bottom: '5px',
                                    background: 'var(--primary)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    width: '35px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <ArrowRight size={18} color="white" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} Junkar. {getTranslatedText("All rights reserved.")}</p>
                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <Link to="/privacy-policy">{getTranslatedText("Privacy")}</Link>
                        <Link to="/terms-of-service">{getTranslatedText("Terms")}</Link>
                        <a href="#">{getTranslatedText("Cookies")}</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

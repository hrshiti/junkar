import { Users, LayoutDashboard, Wallet } from 'lucide-react';
import { usePageTranslation } from '../../../hooks/usePageTranslation';

const vendorBenefits = [
    {
        title: 'More Customers',
        desc: 'Access a wider network of recurring scrap sellers in your local area.',
        icon: <Users size={32} />
    },
    {
        title: 'Easy Pickup Management',
        desc: 'Manage all your collection requests through our intuitive vendor dashboard.',
        icon: <LayoutDashboard size={32} />
    },
    {
        title: 'Secure Payments',
        desc: 'Transparent transactions and guaranteed timely payments for all collections.',
        icon: <Wallet size={32} />
    }
];

const VendorLanding = () => {
    const { getTranslatedText } = usePageTranslation([
        "Benefits", "Grow with Junkar", "We provide the tools you need to modernize your scrap business.",
        "More Customers", "Access a wider network of recurring scrap sellers in your local area.",
        "Easy Pickup Management", "Manage all your collection requests through our intuitive vendor dashboard.",
        "Secure Payments", "Transparent transactions and guaranteed timely payments for all collections."
    ]);

    return (
        <section className="section" style={{ background: '#f0fdf4' }}>
            <div className="container">
                <div className="section-header">
                    <span className="section-tag" style={{ color: '#059669' }}>{getTranslatedText("Benefits")}</span>
                    <h2 className="section-title">{getTranslatedText("Grow with Junkar")}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{getTranslatedText("We provide the tools you need to modernize your scrap business.")}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    {vendorBenefits.map((benefit, i) => (
                        <motion.div
                            key={i}
                            className="category-card"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            style={{ background: 'white', borderRadius: '24px', padding: '2.5rem' }}
                        >
                            <div className="category-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                                {benefit.icon}
                            </div>
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>{getTranslatedText(benefit.title)}</h3>
                            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{getTranslatedText(benefit.desc)}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default VendorLanding;

import React from 'react';

const partners = [
  { name: 'MNIT', logo: 'https://mnit.ac.in/images/mnit_logo.png' },
  { name: 'NIFT', logo: 'https://nift.ac.in/sites/default/files/nift_logo_0.png' },
  { name: 'Kazari', logo: '' },
  { name: 'ICFRE - AFRI', logo: '' },
  { name: 'TATA Project Limited', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/1200px-Tata_logo.svg.png' },
  { name: 'Nuclear Fuel Complex (NFC)', logo: 'https://www.nfc.gov.in/images/nfc_logo.png' },
  { name: 'Saras Dairy', logo: 'https://rajsaras.rajasthan.gov.in/Template/Default/Default/images/logo.png' },
  { name: 'Indian Oil (IOCL)', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/8e/Indian_Oil_Corporation_logo.svg/1200px-Indian_Oil_Corporation_logo.svg.png' },
  { name: 'Uttari Rajasthan Sahakari Dugdh Utpadak Sangh Ltd.', logo: '' },
  { name: 'TPL-SUCG Consortium', logo: '' },
  { name: 'Hindustan Petroleum Corporation Ltd.', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/30/Hindustan_Petroleum_Logo.svg/1200px-Hindustan_Petroleum_Logo.svg.png' },
  { name: 'All India Radio', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/All_India_Radio_logo.svg/1200px-All_India_Radio_logo.svg.png' },
  { name: 'Sangam India Private Limited', logo: '' },
  { name: 'Madhyamik Shiksha Board Ajmer', logo: 'https://rajeduboard.rajasthan.gov.in/images/logo.png' },
];

const Partners = () => {
  return (
    <section id="partners" className="partners-section">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <div style={{ width: '12px', height: '12px', background: '#38bdf8', borderRadius: '50%', animation: 'pulse-blue 1.5s infinite' }}></div>
          <span style={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.875rem', letterSpacing: '0.05em', color: 'var(--text-main)' }}>Our Partners & Clients</span>
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '2.5rem', fontWeight: 800 }}>TRUSTED BY INDUSTRY LEADERS</h2>
      </div>

      <div className="partners-ticker-container">
        <div className="partners-ticker">
          {[...partners, ...partners].map((partner, i) => (
            <div key={i} className="partner-card">
              {partner.logo ? (
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="partner-logo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <span className="partner-name" style={{ display: partner.logo ? 'none' : 'block' }}>
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .partners-section {
          padding: 5rem 0;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .partners-ticker-container {
          overflow: hidden;
          white-space: nowrap;
          padding: 2rem 0;
          position: relative;
        }

        .partners-ticker-container::before,
        .partners-ticker-container::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 150px;
          z-index: 2;
          pointer-events: none;
        }

        .partners-ticker-container::before {
          left: 0;
          background: linear-gradient(to right, #f8fafc, transparent);
        }

        .partners-ticker-container::after {
          right: 0;
          background: linear-gradient(to left, #f8fafc, transparent);
        }

        .partners-ticker {
          display: inline-flex;
          gap: 3rem;
          animation: ticker-partners 40s linear infinite;
          align-items: center;
        }

        @keyframes ticker-partners {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .partner-card {
          min-width: 200px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
          transition: all 0.3s ease;
          border: 1px solid #f1f5f9;
        }

        .partner-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          border-color: #38bdf8;
        }

        .partner-logo {
          max-width: 160px;
          max-height: 60px;
          object-fit: contain;
          filter: grayscale(100%);
          opacity: 0.6;
          transition: all 0.3s ease;
        }

        .partner-card:hover .partner-logo {
          filter: grayscale(0%);
          opacity: 1;
        }

        .partner-name {
          font-weight: 700;
          color: #64748b;
          font-size: 0.9rem;
          text-align: center;
          letter-spacing: 0.025em;
          text-transform: uppercase;
          white-space: normal;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @keyframes pulse-blue {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
      `}</style>
    </section>
  );
};

export default Partners;

import React from 'react';
import { Briefcase, Image as ImageIcon } from 'lucide-react';

export default function BusinessBrandingSection({ 
  invoiceData, 
  onChange, 
  onLogoUpload, 
  onResetLogo, 
  isOpen, 
  onToggle 
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="dash-card">
      <div 
        className="card-title" 
        onClick={onToggle} 
        style={{ cursor: 'pointer', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Briefcase size={18} />
          <span>Business Branding</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-slideDown">
          <div className="form-group">
            <label>Business Name</label>
            <input 
              type="text" 
              name="companyName" 
              value={invoiceData.companyName}
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Business Logo</label>
            {invoiceData.customLogo ? (
              <div className="uploaded-preview">
                <img src={invoiceData.customLogo} alt="Uploaded logo" />
                <span>Custom Logo loaded</span>
                <button type="button" className="btn-remove" onClick={onResetLogo}>×</button>
              </div>
            ) : (
              <div className="file-upload">
                <input type="file" accept="image/*" onChange={onLogoUpload} />
                <div className="file-upload-content">
                  <ImageIcon size={20} />
                  <span>Upload Logo Image</span>
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Office Address Line 1</label>
            <input 
              type="text" 
              name="address1" 
              value={invoiceData.address1}
              placeholder="e.g. Ajay Electronics"
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Address Line 2</label>
              <input 
                type="text" 
                name="address2" 
                value={invoiceData.address2}
                placeholder="Near Sangh Idar"
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Address Line 3</label>
              <input 
                type="text" 
                name="address3" 
                value={invoiceData.address3}
                placeholder="Idar Gujarat 383430"
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Country Code</label>
              <input 
                type="text" 
                name="country" 
                value={invoiceData.country}
                placeholder="IN"
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Contact Phone</label>
              <input 
                type="text" 
                name="phone" 
                value={invoiceData.phone}
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={invoiceData.email}
              onChange={handleInputChange} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { Wifi } from 'lucide-react';

export default function PlanCustomizationSection({ invoiceData, onChange, isOpen, onToggle }) {
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
          <Wifi size={18} />
          <span>Plan & Price Customization</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-slideDown">
          <div className="form-group">
            <label>Plan Name</label>
            <input 
              type="text" 
              name="planName" 
              value={invoiceData.planName}
              placeholder="e.g. 100 Mbps Unlimited"
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Plan Subtext / Description</label>
            <input 
              type="text" 
              name="planSubtext" 
              value={invoiceData.planSubtext}
              placeholder="e.g. For 12 Months"
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Time Period / Qty</label>
              <input 
                type="text" 
                name="timePeriod" 
                value={invoiceData.timePeriod}
                placeholder="e.g. 1 or 12 Months"
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Total Amount ({invoiceData.currencySymbol})</label>
              <input 
                type="number" 
                name="price" 
                value={invoiceData.price}
                placeholder="11400"
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Discount (%)</label>
              <input 
                type="number" 
                name="discount" 
                value={invoiceData.discount}
                placeholder="0"
                min="0"
                max="100"
                onChange={handleInputChange} 
              />
            </div>
            <div className="form-group">
              <label>Installation Charges ({invoiceData.currencySymbol})</label>
              <input 
                type="number" 
                name="installationCharges" 
                value={invoiceData.installationCharges}
                placeholder="0"
                min="0"
                onChange={handleInputChange} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Currency Symbol</label>
            <input 
              type="text" 
              name="currencySymbol" 
              value={invoiceData.currencySymbol}
              placeholder="₹"
              onChange={handleInputChange} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { User } from 'lucide-react';

export default function CustomerSection({ invoiceData, onChange, isOpen, onToggle }) {
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
          <User size={18} />
          <span>Bill To Customer</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-slideDown">
          <div className="form-group">
            <label>Customer Name</label>
            <input 
              type="text" 
              name="customerName" 
              value={invoiceData.customerName}
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-group">
            <label>Customer Phone</label>
            <input 
              type="text" 
              name="customerPhone" 
              value={invoiceData.customerPhone}
              onChange={handleInputChange} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

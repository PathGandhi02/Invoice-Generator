import React from 'react';
import { Calendar } from 'lucide-react';

export default function InvoiceMetaSection({ invoiceData, onChange, isOpen, onToggle }) {
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
          <Calendar size={18} />
          <span>Invoice Metadata</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-slideDown">
          <div className="form-group">
            <label>Invoice Number</label>
            <input 
              type="text" 
              name="invoiceNumber" 
              value={invoiceData.invoiceNumber}
              onChange={handleInputChange} 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Issue/Start Date</label>
              <input 
                type="text" 
                name="startDate" 
                value={invoiceData.startDate}
                onChange={handleInputChange} 
            />
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input 
                type="text" 
                name="dueDate" 
                value={invoiceData.dueDate}
                onChange={handleInputChange} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

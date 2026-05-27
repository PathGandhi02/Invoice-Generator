import React from 'react';
import { FileText } from 'lucide-react';

export default function DocumentTypeSection({ invoiceData, onChange }) {
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    onChange(name, checked);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  return (
    <div className="dash-card">
      <div className="card-title">
        <FileText size={18} />
        <span>Document Type</span>
      </div>
      <div className="toggle-group">
        <div className="toggle-label">
          <span className="toggle-title">Payment Status</span>
          <span className="toggle-desc">
            {invoiceData.isPaid ? 'Generates Paid Receipt' : 'Generates Unpaid Invoice'}
          </span>
        </div>
        <label className="switch">
          <input 
            type="checkbox" 
            name="isPaid"
            checked={invoiceData.isPaid}
            onChange={handleCheckboxChange}
          />
          <span className="slider"></span>
        </label>
      </div>

      {invoiceData.isPaid && (
        <div className="form-group animate-fadeIn">
          <label>Payment Method Details (Optional)</label>
          <input 
            type="text" 
            name="paymentMethod" 
            value={invoiceData.paymentMethod}
            placeholder="e.g. UPI, Net Banking, Card"
            onChange={handleInputChange}
          />
        </div>
      )}
    </div>
  );
}

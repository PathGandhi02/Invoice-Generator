import React from 'react';
import { QrCode, Image as ImageIcon } from 'lucide-react';

export default function PaymentQrSection({ 
  invoiceData, 
  onChange, 
  onQrUpload, 
  onResetQr, 
  isOpen, 
  onToggle 
}) {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onChange(name, value);
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    onChange(name, checked);
  };

  return (
    <div className="dash-card">
      <div 
        className="card-title" 
        onClick={onToggle} 
        style={{ cursor: 'pointer', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QrCode size={18} />
          <span>QR Code & Payment Details</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)' }}>
          {isOpen ? '▼' : '►'}
        </span>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-slideDown">
          <div className="toggle-group" style={{ background: 'none', padding: 0, border: 'none' }}>
            <span className="toggle-title" style={{ fontSize: '0.8rem' }}>Display QR Code on Invoice</span>
            <label className="switch">
              <input 
                type="checkbox" 
                name="showQr"
                checked={invoiceData.showQr}
                onChange={handleCheckboxChange}
              />
              <span className="slider"></span>
            </label>
          </div>

          {invoiceData.showQr && (
            <>
              <div className="form-group">
                <label>QR Code Type</label>
                <select 
                  name="qrType" 
                  value={invoiceData.qrType} 
                  onChange={handleInputChange}
                >
                  <option value="upi">Auto Dynamic UPI QR</option>
                  <option value="upload">Upload Custom QR Image</option>
                </select>
              </div>

              {invoiceData.qrType === 'upi' ? (
                <div className="form-group">
                  <label>UPI ID (For Dynamic Payment QR)</label>
                  <input 
                    type="text" 
                    name="upiId" 
                    value={invoiceData.upiId}
                    placeholder="e.g. marutigigafiber@upi"
                    onChange={handleInputChange} 
                  />
                  <small style={{ fontSize: '0.7rem', color: 'var(--dash-text-muted)' }}>
                    Automatically embeds amount: {invoiceData.currencySymbol}{Number(invoiceData.price).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </small>
                </div>
              ) : (
                <div className="form-group">
                  <label>Upload QR Code Image</label>
                  {invoiceData.customQr ? (
                    <div className="uploaded-preview">
                      <img src={invoiceData.customQr} alt="Uploaded QR" />
                      <span>Custom QR loaded</span>
                      <button type="button" className="btn-remove" onClick={onResetQr}>×</button>
                    </div>
                  ) : (
                    <div className="file-upload">
                      <input type="file" accept="image/*" onChange={onQrUpload} />
                      <div className="file-upload-content">
                        <ImageIcon size={20} />
                        <span>Choose QR Image File</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import defaultLogo from '../assets/logo.jpg';

export default function InvoicePreview({ invoiceData, activeColor, innerRef, className }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Format prices according to currency and Indian numbering standard
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return invoiceData.currencySymbol + ' ' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Convert raw YYYY-MM-DD input dates into clean, professional "DD Mon YYYY" (e.g. 27 May 2026)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    // Check if already manually typed in "DD Mon YYYY" format (e.g. "24 Mar 2024")
    const dateTrim = dateStr.trim();
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/i.test(dateTrim)) {
      return dateTrim.replace(/\b([a-z]+)\b/gi, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase());
    }

    // Try parsing YYYY-MM-DD standard datepicker format
    const parts = dateTrim.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = months[monthIndex];
      
      if (monthName && !isNaN(day) && !isNaN(year)) {
        return `${String(day).padStart(2, '0')} ${monthName} ${year}`;
      }
    }

    // Fallback parsing via Javascript Date object
    const date = new Date(dateTrim);
    if (isNaN(date.getTime())) return dateStr;

    const day = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const originalPrice = Number(invoiceData.price) || 0;
  const discountPercent = Number(invoiceData.discount) || 0;
  const discountAmount = (originalPrice * discountPercent) / 100;
  const installationFee = Number(invoiceData.installationCharges) || 0;
  const finalTotal = originalPrice - discountAmount + installationFee;

  const upiUrl = `upi://pay?pa=${invoiceData.upiId}&pn=${encodeURIComponent(invoiceData.companyName)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=${invoiceData.isPaid ? 'Receipt' : 'Invoice'}_${invoiceData.invoiceNumber}`;

  // Generate QR Code locally as a Base64 data URL to prevent CORS/taint canvas issues
  useEffect(() => {
    if (invoiceData.showQr && invoiceData.qrType === 'upi' && invoiceData.upiId) {
      QRCode.toDataURL(upiUrl, { margin: 1, width: 250, errorCorrectionLevel: 'M' })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error('Failed to generate local QR Code:', err);
        });
    }
  }, [upiUrl, invoiceData.showQr, invoiceData.qrType, invoiceData.upiId]);

  const finalLogo = invoiceData.customLogo || defaultLogo;
  const qrCodeImage = invoiceData.qrType === 'upi' ? qrCodeUrl : invoiceData.customQr;

  return (
    <div className={`preview-pane ${className || ''}`}>
      <div 
        id="invoice-print-area" 
        className="invoice-paper" 
        ref={innerRef}
      >
        {/* Paid Stamp Watermark */}
        {invoiceData.isPaid && (
          <div className="paid-watermark-stamp">
            <span>PAID</span>
          </div>
        )}

        {/* Top Header Block */}
        <div className="invoice-top-section">
          <div className="invoice-logo-wrapper">
            <img src={finalLogo} alt="Business Logo" className="invoice-logo-img" />
          </div>
          <div className="invoice-header-info">
            <h1 className="invoice-title">{invoiceData.isPaid ? 'Receipt' : 'Invoice'}</h1>
            <div className="invoice-company-name">{invoiceData.companyName}</div>
            <div className="invoice-meta-info">
              {invoiceData.address1 && <div>{invoiceData.address1}</div>}
              {invoiceData.address2 && <div>{invoiceData.address2}</div>}
              {invoiceData.address3 && <div>{invoiceData.address3}</div>}
              {invoiceData.country && <div>{invoiceData.country}</div>}
              {invoiceData.phone && <div style={{ marginTop: '0.25rem' }}>{invoiceData.phone}</div>}
              {invoiceData.email && <div>{invoiceData.email}</div>}
            </div>
          </div>
        </div>

        {/* Grey Banner block (Bill To & Meta Dates) */}
        <div 
          className="invoice-banner-block"
          style={{ backgroundColor: activeColor }}
        >
          <div className="banner-col-bill">
            <div className="banner-label">BILL TO</div>
            <div className="banner-bill-name">{invoiceData.customerName}</div>
            {invoiceData.customerPhone && (
              <div className="banner-bill-phone">{invoiceData.customerPhone}</div>
            )}
            {invoiceData.customerAddress && (
              <div className="banner-bill-address" style={{ fontSize: '0.9rem', color: '#374151', whiteSpace: 'pre-line', marginTop: '0.1rem' }}>
                {invoiceData.customerAddress}
              </div>
            )}
            {invoiceData.customerEmail && (
              <div className="banner-bill-email" style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '0.15rem' }}>
                {invoiceData.customerEmail}
              </div>
            )}
          </div>
          <div className="banner-col-meta">
            <div className="meta-label-grid">{invoiceData.isPaid ? 'Receipt #' : 'Invoice #'}</div>
            <div className="meta-value-grid">{invoiceData.invoiceNumber}</div>
            
            <div className="meta-label-grid">Start Date</div>
            <div className="meta-value-grid">{formatDate(invoiceData.startDate)}</div>
            
            <div className="meta-label-grid">{invoiceData.isPaid ? 'Payment Date' : 'Payment Due Date'}</div>
            <div className="meta-value-grid">{formatDate(invoiceData.isPaid ? invoiceData.startDate : invoiceData.dueDate)}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="invoice-table-container">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="col-plan" style={{ borderBottomColor: '#111827' }}>PLAN NAME</th>
                <th className="col-qty" style={{ borderBottomColor: '#111827', textAlign: 'center' }}>TIME PERIOD</th>
                <th className="col-amount" style={{ borderBottomColor: '#111827', textAlign: 'right' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-plan">
                  <div className="plan-title">{invoiceData.planName}</div>
                  {invoiceData.planSubtext && (
                    <div className="plan-subtitle">{invoiceData.planSubtext}</div>
                  )}
                </td>
                <td className="col-qty">
                  <div className="qty-val">{invoiceData.timePeriod}</div>
                </td>
                <td className="col-amount" style={{ textAlign: 'right' }}>
                  <div className="amount-val">{formatCurrency(invoiceData.price)}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Area (Calculations, QR Codes, Stamp highlight, Disclaimers) */}
        <div className="invoice-footer-section">
          {/* QR Code Column */}
          <div className="footer-left-col">
            {invoiceData.showQr && qrCodeImage && (
              <div className="payment-qr-container">
                <img 
                  src={qrCodeImage} 
                  alt="Payment QR Code" 
                  className="payment-qr-img"
                />
                <div className="payment-qr-text">
                  <div className="qr-title">SCAN TO PAY</div>
                  <div className="qr-desc">
                    {invoiceData.qrType === 'upi' ? (
                      <>
                        Pay directly using any UPI App.<br />
                        <strong>UPI ID:</strong> {invoiceData.upiId}
                      </>
                    ) : (
                      'Scan to complete payment using your preferred app.'
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calculations Column */}
          <div className="footer-right-col">
            {(discountPercent > 0 || installationFee > 0) && (
              <>
                <div className="calc-row">
                  <span className="calc-label">Subtotal (Plan)</span>
                  <span className="calc-value">{formatCurrency(originalPrice)}</span>
                </div>
                {installationFee > 0 && (
                  <div className="calc-row" style={{ color: 'var(--dash-text-heading)', fontWeight: 500 }}>
                    <span className="calc-label">Installation Charges</span>
                    <span className="calc-value">+ {formatCurrency(installationFee)}</span>
                  </div>
                )}
                {discountPercent > 0 && (
                  <div className="calc-row" style={{ color: 'var(--accent-rose)', fontWeight: 500 }}>
                    <span className="calc-label">Discount ({discountPercent}%)</span>
                    <span className="calc-value">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </>
            )}
            <div className="calc-row">
              <span className="calc-label">Total</span>
              <span className="calc-value" style={{ fontWeight: 700 }}>{formatCurrency(finalTotal)}</span>
            </div>
            
            <div className="calc-divider"></div>
            
            {/* Highlight Banner for Due / Paid status */}
            <div 
              className="invoice-highlight-block"
              style={{ backgroundColor: activeColor }}
            >
              <span className="highlight-label">{invoiceData.isPaid ? 'Amount Paid' : 'Amount Due'}</span>
              <span className="highlight-val">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="invoice-bottom-note">
          Note : It is computer generated invoice and does not require signature.
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import defaultLogo from '../assets/logo.jpg';

export default function InvoicePreview({ invoiceData, activeColor, innerRef }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Format prices according to currency and Indian numbering standard
  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return invoiceData.currencySymbol + ' ' + num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const upiUrl = `upi://pay?pa=${invoiceData.upiId}&pn=${encodeURIComponent(invoiceData.companyName)}&am=${invoiceData.price}&cu=INR&tn=${invoiceData.isPaid ? 'Receipt' : 'Invoice'}_${invoiceData.invoiceNumber}`;

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
    <div className="preview-pane">
      <div 
        id="invoice-print-area" 
        className="invoice-paper" 
        ref={innerRef}
      >
        {/* Paid Stamp Watermark */}
        {invoiceData.isPaid && (
          <div className="paid-watermark-stamp">
            <span>PAID</span>
            <span className="stamp-date">{invoiceData.startDate || 'SUCCESS'}</span>
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
          </div>
          <div className="banner-col-meta">
            <div className="meta-label-grid">{invoiceData.isPaid ? 'Receipt #' : 'Invoice #'}</div>
            <div className="meta-value-grid">{invoiceData.invoiceNumber}</div>
            
            <div className="meta-label-grid">Start Date</div>
            <div className="meta-value-grid">{invoiceData.startDate}</div>
            
            <div className="meta-label-grid">{invoiceData.isPaid ? 'Payment Date' : 'Payment Due Date'}</div>
            <div className="meta-value-grid">{invoiceData.isPaid ? invoiceData.startDate : invoiceData.dueDate}</div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="invoice-table-container">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="col-plan" style={{ borderBottomColor: '#111827' }}>PLAN NAME</th>
                <th className="col-qty" style={{ borderBottomColor: '#111827', textAlign: 'center' }}>TIME PERIOD</th>
                <th className="col-price" style={{ borderBottomColor: '#111827', textAlign: 'right' }}>PRICE</th>
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
                <td className="col-price" style={{ textAlign: 'right' }}>
                  <div className="price-val">{formatCurrency(invoiceData.price)}</div>
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
            <div className="calc-row">
              <span className="calc-label">Subtotal</span>
              <span className="calc-value">{formatCurrency(invoiceData.price)}</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Total</span>
              <span className="calc-value" style={{ fontWeight: 700 }}>{formatCurrency(invoiceData.price)}</span>
            </div>
            
            <div className="calc-divider"></div>
            
            {/* Highlight Banner for Due / Paid status */}
            <div 
              className="invoice-highlight-block"
              style={{ backgroundColor: activeColor }}
            >
              <span className="highlight-label">{invoiceData.isPaid ? 'Amount Paid' : 'Amount Due'}</span>
              <span className="highlight-val">{formatCurrency(invoiceData.price)}</span>
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

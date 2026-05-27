import React, { useState } from 'react';
import { Wifi, Download, Printer } from 'lucide-react';

// Import child section components
import DocumentTypeSection from './dashboard/DocumentTypeSection';
import BusinessBrandingSection from './dashboard/BusinessBrandingSection';
import CustomerSection from './dashboard/CustomerSection';
import InvoiceMetaSection from './dashboard/InvoiceMetaSection';
import PlanCustomizationSection from './dashboard/PlanCustomizationSection';
import PaymentQrSection from './dashboard/PaymentQrSection';
import AccentStylingSection from './dashboard/AccentStylingSection';

export default function Dashboard({
  invoiceData,
  onChange,
  onLogoUpload,
  onQrUpload,
  onResetLogo,
  onResetQr,
  onExportPdf,
  activeColor,
  setActiveColor,
  className
}) {
  // Handle accordion collapsed state
  const [activeSection, setActiveSection] = useState('branding');

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? '' : section);
  };

  return (
    <aside className={`dashboard-sidebar ${className || ''}`}>
      {/* Sidebar Header */}
      <div className="dashboard-header">
        <div className="dashboard-logo-title">
          <Wifi size={24} className="text-blue-500 animate-pulse" />
          <h1>GigaInvoice</h1>
        </div>
        <span className="badge">Pro Studio</span>
      </div>

      {/* 1. Document Mode */}
      <DocumentTypeSection 
        invoiceData={invoiceData} 
        onChange={onChange} 
      />

      {/* 2. Business Branding */}
      <BusinessBrandingSection
        invoiceData={invoiceData}
        onChange={onChange}
        onLogoUpload={onLogoUpload}
        onResetLogo={onResetLogo}
        isOpen={activeSection === 'branding'}
        onToggle={() => toggleSection('branding')}
      />

      {/* 3. Customer Billing Info */}
      <CustomerSection
        invoiceData={invoiceData}
        onChange={onChange}
        isOpen={activeSection === 'customer'}
        onToggle={() => toggleSection('customer')}
      />

      {/* 4. Invoice Metadata */}
      <InvoiceMetaSection
        invoiceData={invoiceData}
        onChange={onChange}
        isOpen={activeSection === 'meta'}
        onToggle={() => toggleSection('meta')}
      />

      {/* 5. Custom Plan Details */}
      <PlanCustomizationSection
        invoiceData={invoiceData}
        onChange={onChange}
        isOpen={activeSection === 'plan'}
        onToggle={() => toggleSection('plan')}
      />

      {/* 6. Dynamic QR & Payment */}
      <PaymentQrSection
        invoiceData={invoiceData}
        onChange={onChange}
        onQrUpload={onQrUpload}
        onResetQr={onResetQr}
        isOpen={activeSection === 'payment'}
        onToggle={() => toggleSection('payment')}
      />

      {/* 7. Theme Accent Swatches */}
      <AccentStylingSection
        activeColor={activeColor}
        setActiveColor={setActiveColor}
      />

      {/* Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={onExportPdf}>
          <Download size={18} />
          <span>Export PDF Invoice</span>
        </button>
        <button className="btn-secondary" onClick={() => window.print()}>
          <Printer size={18} />
          <span>Print Page</span>
        </button>
      </div>
    </aside>
  );
}

import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import Dashboard from './components/Dashboard';
import InvoicePreview from './components/InvoicePreview';

const getTodayString = () => {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getFutureDateString = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const INITIAL_INVOICE_DATA = {
  companyName: 'Maruti Giga Fiber',
  address1: 'Ajay Electronics',
  address2: 'Near Sangh Idar',
  address3: 'Idar Gujarat 383430',
  country: 'IN',
  phone: '9925559411',
  email: 'marutigigafiber@gmail.com',
  customerName: '',
  customerPhone: '+91 ',
  customerAddress: '',
  customerEmail: '',
  invoiceNumber: '2027-2026/5678',
  startDate: getTodayString(),
  dueDate: getFutureDateString(3),
  planName: '100 Mbps Unlimited',
  planSubtext: '',
  timePeriod: '12 months',
  price: 0,
  currencySymbol: '₹',
  isPaid: false,
  paymentMethod: '',
  showQr: true,
  qrType: 'upi',
  upiId: 'manish10gandhi-1@okhdfcbank', // Preloaded business UPI ID
  discount: 0,
  installationCharges: 0,
  customLogo: null,
  customQr: null
};

export default function App() {
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE_DATA);
  const [activeColor, setActiveColor] = useState('#f3f4f6');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' or 'preview'
  const invoiceRef = useRef(null);

  // Field change handler
  const handleDataChange = (name, value) => {
    setInvoiceData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Logo Upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInvoiceData((prev) => ({
          ...prev,
          customLogo: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle QR Upload
  const handleQrUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInvoiceData((prev) => ({
          ...prev,
          customQr: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
    setInvoiceData((prev) => ({
      ...prev,
      customLogo: null
    }));
  };

  const handleResetQr = () => {
    setInvoiceData((prev) => ({
      ...prev,
      customQr: null
    }));
  };

  // Handle PDF Export using html2pdf.js with standard manual download fallback
  const handleExportPdf = () => {
    const element = invoiceRef.current;
    const filename = `${invoiceData.isPaid ? 'Receipt' : 'Invoice'}_${invoiceData.invoiceNumber.replace(/[\/\s]/g, '_')}.pdf`;

    // Customize configuration for crisp print
    const opt = {
      margin: 0.3,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2.5,
        useCORS: true,
        letterRendering: true,
        backgroundColor: '#ffffff'
      },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Run html2pdf to get jsPDF instance and trigger manual download
    html2pdf()
      .from(element)
      .set(opt)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;

        // Append to body to ensure Chrome/Edge security context allows filename assignment
        document.body.appendChild(link);
        link.click();

        // Clean up immediately after click
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);

        // Show premium assistance toast for sandbox environments
        setToast({
          message: '✨ PDF generated! If downloaded as an extensionless file, rename it to end in .pdf (e.g. invoice.pdf), or open http://localhost:5173/ in a standard browser (Chrome/Edge) to auto-save.',
          type: 'info'
        });
        // Dismiss after 10 seconds
        setTimeout(() => setToast(null), 10000);
      })
      .catch((err) => {
        console.error('PDF generation failed, falling back to standard print:', err);
        setToast({
          message: '⚠️ PDF export failed. Opening standard print window. Select "Save as PDF" to save manually.',
          type: 'warning'
        });
        setTimeout(() => setToast(null), 7000);
        window.print();
      });
  };

  return (
    <div className="app-container">
      {/* Mobile Sticky Tab Switcher (Only visible on screens <= 1100px) */}
      <div className="mobile-tabs-container">
        <button
          className={`mobile-tab-btn ${activeTab === 'edit' ? 'active' : ''}`}
          onClick={() => setActiveTab('edit')}
        >
          ✏️ Edit Details
        </button>
        <button
          className={`mobile-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ View Invoice
        </button>
      </div>

      {/* Sidebar Controls Panel */}
      <Dashboard
        invoiceData={invoiceData}
        onChange={handleDataChange}
        onLogoUpload={handleLogoUpload}
        onQrUpload={handleQrUpload}
        onResetLogo={handleResetLogo}
        onResetQr={handleResetQr}
        onExportPdf={handleExportPdf}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        className={activeTab === 'edit' ? 'mobile-visible' : 'mobile-hidden'}
      />

      {/* Invoice Realtime Interactive Preview */}
      <InvoicePreview
        invoiceData={invoiceData}
        activeColor={activeColor}
        innerRef={invoiceRef}
        className={activeTab === 'preview' ? 'mobile-visible' : 'mobile-hidden'}
      />

      {/* Mobile Floating Quick Action Bar (Only visible in Preview tab on screens <= 1100px) */}
      {activeTab === 'preview' && (
        <div className="mobile-actions-bar">
          <button className="mobile-action-btn-primary" onClick={handleExportPdf}>
            <span>⬇️ Export PDF</span>
          </button>
          <button className="mobile-action-btn-secondary" onClick={() => window.print()}>
            <span>🖨️ Print</span>
          </button>
        </div>
      )}

      {/* Dynamic Assistance Toast */}
      {toast && (
        <div className={`app-toast toast-${toast.type} animate-fadeIn`}>
          <div className="toast-content">
            <span className="toast-icon">💡</span>
            <p className="toast-message">{toast.message}</p>
          </div>
          <button className="toast-close-btn" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}

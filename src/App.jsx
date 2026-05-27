import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import Dashboard from './components/Dashboard';
import InvoicePreview from './components/InvoicePreview';

const INITIAL_INVOICE_DATA = {
  companyName: 'Maruti Giga Fiber',
  address1: 'Ajay Electronics',
  address2: 'Near Sangh Idar',
  address3: 'Idar Gujarat 383430',
  country: 'IN',
  phone: '9925559411',
  email: 'marutigigafiber@gmail.com',
  customerName: 'JIGARBHAI BHARATBHAI SONI',
  customerPhone: '+91 942 670 111 7',
  invoiceNumber: '2025-2024/403',
  startDate: '24 Mar 2024',
  dueDate: '27 Mar 2024',
  planName: '100 Mbps Unlimited',
  planSubtext: 'For 12 Months',
  timePeriod: '1',
  price: 11400,
  currencySymbol: '₹',
  isPaid: false,
  paymentMethod: '',
  showQr: true,
  qrType: 'upi',
  upiId: 'manish10gandhi-1@okhdfcbank', // Preloaded business UPI ID
  customLogo: null,
  customQr: null
};

export default function App() {
  const [invoiceData, setInvoiceData] = useState(INITIAL_INVOICE_DATA);
  const [activeColor, setActiveColor] = useState('#f3f4f6');
  const [toast, setToast] = useState(null);
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
      />

      {/* Invoice Realtime Interactive Preview */}
      <InvoicePreview
        invoiceData={invoiceData}
        activeColor={activeColor}
        innerRef={invoiceRef}
      />

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

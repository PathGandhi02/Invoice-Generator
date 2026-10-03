import { createDraft, toHistoryRecord } from '../../src/services/InvoiceService';
import { defaultSettings } from '../../src/models/BusinessSettings';
export function fixtureInvoice(index: number, image: string | null = null) {
  const data = { ...createDraft(defaultSettings), id: `fixture-${index}`, invoiceNumber: `LOAD-${String(index).padStart(6,'0')}`,
    customerName: `Fictional Customer ${index % 50} — Café`, customerUsername: `fixture_${index}`,
    customerAddress: 'Fictional Test Road\nSample City', planName: 'Test Plan', planSubtext: 'Fictional acceptance fixture',
    timePeriod: '12 Months', price: 1250.5, discount: index % 3 === 0 ? 100 : index % 3 === 1 ? 10 : 0,
    installationCharges: 200, isPaid: index % 2 === 0, currencySymbol: index % 5 === 0 ? '$' : '₹',
    startDate: '2026-09-01', dueDate: '2026-09-30', customLogo: image };
  return { ...toHistoryRecord(data), savedAt: new Date(Date.UTC(2026,0,1) + index * 1000).toISOString() };
}
export function fixtureCustomer(index: number) { return { username: `fixture_${index}`, full_name: `Fictional Customer ${index % 50} — Café`, address: 'Fictional Test Road', package: '12 Months' }; }

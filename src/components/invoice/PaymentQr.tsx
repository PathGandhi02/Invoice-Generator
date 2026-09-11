import { Image, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { InvoiceData } from '../../models/Invoice';
import { buildUpiLink, canShowUpi } from '../../utils/payment';
import { fonts } from '../../theme';
export function PaymentQr({ invoice, size = 130 }: { invoice: InvoiceData; size?: number }) {
  if (!invoice.showQr) return null;
  const isUpi = canShowUpi(invoice);
  const custom = invoice.qrType === 'custom' && invoice.customQr;
  if (!isUpi && !custom) return null;
  return <View style={{ gap: 10, alignItems: 'flex-start', maxWidth: 255 }}>
    <View style={{ padding: 7, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 7 }}>
      {isUpi ? <QRCode value={buildUpiLink(invoice)} size={size} ecl="M" quietZone={8} backgroundColor="white" color="#111827" />
        : <Image source={{ uri: invoice.customQr! }} accessibilityLabel="Payment QR" resizeMode="contain" style={{ width: size + 16, height: size + 16 }} />}
    </View>
    <Text style={{ fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1, color: '#1e293b' }}>{invoice.isPaid ? 'PAYMENT QR' : 'SCAN TO PAY'}</Text>
    <Text style={{ color: '#64748b', fontFamily: fonts.body, fontSize: 10, lineHeight: 16 }}>{invoice.isPaid ? 'Payment received. Thank you.' : 'Pay securely with any UPI app.'}</Text>
    {isUpi && <Text style={{ color: '#475569', fontFamily: fonts.medium, fontSize: 10 }}>{invoice.upiId}</Text>}
  </View>;
}

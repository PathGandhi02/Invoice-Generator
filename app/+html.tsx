import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';
export default function RootHtml({ children }: PropsWithChildren) {
  return <html lang="en"><head><meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" /><meta name="theme-color" content="#0b0f19" /><meta name="description" content="GigaInvoice — invoices and receipts for Maruti Giga Fiber." /><link rel="manifest" href="/manifest.webmanifest" /><title>GigaInvoice · Pro Studio</title><ScrollViewStyleReset /></head><body>{children}</body></html>;
}

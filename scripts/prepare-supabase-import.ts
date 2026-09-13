import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { validateCustomers } from '../src/schemas/customerSchema';
import { parseCalendarDate } from '../src/utils/dates';

async function main() {
  const source = validateCustomers(JSON.parse(await readFile('temp/private-import/customers.json', 'utf8')));
  const fields = ['username', 'full_name', 'email', 'address', 'package', 'expiry_date', 'last_recharge_date'] as const;
  const rows = [fields.join(',')];
  let invalidDates = 0;
  for (const customer of source.customers) {
    rows.push(fields.map(field => {
      let value = customer[field] ?? '';
      if ((field === 'expiry_date' || field === 'last_recharge_date') && value && !parseCalendarDate(value)) { value = ''; invalidDates++; }
      return `"${value.replaceAll('"', '""')}"`;
    }).join(','));
  }
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/customers-import.csv', rows.join('\n') + '\n', 'utf8');
  console.info(`Prepared ${source.customers.length} customers in artifacts/customers-import.csv. Invalid dates left empty: ${invalidDates}. No data was uploaded.`);
}
main().catch(() => { console.error('Unable to prepare import. Run prepare:customers first and check the local dataset.'); process.exitCode = 1; });

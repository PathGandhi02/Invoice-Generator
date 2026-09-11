import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { validateCustomers } from '../src/schemas/customerSchema';

async function candidates(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await candidates(filename));
      else if (entry.name.toLowerCase().endsWith('.json')) files.push(filename);
    }
    return files;
  } catch { return []; }
}

async function main() {
  const explicit = process.argv[2];
  const files = explicit ? [path.resolve(explicit)] : (await Promise.all(
    ['temp', 'input', 'tmp'].map(directory => candidates(path.resolve(directory))),
  )).flat().sort();
  const matches: { file: string; result: ReturnType<typeof validateCustomers> }[] = [];
  for (const file of files) {
    try {
      const result = validateCustomers(JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, '')));
      if (result.customers.length > 0 || (explicit && result.total === 0)) matches.push({ file, result });
      else if (explicit) throw new Error('No valid customer records were found.');
    } catch (error) {
      if (explicit) throw error;
    }
  }
  matches.sort((a, b) => b.result.customers.length - a.result.customers.length);
  const selected = matches[0];
  if (!selected) throw new Error('No matching customer JSON found. Put the supplied file in temp/ or run npm run prepare:customers -- path/to/customers.json. Existing prepared data was not changed.');
  await mkdir('src/data', { recursive: true });
  await writeFile('src/data/customers.json', JSON.stringify(selected.result.customers, null, 2) + '\n', 'utf8');
  console.info(`Customer source: ${path.relative(process.cwd(), selected.file)}\nTotal records: ${selected.result.total}\nValid records: ${selected.result.customers.length}\nInvalid records: ${selected.result.invalid}\nDuplicate usernames: ${selected.result.duplicates}\nCustomer dataset prepared successfully.`);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Customer import failed.'); process.exitCode = 1; });

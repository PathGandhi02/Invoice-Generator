import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NativePdfPipeline, type NativePdfFile, type NativePdfPlatform } from '../src/services/pdf/NativePdfPipeline';
import { createDraft } from '../src/services/InvoiceService';
import { defaultSettings } from '../src/models/BusinessSettings';

const invoice = { ...createDraft(defaultSettings), planName: 'Test Plan', timePeriod: '12 Months', customerName: 'Test', invoiceNumber: '2027-2026/5678' };
function fixture(options: { missing?: boolean; empty?: boolean; invalid?: boolean; copyFails?: boolean; partial?: boolean; unavailable?: boolean } = {}) {
  const files = new Map<string, Uint8Array>();
  const events: string[] = [];
  let sequence = 0;
  const pdf = new TextEncoder().encode('%PDF-1.7 test file');
  function file(uri: string): NativePdfFile {
    return {
      uri, get exists() { return files.has(uri); }, get size() { return files.get(uri)?.length ?? 0; },
      header: () => files.get(uri)!.slice(0, 5),
      delete() { events.push('delete'); files.delete(uri); },
      async copy(destination) {
        events.push('copy start');
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.ok(files.has(uri), 'copy source must exist until async copying completes');
        if (options.copyFails) throw new Error('Disk full');
        files.set(destination.uri, options.partial ? pdf.slice(0, 6) : files.get(uri)!);
        events.push('copy end');
      },
    };
  }
  const platform: NativePdfPlatform = {
    async render() {
      const uri = `file:///temp/${++sequence}.pdf`;
      if (!options.missing) files.set(uri, options.empty ? new Uint8Array() : options.invalid ? new TextEncoder().encode('Not a PDF') : pdf);
      return { uri, numberOfPages: 1 };
    },
    file, destination: name => file(`file:///documents/invoices/${sequence}/${name}`),
    sharingAvailable: async () => !options.unavailable,
    async share(uri) { assert.deepEqual(files.get(uri), pdf); events.push('share'); },
    async print(uri) { assert.deepEqual(files.get(uri), pdf); events.push('print'); },
    log() {},
  };
  return { pipeline: new NativePdfPipeline(platform), files, events, platform };
}

test('native export waits for async copy before deleting the temporary file or returning a URI', async () => {
  const { pipeline, files, events } = fixture();
  const result = await pipeline.generate(invoice);
  assert.equal(result.filename, 'Invoice_2027-2026_5678.pdf');
  assert.ok(files.has(result.uri));
  assert.deepEqual(events, ['copy start', 'copy end', 'delete']);
});
test('native sharing receives the verified named receipt and retains it after the sheet closes', async () => {
  const { pipeline, files, events } = fixture();
  const result = await pipeline.share({ ...invoice, isPaid: true });
  assert.equal(result.filename, 'Receipt_2027-2026_5678.pdf');
  assert.ok(files.has(result.uri));
  assert.equal(events.at(-1), 'share');
});
for (const reason of ['missing', 'empty', 'invalid', 'copyFails', 'partial'] as const) {
  test(`native ${reason} output cannot report success or reach the share sheet`, async () => {
    const { pipeline, events, files } = fixture({ [reason]: true });
    await assert.rejects(pipeline.share(invoice), /PDF/);
    assert.ok(!events.includes('share'));
    assert.equal(files.size, 0);
  });
}
test('native double taps cannot race export against another share, and the lock recovers', async () => {
  const { pipeline } = fixture();
  const pending = pipeline.generate(invoice);
  await assert.rejects(pipeline.share(invoice), /already in progress/);
  const first = await pending;
  const second = await pipeline.generate(invoice);
  assert.notEqual(first.uri, second.uri);
});
test('native unavailable sharing does not generate an inaccessible file', async () => {
  const { pipeline, files } = fixture({ unavailable: true });
  await assert.rejects(pipeline.share(invoice), /Sharing is unavailable/);
  assert.equal(files.size, 0);
});
test('native print uses the same verified PDF pipeline', async () => {
  const { pipeline, events } = fixture();
  await pipeline.print(invoice);
  assert.equal(events.at(-1), 'print');
});

test('stalled native renderer times out, allows retry and cleans up late output', async () => {
  const { platform, files, events } = fixture();
  const render = platform.render.bind(platform);
  let release: (() => void) | undefined;
  let stalled = true;
  platform.render = async html => {
    if (stalled) { stalled = false; await new Promise<void>(resolve => { release = resolve; }); }
    return render(html);
  };
  const pipeline = new NativePdfPipeline(platform, 25);
  await assert.rejects(pipeline.generate(invoice), /timed out/);
  const retry = await pipeline.generate(invoice);
  assert.ok(files.has(retry.uri));
  release!();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(files.size, 1);
  assert.equal(events.at(-1), 'delete');
});
test('native renderer must return a local URI and at least one page', async () => {
  for (const result of [{ uri: '', numberOfPages: 1 }, { uri: 'https://example.com/file.pdf', numberOfPages: 1 }, { uri: 'file:///empty.pdf', numberOfPages: 0 }]) {
    const { platform } = fixture();
    platform.render = async () => result;
    await assert.rejects(new NativePdfPipeline(platform).generate(invoice), /PDF/);
  }
});

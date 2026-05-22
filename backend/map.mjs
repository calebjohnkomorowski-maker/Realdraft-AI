async function main() {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const fs = await import("fs");
  const data = new Uint8Array(fs.readFileSync("C:\\Users\\caleb\\Jarvis AI\\realdraft-ai\\backend\\templates\\pa-asr-form.pdf"));
  const doc = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;

  // Change p range to dump any page range you need for coordinate mapping
  for (let p = 1; p <= 3; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    console.log(`\n===== PAGE ${p} =====`);
    content.items.forEach(item => {
      if (item.str && item.str.trim()) {
        const x = Math.round(item.transform[4]);
        const y = Math.round(item.transform[5]);
        console.log(`[${x},${y}] "${item.str.substring(0,90)}"`);
      }
    });
  }
}
main().catch(e => console.error(e.stack));

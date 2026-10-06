/**
 * Script pour générer un PDF prêt à envoyer au fournisseur :
 * chaque QR code + son label (#1, #2, ...) sur une grille, prêt à imprimer.
 *
 * UTILISATION :
 * 1. Modifie la variable BASE_URL ci-dessous avec TON vrai domaine Vercel
 *    (ex: "https://nfc-manager.vercel.app")
 * 2. Lance : node scripts/generate-print-pdf.js
 * 3. Le fichier "cartes-a-imprimer.pdf" est généré à la racine du projet
 */

const QRCode = require("qrcode");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");

// ===== À MODIFIER =====
const BASE_URL = "https://TON-DOMAINE.vercel.app"; // <-- remplace ici
const PREFIX = "carte"; // doit correspondre au préfixe utilisé dans l'app
const COUNT = 20; // nombre de cartes
// =======================

async function main() {
  if (BASE_URL.includes("TON-DOMAINE")) {
    console.error("⚠️  Modifie BASE_URL dans le script avant de le lancer !");
    process.exit(1);
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const cols = 4;
  const rows = 5; // 4x5 = 20 cartes par page
  const pageWidth = 595; // A4 en points
  const pageHeight = 842;
  const margin = 30;
  const cellWidth = (pageWidth - margin * 2) / cols;
  const cellHeight = (pageHeight - margin * 2) / rows;
  const qrSize = Math.min(cellWidth, cellHeight) * 0.65;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  for (let i = 1; i <= COUNT; i++) {
    const slug = `${PREFIX}-${i}`;
    const label = `#${i}`;
    const targetUrl = `${BASE_URL}/r/${slug}`;

    const qrPngDataUrl = await QRCode.toDataURL(targetUrl, { margin: 1, width: 300 });
    const qrImageBytes = Buffer.from(qrPngDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrImageBytes);

    const col = (i - 1) % cols;
    const row = Math.floor((i - 1) / cols);

    const cellX = margin + col * cellWidth;
    const cellY = pageHeight - margin - (row + 1) * cellHeight;

    const qrX = cellX + (cellWidth - qrSize) / 2;
    const qrY = cellY + (cellHeight - qrSize) / 2 + 10;

    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const textWidth = font.widthOfTextAtSize(label, 12);
    page.drawText(label, {
      x: cellX + (cellWidth - textWidth) / 2,
      y: qrY - 16,
      size: 12,
      font,
      color: rgb(0, 0, 0),
    });

    console.log(`✔ ${slug} -> ${label}`);
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync("cartes-a-imprimer.pdf", pdfBytes);
  console.log("\n✅ Fichier généré : cartes-a-imprimer.pdf");
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});

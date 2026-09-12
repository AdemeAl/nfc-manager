export const metadata = {
  title: "Gestionnaire QR / NFC",
  description: "Gère tes cartes NFC et QR codes pour tes clients",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f7" }}>
        {children}
      </body>
    </html>
  );
}

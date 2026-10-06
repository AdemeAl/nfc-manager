import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";

export const metadata = {
  title: "Cartes avis Google",
  description: "Suivi et gestion des cartes NFC et QR codes d'avis Google",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

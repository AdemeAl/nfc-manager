import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";
import RegisterSW from "./components/RegisterSW";

export const metadata = {
  title: "Cartes avis Google",
  description: "Suivi et gestion des cartes NFC et QR codes d'avis Google",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Cartes NFC", statusBarStyle: "default" },
};

export const viewport = {
  themeColor: "#243f8f",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

import Wave from "../components/Wave";

export const metadata = {
  title: "Carte pas encore activée",
  robots: { index: false, follow: false },
};

const MESSAGES = {
  blank: {
    title: "Cette carte n'est pas encore activée.",
    text: "Le commerce qui vous l'a remise doit encore la relier à sa page d'avis Google. Réessayez dans quelques minutes.",
  },
  unknown: {
    title: "Ce lien ne correspond à aucune carte.",
    text: "Vérifiez que vous avez bien scanné la carte du commerce. S'il se répète, prévenez le commerce.",
  },
  invalid: {
    title: "Le lien de cette carte est incorrect.",
    text: "Prévenez le commerce : sa carte doit être reconfigurée.",
  },
};

export default async function InactivePage({ searchParams }) {
  const { reason } = await searchParams;
  const message = MESSAGES[reason] || MESSAGES.blank;

  const businessName = process.env.BUSINESS_NAME;
  const email = process.env.CONTACT_EMAIL;
  const phone = process.env.CONTACT_PHONE;

  return (
    <main>
      <div className="band">
        <div className="band-inner">
          <h1 className="band-title">{message.title}</h1>
        </div>
        <Wave />
      </div>
      <div className="page-body">
        <p className="lead">{message.text}</p>
        {(email || phone) && (
          <p className="muted">
            Une question ?{" "}
            {email && <a href={`mailto:${email}`}>{email}</a>}
            {email && phone && " ou "}
            {phone && <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>}
          </p>
        )}
        {businessName && <p className="muted">{businessName}</p>}
      </div>
    </main>
  );
}

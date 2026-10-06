import Wave from "../../components/Wave";
import { getLink, getScanStats } from "@/lib/redis";
import { safeEqual } from "@/lib/auth";
import { dayKey, shiftDay, weekdayInitial, longDate, shortDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Suivi de votre carte",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const plural = (n, one, many) => (n === 1 ? one : many);

export default async function StatsPage({ params, searchParams }) {
  const { slug } = await params;
  const { key } = await searchParams;

  const link = await getLink(slug);
  // Même message que le jeton soit faux ou la carte inexistante : on ne révèle rien.
  if (!link || typeof key !== "string" || !safeEqual(key, link.clientToken)) {
    return <Unavailable />;
  }

  const stats = await getScanStats(slug);
  const byDay = stats.byDay || {};
  const today = dayKey();
  const count = (daysAgo) => byDay[shiftDay(today, -daysAgo)] || 0;
  const sum = (from, to) => {
    let total = 0;
    for (let i = from; i <= to; i++) total += count(i);
    return total;
  };

  const last30 = sum(0, 29);
  const thisWeek = sum(0, 6);
  const previousWeek = sum(7, 13);
  const total = stats.total || 0;

  // 14 jours, du plus ancien au plus récent
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const dayStr = shiftDay(today, -i);
    days.push({ key: dayStr, count: byDay[dayStr] || 0, isToday: i === 0 });
  }
  const peak = Math.max(...days.map((d) => d.count));
  const bestDay = peak > 0 ? days.find((d) => d.count === peak) : null;

  const headline =
    last30 === 0
      ? total === 0
        ? "Votre carte n'a pas encore été scannée."
        : "Votre carte n'a pas été scannée ces 30 derniers jours."
      : `Votre carte a été scannée ${last30} fois ces 30 derniers jours.`;

  const difference = thisWeek - previousWeek;
  const trend =
    previousWeek === 0
      ? null
      : difference === 0
        ? { dir: "same", text: "Autant que la semaine précédente" }
        : difference > 0
          ? { dir: "up", text: `${difference} de plus que la semaine précédente` }
          : { dir: "down", text: `${Math.abs(difference)} de moins que la semaine précédente` };

  return (
    <main>
      <div className="band">
        <div className="band-inner">
          {link.businessName && <p className="band-name">{link.businessName}</p>}
          <h1 className="band-title">{headline}</h1>
        </div>
        <Wave />
      </div>

      <div className="page-body">
        <dl className="facts">
          <div className="fact">
            <dt>Ces 7 derniers jours</dt>
            <dd>
              <span className="fact-number">{thisWeek}</span>
              {trend && <span className={`trend trend-${trend.dir}`}>{trend.text}</span>}
            </dd>
          </div>
          <div className="fact">
            <dt>Les 7 jours d'avant</dt>
            <dd>
              <span className="fact-number">{previousWeek}</span>
            </dd>
          </div>
          <div className="fact">
            <dt>Depuis l'activation de la carte</dt>
            <dd>
              <span className="fact-number">{total}</span>
            </dd>
          </div>
        </dl>

        <figure className="chart-block">
          <figcaption className="chart-title">
            Scans par jour, du {shortDate(days[0].key)} au {shortDate(days[days.length - 1].key)}
          </figcaption>
          <div className="chart" aria-hidden="true">
            {days.map((d) => (
              <div className="chart-col" key={d.key}>
                <div className="chart-track">
                  <div
                    className={`chart-bar${d.count === peak && peak > 0 ? " is-peak" : ""}${d.count === 0 ? " is-empty" : ""}`}
                    style={{ "--value": peak > 0 ? Math.round((d.count / peak) * 100) : 0 }}
                  >
                    {d.count > 0 && d.count === peak && <span className="chart-value">{d.count}</span>}
                  </div>
                </div>
                <span className={`chart-day${d.isToday ? " is-today" : ""}`}>{weekdayInitial(d.key)}</span>
              </div>
            ))}
          </div>
          <table className="visually-hidden">
            <caption>Scans par jour</caption>
            <thead>
              <tr>
                <th scope="col">Jour</th>
                <th scope="col">Scans</th>
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.key}>
                  <th scope="row">{longDate(d.key)}</th>
                  <td>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bestDay && (
            <p className="chart-note">
              Meilleur jour : {longDate(bestDay.key)}, {bestDay.count} {plural(bestDay.count, "scan", "scans")}.
            </p>
          )}
        </figure>

        <p className="muted explain">
          Un scan, c'est un client qui a posé son téléphone sur la carte ou scanné son QR code, puis ouvert votre page
          d'avis Google. Cela ne veut pas dire qu'il a laissé un avis. Les visites de robots et les passages répétés en
          quelques secondes ne sont pas comptés.
        </p>

        <Contact />
      </div>
    </main>
  );
}

function Contact() {
  const businessName = process.env.BUSINESS_NAME;
  const email = process.env.CONTACT_EMAIL;
  const phone = process.env.CONTACT_PHONE;
  if (!email && !phone) return null;
  return (
    <p className="muted">
      Une question sur votre carte ?{" "}
      {email && <a href={`mailto:${email}`}>{email}</a>}
      {email && phone && " ou "}
      {phone && <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>}
      {businessName ? ` — ${businessName}` : ""}
    </p>
  );
}

function Unavailable() {
  return (
    <main>
      <div className="band">
        <div className="band-inner">
          <h1 className="band-title">Ce lien de suivi n'est pas valide.</h1>
        </div>
        <Wave />
      </div>
      <div className="page-body">
        <p className="lead">
          Utilisez le lien exact qui vous a été envoyé. S'il ne fonctionne plus, demandez-en un nouveau.
        </p>
        <Contact />
      </div>
    </main>
  );
}

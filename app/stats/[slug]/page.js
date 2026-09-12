"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function StatsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const key = searchParams.get("key");

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !key) {
      setError("Lien invalide.");
      return;
    }
    fetch(`/api/public-stats/${slug}?key=${key}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Erreur");
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Erreur de connexion."));
  }, [slug, key]);

  if (error) {
    return (
      <div style={styles.center}>
        <p>{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={styles.center}>
        <p>Chargement...</p>
      </div>
    );
  }

  // Prépare les 14 derniers jours pour le petit graphique
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), count: data.byDay[key] || 0 });
  }
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  const thisWeek = days.slice(7).reduce((sum, d) => sum + d.count, 0);

  return (
    <div style={styles.page}>
      <h1 style={{ marginBottom: 4 }}>{data.businessName || "Votre carte avis Google"}</h1>
      <p style={{ color: "#777", marginTop: 0 }}>Suivi en temps réel de votre carte</p>

      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{data.total}</div>
          <div style={styles.statLabel}>scans au total</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{thisWeek}</div>
          <div style={styles.statLabel}>cette semaine</div>
        </div>
      </div>

      <h3 style={{ marginTop: 30 }}>Derniers 14 jours</h3>
      <div style={styles.chart}>
        {days.map((d) => (
          <div key={d.date} style={styles.barWrapper}>
            <div
              style={{
                ...styles.bar,
                height: `${Math.max((d.count / maxCount) * 100, 4)}%`,
              }}
              title={`${d.count} scan(s)`}
            />
            <div style={styles.barLabel}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 600, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" },
  statsRow: { display: "flex", gap: 16, marginTop: 20 },
  statCard: {
    flex: 1,
    background: "#111",
    color: "white",
    borderRadius: 14,
    padding: "20px 16px",
    textAlign: "center",
  },
  statNumber: { fontSize: 32, fontWeight: 700 },
  statLabel: { fontSize: 13, opacity: 0.8, marginTop: 4 },
  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 4,
    height: 160,
    borderBottom: "1px solid #ddd",
    paddingBottom: 4,
    marginTop: 10,
  },
  barWrapper: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" },
  bar: { width: "70%", background: "#111", borderRadius: "4px 4px 0 0", minHeight: 3 },
  barLabel: { fontSize: 9, color: "#999", marginTop: 4, transform: "rotate(-40deg)", whiteSpace: "nowrap" },
};

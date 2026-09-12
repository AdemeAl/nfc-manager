"use client";

import { useEffect, useState, useCallback } from "react";

const googleMapsSearchUrl = (businessName) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName.trim())}`;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [links, setLinks] = useState({});
  const [loading, setLoading] = useState(false);
  const [newDestination, setNewDestination] = useState("");
  const [newBusinessName, setNewBusinessName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [qrPreview, setQrPreview] = useState({}); // slug -> blob url
  const [nfcStatus, setNfcStatus] = useState({}); // slug -> message
  const [batchCount, setBatchCount] = useState(20);
  const [batchPrefix, setBatchPrefix] = useState("carte");
  const [batchLoading, setBatchLoading] = useState(false);

  // Récupère le mot de passe déjà sauvegardé localement au chargement
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_password") : null;
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  const fetchLinks = useCallback(async (pwd) => {
    setLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/links", {
        headers: { "x-admin-password": pwd },
      });
      if (res.status === 401) {
        setAuthError("Mot de passe incorrect.");
        setAuthed(false);
        localStorage.removeItem("admin_password");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLinks(data.links || {});
      setAuthed(true);
      localStorage.setItem("admin_password", pwd);
    } catch (e) {
      setAuthError("Erreur de connexion.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed && password) {
      fetchLinks(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetchLinks(password);
  };

  const handleBatchCreate = async () => {
    if (batchCount < 1) return;
    setBatchLoading(true);
    try {
      // 1. Crée les N liens vierges
      const createRes = await fetch("/api/links/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ count: batchCount, prefix: batchPrefix }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        alert(createData.error || "Erreur lors de la création du lot");
        setBatchLoading(false);
        return;
      }
      const slugs = createData.created.map((c) => c.slug);

      // 2. Télécharge le ZIP avec tous les QR codes correspondants
      const zipRes = await fetch("/api/qrcode/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ slugs }),
      });
      if (!zipRes.ok) {
        alert("Liens créés, mais erreur lors de la génération du ZIP.");
        fetchLinks(password);
        setBatchLoading(false);
        return;
      }
      const blob = await zipRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-codes-${batchPrefix}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      fetchLinks(password);
    } catch (e) {
      alert("Erreur lors de la création du lot.");
    }
    setBatchLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDestination) return;
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({
        destination: newDestination,
        businessName: newBusinessName,
        customSlug: newSlug,
      }),
    });
    if (res.ok) {
      setNewDestination("");
      setNewBusinessName("");
      setNewSlug("");
      fetchLinks(password);
    } else {
      alert("Erreur lors de la création du lien.");
    }
  };

  const handleUpdate = async (slug, destination, businessName) => {
    const res = await fetch(`/api/links/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ destination, businessName }),
    });
    if (res.ok) {
      fetchLinks(password);
    } else {
      alert("Erreur lors de la mise à jour.");
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm(`Supprimer le lien "${slug}" ?`)) return;
    const res = await fetch(`/api/links/${slug}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    if (res.ok) fetchLinks(password);
  };

  const loadQr = async (slug) => {
    const res = await fetch(`/api/qrcode/${slug}`, {
      headers: { "x-admin-password": password },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setQrPreview((prev) => ({ ...prev, [slug]: url }));
  };

  const writeNfc = async (slug) => {
    const targetUrl = `${window.location.origin}/r/${slug}`;
    if (!("NDEFReader" in window)) {
      setNfcStatus((prev) => ({
        ...prev,
        [slug]: "Web NFC non supporté sur cet appareil/navigateur (fonctionne sur Chrome Android uniquement).",
      }));
      return;
    }
    try {
      setNfcStatus((prev) => ({ ...prev, [slug]: "Approchez la carte NFC du téléphone..." }));
      const ndef = new window.NDEFReader();
      await ndef.write({ records: [{ recordType: "url", data: targetUrl }] });
      setNfcStatus((prev) => ({ ...prev, [slug]: "✅ Puce NFC écrite avec succès !" }));
    } catch (err) {
      setNfcStatus((prev) => ({ ...prev, [slug]: `Erreur : ${err.message}` }));
    }
  };

  if (!authed) {
    return (
      <div style={styles.centerScreen}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <h2>Accès admin</h2>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
          {authError && <p style={{ color: "red" }}>{authError}</p>}
        </form>
      </div>
    );
  }

  const slugs = Object.keys(links).sort((a, b) => (links[b].createdAt || "").localeCompare(links[a].createdAt || ""));

  const handleLogout = () => {
    localStorage.removeItem("admin_password");
    setPassword("");
    setAuthed(false);
    setLinks({});
  };

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <h1>Gestionnaire de liens NFC / QR</h1>
        <button onClick={handleLogout} style={styles.secondaryButton}>
          Se déconnecter
        </button>
      </div>
      <p style={{ color: "#555" }}>
        Chaque lien ci-dessous correspond à une URL fixe (celle à mettre sur le QR code imprimé et à écrire sur la puce NFC).
        Tu peux changer sa destination à tout moment sans réimprimer la carte.
      </p>

      <div style={styles.card}>
        <h3>Créer un lot de cartes vierges (avant réception du fournisseur)</h3>
        <p style={{ fontSize: 13, color: "#777" }}>
          Génère d'un coup plusieurs liens fixes + leurs QR codes en ZIP, à envoyer directement à ton
          fournisseur pour impression. Tu assigneras chaque carte à un commerce plus tard, sans jamais
          changer le QR imprimé.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="number"
            min={1}
            max={200}
            value={batchCount}
            onChange={(e) => setBatchCount(e.target.value)}
            placeholder="Nombre de cartes"
            style={{ ...styles.input, width: 140 }}
          />
          <input
            value={batchPrefix}
            onChange={(e) => setBatchPrefix(e.target.value)}
            placeholder="Préfixe (ex: carte)"
            style={{ ...styles.input, width: 160 }}
          />
        </div>
        <button onClick={handleBatchCreate} style={styles.button} disabled={batchLoading}>
          {batchLoading ? "Génération..." : `Créer ${batchCount} cartes + télécharger les QR (ZIP)`}
        </button>
      </div>

      <form onSubmit={handleCreate} style={styles.card}>
        <h3>Créer un nouveau lien</h3>
        <input
          placeholder="Nom du commerce (ex: Salon Zen)"
          value={newBusinessName}
          onChange={(e) => setNewBusinessName(e.target.value)}
          style={styles.input}
        />
        {newBusinessName.trim() && (
          <a
            href={googleMapsSearchUrl(newBusinessName)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.mapsButton}
          >
            Rechercher ce commerce sur Google Maps ↗
          </a>
        )}
        <p style={styles.helpText}>
          Ouvre la bonne fiche, récupère son lien « Demander des avis », puis colle-le ci-dessous.
        </p>
        <input
          placeholder="Colle ici le lien direct pour laisser un avis Google"
          value={newDestination}
          onChange={(e) => setNewDestination(e.target.value)}
          style={styles.input}
          required
        />
        <input
          placeholder="Identifiant personnalisé (optionnel, ex: carte1)"
          value={newSlug}
          onChange={(e) => setNewSlug(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Créer le lien
        </button>
      </form>

      <h3 style={{ marginTop: 32 }}>Mes liens ({slugs.length})</h3>
      {loading && <p>Chargement...</p>}

      {slugs.map((slug) => {
        const link = links[slug];
        const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/r/${slug}` : "";
        const statsUrl =
          typeof window !== "undefined" ? `${window.location.origin}/stats/${slug}?key=${link.clientToken}` : "";
        const isAssigned = !!link.destination;
        return (
          <div key={slug} style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{link.businessName || "(sans nom)"}</strong>{" "}
                <span style={isAssigned ? styles.badgeAssigned : styles.badgeBlank}>
                  {isAssigned ? "Assignée" : "Vierge"}
                </span>
              </div>
              <button onClick={() => handleDelete(slug)} style={styles.deleteButton}>
                Supprimer
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#777", wordBreak: "break-all" }}>
              URL fixe (à imprimer / écrire en NFC) : <b>{publicUrl}</b>
            </p>
            <EditableRow
              slug={slug}
              link={link}
              password={password}
              onSave={(destination, businessName) => handleUpdate(slug, destination, businessName)}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => loadQr(slug)} style={styles.secondaryButton}>
                Générer QR code
              </button>
              <button onClick={() => writeNfc(slug)} style={styles.secondaryButton}>
                Écrire sur puce NFC
              </button>
              {isAssigned && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(statsUrl);
                    alert("Lien stats copié ! Envoie-le à ton client.");
                  }}
                  style={styles.secondaryButton}
                >
                  Copier le lien stats client
                </button>
              )}
            </div>
            {qrPreview[slug] && (
              <div style={{ marginTop: 10 }}>
                <img src={qrPreview[slug]} alt={`QR ${slug}`} width={150} height={150} />
                <br />
                <a href={qrPreview[slug]} download={`qr-${slug}.png`}>
                  Télécharger le PNG
                </a>
              </div>
            )}
            {nfcStatus[slug] && <p style={{ fontSize: 13, marginTop: 6 }}>{nfcStatus[slug]}</p>}
          </div>
        );
      })}
    </div>
  );
}

function EditableRow({ slug, link, password, onSave }) {
  const [destination, setDestination] = useState(link.destination || "");
  const [businessName, setBusinessName] = useState(link.businessName || "");
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Nom du commerce"
          style={{ ...styles.input, flex: 1, minWidth: 150, marginBottom: 0 }}
        />
        {businessName.trim() && (
          <a
            href={googleMapsSearchUrl(businessName)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.mapsButtonCompact}
          >
            Chercher sur Maps ↗
          </a>
        )}
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Nouvelle destination"
          style={{ ...styles.input, flex: 2, minWidth: 200, marginBottom: 0 }}
        />
        <button onClick={() => onSave(destination, businessName)} style={styles.button}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 700, margin: "0 auto", padding: 20 },
  centerScreen: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  loginCard: {
    background: "white",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: 280,
  },
  card: {
    background: "white",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    marginBottom: 14,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  button: {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: "#111",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #111",
    background: "white",
    color: "#111",
    cursor: "pointer",
    fontSize: 13,
  },
  mapsButton: {
    display: "inline-block",
    marginBottom: 8,
    padding: "9px 12px",
    borderRadius: 8,
    background: "#e8f0fe",
    color: "#174ea6",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
  },
  mapsButtonCompact: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 12px",
    borderRadius: 8,
    background: "#e8f0fe",
    color: "#174ea6",
    textDecoration: "none",
    fontSize: 12,
    fontWeight: 600,
  },
  helpText: {
    margin: "0 0 8px",
    color: "#666",
    fontSize: 12,
    lineHeight: 1.4,
  },
  deleteButton: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #d33",
    background: "white",
    color: "#d33",
    cursor: "pointer",
    fontSize: 12,
  },
  badgeAssigned: {
    fontSize: 11,
    background: "#e6f4ea",
    color: "#1e7e34",
    padding: "2px 8px",
    borderRadius: 20,
    fontWeight: 600,
  },
  badgeBlank: {
    fontSize: 11,
    background: "#f1f1f1",
    color: "#777",
    padding: "2px 8px",
    borderRadius: 20,
    fontWeight: 600,
  },
};

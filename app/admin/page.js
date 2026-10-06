"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SESSION_KEY = "admin_password";

const FILTERS = [
  ["all", "Toutes"],
  ["blank", "Vierges"],
  ["assigned", "Assignées"],
];

// --- Utilitaires -------------------------------------------------------------

function api(path, { password, method = "GET", body } = {}) {
  return fetch(path, {
    method,
    cache: "no-store",
    headers: {
      "x-admin-password": password,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiJson(path, options) {
  const res = await api(path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Erreur ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const normalize = (text) =>
  (text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// --- Page --------------------------------------------------------------------

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [links, setLinks] = useState({});
  const [scans, setScans] = useState({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [openSlug, setOpenSlug] = useState(null);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);

  const notify = useCallback((message) => {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 3500);
  }, []);

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const load = useCallback(async (pwd) => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await apiJson("/api/links", { password: pwd });
      setLinks(data.links || {});
      setScans(data.scans || {});
      setAuthed(true);
      setAuthError("");
      try {
        sessionStorage.setItem(SESSION_KEY, pwd);
      } catch {}
    } catch (error) {
      if (error.status === 401) {
        setAuthed(false);
        setAuthError("Mot de passe incorrect.");
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {}
      } else {
        // Souvent un souci de configuration (base de données, variable manquante) : on affiche le vrai message.
        setAuthError(error.message);
        setLoadError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Le mot de passe est gardé le temps de l'onglet (il disparaît à la fermeture).
  useEffect(() => {
    let saved = null;
    try {
      saved = sessionStorage.getItem(SESSION_KEY);
    } catch {}
    if (saved) {
      setPassword(saved);
      load(saved).finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, [load]);

  const slugs = useMemo(
    () => Object.keys(links).sort((a, b) => a.localeCompare(b, "fr", { numeric: true })),
    [links]
  );

  const counts = useMemo(() => {
    const assigned = slugs.filter((slug) => links[slug].destination).length;
    return { all: slugs.length, assigned, blank: slugs.length - assigned };
  }, [slugs, links]);

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return slugs.filter((slug) => {
      const link = links[slug];
      const isAssigned = Boolean(link.destination);
      if (filter === "assigned" && !isAssigned) return false;
      if (filter === "blank" && isAssigned) return false;
      if (!q) return true;
      return normalize(slug).includes(q) || normalize(link.businessName).includes(q);
    });
  }, [slugs, links, query, filter]);

  const reload = useCallback(() => load(password), [load, password]);

  const logout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
    setPassword("");
    setAuthed(false);
    setLinks({});
    setScans({});
    setOpenSlug(null);
  };

  const exportCsv = () => {
    const origin = window.location.origin;
    const header = ["carte", "commerce", "statut", "lien_fixe", "destination", "scans", "lien_suivi", "cree_le"];
    const rows = slugs.map((slug) => {
      const link = links[slug];
      return [
        slug,
        link.businessName || "",
        link.destination ? "assignée" : "vierge",
        `${origin}/r/${slug}`,
        link.destination || "",
        scans[slug] || 0,
        link.destination ? `${origin}/stats/${slug}?key=${link.clientToken}` : "",
        link.createdAt || "",
      ];
    });
    const escape = (value) => `"${String(value).replace(/"/g, '""')}"`;
    // BOM + point-virgule : s'ouvre correctement dans Excel en français.
    const csv = "﻿" + [header, ...rows].map((row) => row.map(escape).join(";")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `cartes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (booting) return null;

  if (!authed) {
    return (
      <main className="login">
        <h1 className="login-title">Accès administrateur</h1>
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            load(password);
          }}
        >
          <div>
            <label className="label" htmlFor="password">
              Mot de passe
            </label>
            <input
              id="password"
              className="field"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || !password}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
          {authError && (
            <p className="error-text" role="alert">
              {authError}
            </p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="admin">
      <header className="admin-head">
        <div>
          <h1 className="admin-title">Cartes NFC</h1>
          <p className="admin-intro">
            Chaque carte a un lien fixe, imprimé en QR code et écrit sur la puce. Tu changes sa destination quand tu la
            vends, sans rien réimprimer.
          </p>
        </div>
        <button className="btn btn-quiet" type="button" onClick={logout}>
          Se déconnecter
        </button>
      </header>

      <details className="panel">
        <summary className="panel-summary">Créer un lot de cartes vierges</summary>
        <BatchPanel password={password} onDone={reload} notify={notify} />
      </details>

      <details className="panel">
        <summary className="panel-summary">Ajouter une carte pour un commerce</summary>
        <NewCardPanel password={password} onDone={reload} notify={notify} />
      </details>

      <div className="toolbar">
        <div className="filters" role="group" aria-label="Filtrer par statut">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className="filter"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
              <span className="filter-count">{counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="search">
          <label className="visually-hidden" htmlFor="search">
            Rechercher une carte ou un commerce
          </label>
          <input
            id="search"
            type="search"
            className="field"
            placeholder="Rechercher une carte ou un commerce"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button className="btn" type="button" onClick={exportCsv} disabled={slugs.length === 0}>
          Exporter en CSV
        </button>
      </div>

      {loadError && (
        <p className="error-text" role="alert">
          {loadError}{" "}
          <button className="btn btn-quiet" type="button" onClick={reload}>
            Réessayer
          </button>
        </p>
      )}
      {!loadError && loading && slugs.length === 0 && <p className="muted">Chargement…</p>}

      {!loading && !loadError && slugs.length === 0 ? (
        <p className="empty">Aucune carte pour l'instant. Crée un lot de cartes vierges pour commencer.</p>
      ) : slugs.length > 0 && visible.length === 0 ? (
        <p className="empty">Aucune carte ne correspond à cette recherche.</p>
      ) : (
        <ul className="list">
          {visible.map((slug) => (
            <CardItem
              key={slug}
              slug={slug}
              link={links[slug]}
              scans={scans[slug] || 0}
              open={openSlug === slug}
              onToggle={() => setOpenSlug(openSlug === slug ? null : slug)}
              password={password}
              reload={reload}
              notify={notify}
            />
          ))}
        </ul>
      )}

      <div role="status" aria-live="polite">
        {notice && <p className="notice">{notice}</p>}
      </div>
    </main>
  );
}

// --- Création d'un lot -------------------------------------------------------

function BatchPanel({ password, onDone, notify }) {
  const [count, setCount] = useState(20);
  const [prefix, setPrefix] = useState("carte");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { created } = await apiJson("/api/links/batch", {
        password,
        method: "POST",
        body: { count: Number(count), prefix },
      });
      await onDone();
      if (created.length === 0) {
        notify("Aucune carte créée.");
        return;
      }
      const res = await api("/api/qrcode/batch", { password, method: "POST", body: { slugs: created } });
      if (!res.ok) {
        throw new Error("Les cartes sont créées, mais le ZIP des QR codes n'a pas pu être généré. Ouvre chaque carte pour récupérer son QR code.");
      }
      const first = created[0];
      const last = created[created.length - 1];
      downloadBlob(await res.blob(), `qr-codes-${first}-a-${last}.zip`);
      notify(`${created.length} cartes créées : ${first} à ${last}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel-body" onSubmit={submit}>
      <p className="hint">
        Crée des cartes numérotées à la suite de celles qui existent déjà, et télécharge leurs QR codes à envoyer au
        fournisseur. Une carte existante n'est jamais modifiée.
      </p>
      <div className="form-row">
        <div>
          <label className="label" htmlFor="batch-count">
            Nombre de cartes
          </label>
          <input
            id="batch-count"
            className="field"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(event) => setCount(event.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="batch-prefix">
            Préfixe
          </label>
          <input
            id="batch-prefix"
            className="field"
            value={prefix}
            onChange={(event) => setPrefix(event.target.value)}
          />
        </div>
      </div>
      <div>
        <button className="btn btn-primary" type="submit" disabled={busy || !count}>
          {busy ? "Création…" : "Créer le lot et télécharger les QR codes"}
        </button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// --- Ajout d'une carte pour un commerce -------------------------------------

function NewCardPanel({ password, onDone, notify }) {
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await apiJson("/api/links", {
        password,
        method: "POST",
        body: { destination: destination.trim(), businessName: name.trim(), customSlug: slug },
      });
      notify(`Carte « ${data.slug} » créée.`);
      setName("");
      setDestination("");
      setSlug("");
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel-body" onSubmit={submit}>
      <div className="form-row">
        <PlaceField
          id="new-name"
          label="Commerce"
          placeholder="Chercher le commerce sur Google"
          value={name}
          onChange={setName}
          onPick={(place) => {
            setName(place.name);
            setDestination(place.reviewUrl);
          }}
          password={password}
        />
        <div>
          <label className="label" htmlFor="new-destination">
            Lien d'avis Google
          </label>
          <input
            id="new-destination"
            className="field"
            inputMode="url"
            required
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="https://search.google.com/local/writereview?placeid=…"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="new-slug">
          Identifiant de la carte (facultatif)
        </label>
        <input
          id="new-slug"
          className="field"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="Généré automatiquement si vide"
        />
      </div>
      <div>
        <button className="btn btn-primary" type="submit" disabled={busy || !destination}>
          {busy ? "Création…" : "Créer la carte"}
        </button>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// --- Recherche d'un commerce (Google Places) --------------------------------

function PlaceField({ id, label, value, onChange, onPick, password, placeholder }) {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [error, setError] = useState("");
  // On ne cherche que si la personne a tapé : ouvrir une carte déjà remplie ne doit pas
  // déclencher d'appel (chaque recherche est une requête Google facturable).
  const touched = useRef(false);

  useEffect(() => {
    if (!touched.current) return;
    const text = value.trim();
    if (text.length < 3) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      setError("");
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(text)}`, {
          headers: { "x-admin-password": password },
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Recherche impossible");
        setResults(data.results || []);
        setStatus("idle");
      } catch (err) {
        if (err.name === "AbortError") return;
        setResults([]);
        setError(err.message);
        setStatus("error");
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, password]);

  const pick = (place) => {
    touched.current = false;
    setResults([]);
    onPick(place);
  };

  return (
    <div className="field-wrap">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          touched.current = true;
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setResults([]);
        }}
      />
      {status === "loading" && <p className="hint">Recherche en cours…</p>}
      {status === "error" && (
        <p className="hint error-text" role="alert">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <ul className="places">
          {results.map((place) => (
            <li key={place.placeId}>
              <button type="button" className="place" onClick={() => pick(place)}>
                <span className="place-name">{place.name}</span>
                <span className="place-address">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Une carte ---------------------------------------------------------------

function CardItem({ slug, link, scans, open, onToggle, password, reload, notify }) {
  const isAssigned = Boolean(link.destination);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fixedUrl = `${origin}/r/${slug}`;
  const statsUrl = `${origin}/stats/${slug}?key=${link.clientToken}`;

  const [name, setName] = useState(link.businessName || "");
  const [destination, setDestination] = useState(link.destination || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [qr, setQr] = useState(null);
  const [nfc, setNfc] = useState("");

  // Après un rechargement (ex. carte libérée), on réaligne les champs sur les données serveur.
  useEffect(() => {
    setName(link.businessName || "");
    setDestination(link.destination || "");
  }, [link.businessName, link.destination]);

  useEffect(
    () => () => {
      if (qr) URL.revokeObjectURL(qr);
    },
    [qr]
  );

  const copy = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(message);
    } catch {
      notify("Copie impossible : sélectionne le lien à la main.");
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiJson(`/api/links/${slug}`, {
        password,
        method: "PUT",
        body: { destination: destination.trim(), businessName: name.trim() },
      });
      notify(`« ${slug} » enregistrée.`);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (mode) => {
    const question =
      mode === "release"
        ? `Libérer « ${slug} » ?\n\nLa carte redevient vierge : le commerce, le lien d'avis et les scans sont effacés, et l'ancien lien de suivi cesse de fonctionner. Le QR code et la puce NFC ne changent pas.`
        : `Remettre à zéro les scans de « ${slug} » ?`;
    if (!window.confirm(question)) return;
    setError("");
    try {
      await apiJson(`/api/links/${slug}/reset`, { password, method: "POST", body: { mode } });
      notify(mode === "release" ? `« ${slug} » est de nouveau vierge.` : "Scans remis à zéro.");
      if (mode === "release") setQr(null);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (
      !window.confirm(
        `Supprimer définitivement « ${slug} » ?\n\nSi son QR code est déjà imprimé, il ne mènera plus nulle part.`
      )
    )
      return;
    try {
      await apiJson(`/api/links/${slug}`, { password, method: "DELETE" });
      notify(`« ${slug} » supprimée.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const showQr = async () => {
    setError("");
    const res = await api(`/api/qrcode/${slug}`, { password });
    if (!res.ok) {
      setError("Le QR code n'a pas pu être généré.");
      return;
    }
    setQr(URL.createObjectURL(await res.blob()));
  };

  const writeNfc = async () => {
    if (!("NDEFReader" in window)) {
      setNfc("L'écriture NFC ne fonctionne que sur Chrome pour Android. Sur iPhone, utilise l'app NFC Tools avec le lien fixe.");
      return;
    }
    try {
      setNfc("Approche la carte du téléphone…");
      const reader = new window.NDEFReader();
      await reader.write({ records: [{ recordType: "url", data: fixedUrl }] });
      setNfc("Puce écrite avec succès.");
    } catch (err) {
      setNfc(`Écriture impossible : ${err.message}`);
    }
  };

  return (
    <li className={`item ${isAssigned ? "item-assigned" : "item-blank"}`}>
      <button
        type="button"
        className="item-head"
        aria-expanded={open}
        aria-controls={`detail-${slug}`}
        onClick={onToggle}
      >
        <span className="item-slug">{slug}</span>
        <span className={`item-name${isAssigned ? "" : " is-empty"}`}>
          {isAssigned ? link.businessName || "Sans nom" : "Vierge"}
        </span>
        <span className="item-scans">
          {isAssigned ? (
            <>
              {scans} <span className="item-scans-unit">{scans === 1 ? "scan" : "scans"}</span>
            </>
          ) : (
            <span aria-hidden="true">–</span>
          )}
        </span>
        <span className="chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="item-detail" id={`detail-${slug}`}>
          <div className="url-line">
            <span>Lien fixe à imprimer et à écrire sur la puce :</span>
            <code className="url-code">{fixedUrl}</code>
            <button className="btn btn-quiet" type="button" onClick={() => copy(fixedUrl, "Lien fixe copié.")}>
              Copier
            </button>
          </div>

          <form className="assign" onSubmit={save}>
            <PlaceField
              id={`name-${slug}`}
              label="Commerce"
              placeholder="Chercher le commerce sur Google"
              value={name}
              onChange={setName}
              onPick={(place) => {
                setName(place.name);
                setDestination(place.reviewUrl);
              }}
              password={password}
            />
            <div>
              <label className="label" htmlFor={`destination-${slug}`}>
                Lien d'avis Google
              </label>
              <input
                id={`destination-${slug}`}
                className="field"
                inputMode="url"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="https://search.google.com/local/writereview?placeid=…"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}

          <div className="actions">
            <button className="btn" type="button" onClick={showQr}>
              Voir le QR code
            </button>
            <button className="btn" type="button" onClick={writeNfc}>
              Écrire sur la puce NFC
            </button>
            {isAssigned && (
              <>
                <button
                  className="btn"
                  type="button"
                  onClick={() => copy(statsUrl, "Lien de suivi copié : envoie-le à ton client.")}
                >
                  Copier le lien de suivi
                </button>
                <a className="btn" href={statsUrl} target="_blank" rel="noreferrer">
                  Voir la page du client
                </a>
              </>
            )}
          </div>
          {nfc && <p className="hint">{nfc}</p>}

          {qr && (
            <div className="qr-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="qr-image" src={qr} alt={`QR code de ${slug}`} />
              <a className="btn" href={qr} download={`qr-${slug}.png`}>
                Télécharger le PNG
              </a>
            </div>
          )}

          <div className="actions actions-danger">
            {isAssigned && (
              <>
                <button className="btn" type="button" onClick={() => reset("scans")}>
                  Remettre les scans à zéro
                </button>
                <button className="btn btn-danger" type="button" onClick={() => reset("release")}>
                  Libérer la carte
                </button>
              </>
            )}
            <button className="btn btn-danger" type="button" onClick={remove}>
              Supprimer
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

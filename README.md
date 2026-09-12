# Gestionnaire de liens NFC / QR code

App qui te permet de gérer tes cartes NFC/QR pour tes clients :
- Chaque carte a une URL **fixe** (ex: `tonsite.vercel.app/r/carte1`) qu'on imprime en QR et qu'on écrit sur la puce NFC UNE SEULE FOIS.
- Depuis le dashboard admin, tu changes à tout moment la **destination** de cette URL (le lien d'avis Google du commerce) — sans jamais retoucher la carte physique.
- Génération du QR code (PNG téléchargeable) directement dans le dashboard.
- Écriture NFC directement depuis le navigateur (Chrome sur Android uniquement, via Web NFC).

## Stack utilisée
- **Next.js** (framework web, gratuit)
- **Vercel** (hébergement gratuit)
- **Upstash Redis** (petite base de données gratuite, s'intègre nativement à Vercel)

## Étapes de déploiement

### 1. Mettre le code sur GitHub
```bash
cd nfc-qr-manager
git init
git add .
git commit -m "Premier commit"
```
Crée un nouveau repo sur GitHub, puis :
```bash
git remote add origin https://github.com/TON_USER/nfc-qr-manager.git
git branch -M main
git push -u origin main
```

### 2. Déployer sur Vercel
1. Va sur https://vercel.com, connecte-toi avec ton compte GitHub
2. Clique "Add New Project" → sélectionne ton repo `nfc-qr-manager`
3. Laisse les réglages par défaut, clique "Deploy" (le premier déploiement va échouer car il manque la base de données — c'est normal, continue à l'étape 3)

### 3. Ajouter la base de données Upstash Redis
1. Dans ton projet Vercel → onglet **Storage**
2. Clique **Create Database** → choisis **Upstash** → **Redis**
3. Suis les étapes (nom au choix, région proche de toi)
4. Une fois créée, Vercel connecte automatiquement les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` à ton projet

### 4. Ajouter ton mot de passe admin
1. Dans ton projet Vercel → **Settings** → **Environment Variables**
2. Ajoute : `ADMIN_PASSWORD` = un mot de passe de ton choix (solide)
3. Redéploie le projet (onglet **Deployments** → "..." sur le dernier → **Redeploy**)

### 5. Récupérer le lien d'avis d'un commerce
Cette version n'utilise aucune API Google et ne demande donc ni compte Google Cloud, ni clé API, ni facturation.

1. Dans le dashboard, saisis le nom du commerce
2. Clique sur **Rechercher ce commerce sur Google Maps**
3. Ouvre la bonne fiche et récupère son lien **Demander des avis**
4. Colle ce lien dans le champ de destination et enregistre

La plaque NFC/QR conservera son URL fixe et redirigera ensuite directement vers ce lien d'avis.

### 6. C'est prêt !
Va sur `https://ton-projet.vercel.app/admin`, connecte-toi avec ton mot de passe, et crée ton premier lien.

## Utilisation au quotidien

1. **Créer un lien** pour une carte vierge : donne-lui un nom (facultatif) et une destination temporaire (ou laisse vide au début)
2. Le dashboard te donne une **URL fixe** du type `https://ton-projet.vercel.app/r/abc123`
3. Clique **"Générer QR code"** → télécharge le PNG → imprime-le sur la carte
4. Clique **"Écrire sur puce NFC"** (depuis ton téléphone Android + Chrome) → approche la carte → la puce est programmée avec cette même URL fixe
5. Quand tu vends la carte à un commerce : reviens dans le dashboard, modifie la **destination** de ce lien vers le lien d'avis Google du commerce, clique "Enregistrer" — c'est tout, la carte pointe maintenant vers le bon endroit, sans rien réimprimer

## Notes importantes

- **Écriture NFC** : Web NFC ne fonctionne que sur **Chrome pour Android**, en HTTPS (donc uniquement une fois déployé sur Vercel, pas en local). Sur iPhone, il faudra utiliser une app tierce comme "NFC Tools" pour écrire la même URL sur la puce.
- **Sécurité** : la protection par mot de passe est volontairement simple (adaptée à un usage perso/petite échelle). N'utilise pas un mot de passe que tu utilises ailleurs.
- **Coût** : tout reste gratuit dans les limites des offres gratuites Vercel + Upstash (largement suffisant pour plusieurs centaines de cartes).

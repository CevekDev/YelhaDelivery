# YelhaDms

> Plateforme SaaS de gestion de livraison pour restaurants algériens.

**Site de production** : https://delivery.yelha.net
**Stack** : Next.js 15 · TypeScript strict · Supabase · Tailwind · Resend

---

## 📦 État du projet

✅ **Toutes les phases livrées**

- **Phase 1** : Fondations (Next.js 15 + TS strict + Tailwind + Supabase SSR + RLS + middleware par rôle + rate-limit)
- **Phase 2** : Dashboard restaurateur (menu + livreurs + commandes Realtime + paramètres)
- **Phase 3** : Page menu publique + checkout + confirmation + suivi temps réel + espace livreur
- **Phase 4** : Panel super admin + emails Resend + tests Vitest + GitHub Action CI

---

## 🚀 Installation locale (5 minutes)

### Prérequis
- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Un projet Supabase (gratuit sur https://supabase.com)
- Un compte Resend (gratuit sur https://resend.com) — *Phase 4*

### 1. Cloner et installer

```bash
git clone https://github.com/CevekDev/YelhaDelivery
cd YelhaDelivery
pnpm install
```

### 2. Créer le projet Supabase

1. Va sur https://supabase.com/dashboard → **New project**
2. Choisis une région proche (ex: **Europe (Paris)** `eu-west-3`)
3. Note le mot de passe de la DB (à conserver)
4. Une fois le projet créé, va dans **Project Settings → API** et copie :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (cliquer "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Appliquer les migrations SQL

Dans Supabase Dashboard → **SQL Editor** → **New query**, exécute dans l'ordre :

1. [`supabase/migrations/20260101000000_initial_schema.sql`](supabase/migrations/20260101000000_initial_schema.sql) — schéma + RLS + storage
2. [`supabase/migrations/20260102000000_public_order_lookup.sql`](supabase/migrations/20260102000000_public_order_lookup.sql) — RPCs `place_order`, `get_public_order`
3. (Optionnel) [`supabase/seed.sql`](supabase/seed.sql) — restaurant + menu de démo

### 4. Créer le compte super admin

Toujours dans Supabase Dashboard :

1. **Authentication → Users → Add user → Create new user**
2. Email + mot de passe fort, coche **Auto Confirm User**
3. Copie l'UUID de l'utilisateur créé
4. Retourne dans **SQL Editor** et exécute :

```sql
insert into public.profiles (id, role, full_name)
values ('<COLLE-LUUID-ICI>', 'admin', 'Super Admin');
```

### 5. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Puis ouvre `.env.local` et remplis :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=YelhaDms
```

### 6. Lancer en local

```bash
pnpm dev
```

Ouvre http://localhost:3000

---

## 🏗️ Structure du projet

```
yelha-dms/
├── app/                          Routes Next.js (App Router)
│   ├── (auth)/login/             Connexion restaurateur
│   ├── (dashboard)/dashboard/    Espace restaurateur (Phase 2)
│   ├── (livreur)/livreur/        Espace livreur (Phase 3)
│   ├── (admin)/admin/            Panel super admin (Phase 4)
│   ├── r/[slug]/                 Page publique restaurant (Phase 3)
│   ├── api/auth/signout/         Déconnexion
│   ├── layout.tsx                Layout racine + fonts
│   ├── page.tsx                  Landing page
│   ├── error.tsx                 Erreur globale
│   └── not-found.tsx             404
├── components/
│   └── ui/                       Composants shadcn/ui (button, input, label)
├── lib/
│   ├── supabase/                 Clients SSR (browser, server, middleware)
│   ├── validators/               Schemas Zod
│   ├── rate-limit.ts             Rate limiter in-memory
│   └── utils.ts                  Helpers (cn, formatPrice, slug, dates)
├── types/database.ts             Types TypeScript des tables Supabase
├── supabase/
│   ├── migrations/               Schéma SQL versionné
│   └── seed.sql                  Données de démo
├── middleware.ts                 Protection des routes par rôle
├── next.config.js                Headers de sécurité
├── vercel.json                   Config déploiement
└── tailwind.config.ts            Design system YelhaDms
```

---

## 🔐 Sécurité

- **RLS Supabase activé** sur toutes les tables ; politiques scopées par rôle
- **Service role key** jamais exposée côté client (utilisée uniquement dans des Server Actions/Route Handlers)
- **Server Actions Next.js** uniquement → protection CSRF native
- **Validation Zod** sur tous les inputs (client ET serveur)
- **Rate limiting** sur login (5 tentatives / 15 min)
- **Headers de sécurité** : `X-Frame-Options`, `CSP-équivalents`, `HSTS`, `Referrer-Policy`
- **Téléphones algériens** validés au format `05/06/07` + 8 chiffres
- **Slugs** restreints à `[a-z0-9-]`
- Aucun secret hardcodé — tout passe par `.env.local`

### Roadmap sécurité (phases suivantes)
- Migrer le rate limiter vers Upstash Redis (multi-instance Vercel)
- Ajouter une CSP stricte (en fonction des assets externes finaux)
- Audit `pnpm audit` automatisé via GitHub Action
- Tests d'intrusion RLS automatisés

---

## 🎨 Design System

Couleurs définies en CSS variables (`app/globals.css`) et exposées dans Tailwind :

| Token              | Valeur     | Usage                  |
|--------------------|------------|------------------------|
| `bg-background`    | `#0F0E0B`  | Fond principal         |
| `bg-card`          | `#1A1916`  | Cartes, surfaces       |
| `bg-input`         | `#252420`  | Inputs, fonds discrets |
| `text-primary`     | `#FF6B2B`  | Accent principal       |
| `text-foreground`  | `#F5F0E8`  | Texte principal        |
| `text-muted-foreground` | `#8A8378` | Texte secondaire  |

**Fonts** : Syne (titres, `font-display`) + DM Sans (corps, `font-sans`) via `next/font`.

---

## 🚢 Déploiement Vercel

### 1. Pousser le code

```bash
git remote add origin https://github.com/CevekDev/YelhaDelivery
git push -u origin main
```

### 2. Importer dans Vercel

1. https://vercel.com/new → **Import** ton repo GitHub
2. Vercel détecte automatiquement Next.js
3. Dans **Environment Variables**, ajoute **toutes** les variables de `.env.example`
   (utilise les valeurs de **production** de ton projet Supabase)
4. **Deploy**

### 3. Configurer le domaine `delivery.yelha.net`

1. Dans Vercel → **Project Settings → Domains**
2. Ajoute `delivery.yelha.net`
3. Vercel te donne un enregistrement CNAME à ajouter chez ton registrar :
   ```
   delivery.yelha.net  CNAME  cname.vercel-dns.com
   ```
4. Patiente quelques minutes — Vercel émet automatiquement le certificat TLS

### 4. Mettre à jour `NEXT_PUBLIC_APP_URL`

Dans Vercel → Settings → Environment Variables :
```
NEXT_PUBLIC_APP_URL = https://delivery.yelha.net
```
Puis redéploye.

---

## 🧪 Scripts

```bash
pnpm dev          # Dev server (http://localhost:3000)
pnpm build        # Build de production
pnpm start        # Démarre la build (après pnpm build)
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (suite de tests — Phase 4)
pnpm format       # Prettier --write .
```

---

## 📞 Support

Bug ? Question ? Ouvre une issue sur GitHub :
https://github.com/CevekDev/YelhaDelivery/issues

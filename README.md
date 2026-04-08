# GymFlow — Frontend React (`salle_sport_m2_cdsd_2026_react`)

Frontend React de l’application GymFlow (UI/UX), basé sur Vite.

## Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Axios
- React Router
- Recharts

## Prérequis

- Node.js 18+ recommandé (npm inclus)

## Installation

```bash
npm install
```

## Lancer en développement

```bash
npm run dev
```

Vite affiche l’URL locale (souvent `http://localhost:5173`).

## Configuration API

Le projet utilise `.env` avec la variable :

- `API_BASE_URL`

Exemple (valeur actuelle observée) :

- `API_BASE_URL=http://localhost:4000/api`

⚠️ Attention : le backend (`salle_sport_m2_cdsd_2026_node`) écoute par défaut sur `http://localhost:5000/api`.
Assure-toi que `API_BASE_URL` pointe vers le bon port (ou lance le backend sur 4000).

## Scripts npm

- `npm run dev` : serveur de dev Vite
- `npm run build` : build (TypeScript + Vite)
- `npm run preview` : aperçu du build
- `npm run lint` : lint ESLint

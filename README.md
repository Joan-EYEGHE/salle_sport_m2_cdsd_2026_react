<div align="center">

# 🏋️ GymFlow — Frontend (React)

**Version React de GymFlow** — UI moderne, navigation, dashboard & graphiques, consommation de l’API GymFlow.

![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=000000)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Axios](https://img.shields.io/badge/HTTP-Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-FF6B35?style=for-the-badge)

</div>

---

## ✨ Accroche

La version React de GymFlow met l’accent sur une **UI/UX “open-source ready”** : pages structurées, routing, appels API centralisés et composants réutilisables.

> 📸 **Screenshot / GIF** : (placeholder) ajoute une capture de la landing page / dashboard.

---

## 📚 Table des matières

- [🚀 Features](#-features)
- [🧱 Stack technique](#-stack-technique)
- [📁 Architecture du projet](#-architecture-du-projet)
- [⚙️ Installation & Lancement](#️-installation--lancement)
- [🌐 Variables d'environnement](#-variables-denvironnement)
- [🔗 Dépôts liés](#-dépôts-liés)
- [👤 Auteur](#-auteur)
- [📜 License](#-license)

---

## 🚀 Features

- 🔐 Authentification + routes protégées
- 🧍 Gestion membres (liste/détail)
- 📅 Activités / cours
- 💳 Abonnements / transactions
- 📊 Dashboard KPI + graphiques

---

## 🧱 Stack technique

| Catégorie | Tech |
|---|---|
| UI | React |
| Build | Vite |
| Langage | TypeScript |
| Styling | Tailwind CSS |
| HTTP | Axios |
| Routing | React Router |
| Charts | Recharts |

---

## 📁 Architecture du projet

```txt
salle_sport_m2_cdsd_2026_react/
├─ src/
│  ├─ api/         # client axios / config
│  ├─ routes/      # routing + guards
│  ├─ pages/       # pages (dashboard, members, etc.)
│  ├─ components/  # UI components
│  ├─ context/     # auth/session (si utilisé)
│  ├─ guards/      # protections RBAC (si utilisé)
│  └─ types/       # types TS
└─ package.json
```

---

## ⚙️ Installation & Lancement

### Prérequis

- Node.js 18+ recommandé

### Installation

```bash
npm install
```

### Lancer en dev

```bash
npm run dev
```

---

## 🌐 Variables d'environnement

Le projet utilise `.env` :

| Variable | Exemple | Description |
|---|---:|---|
| `API_BASE_URL` | `http://localhost:5000/api` | URL de base de l’API GymFlow |

> Si tu as `API_BASE_URL=http://localhost:4000/api`, pense à aligner avec le backend (par défaut `5000`).

---

## 🔗 Dépôts liés

- Backend Node.js : `https://github.com/Joan-EYEGHE/salle_sport_m2_cdsd_2026_node`
- Frontend Vue.js : `https://github.com/Joan-EYEGHE/salle_sport_m2_cdsd_2026_vue`
- Frontend React.js : `https://github.com/Joan-EYEGHE/salle_sport_m2_cdsd_2026_react`

---

## 👤 Auteur

**Joan EYEGHE** — Master 2 CDSD 2026

---

## 📜 License

MIT

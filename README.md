# NoteFlow 📝

> Éditeur de notes Markdown local, simple et élégant.

![NoteFlow](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-purple?logo=vite)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Fonctionnalités

- **Éditeur Markdown** avec rendu en temps réel
- **3 modes de vue** : Éditer / Split / Aperçu
- **Tags** avec filtrage par couleur
- **Recherche** par titre
- **Sauvegarde automatique** via localStorage
- **100% local** — aucune donnée envoyée en ligne

## 🚀 Lancer le projet

```bash
# Installer les dépendances
npm install

# Démarrer en développement
npm run dev

# Builder pour la production
npm run build

# Déployer sur GitHub Pages
npm run deploy
```

## 🏗️ Structure du projet

```
noteflow/
├── src/
│   ├── components/
│   │   └── NoteFlow.jsx   # Composant principal
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── public/
├── index.html
├── vite.config.js
└── package.json
```

## 🛠️ Technologies

- [React 18](https://react.dev/)
- [Vite 5](https://vitejs.dev/)
- [marked](https://marked.js.org/) — parsing Markdown
- LocalStorage pour la persistance

## 📱 Roadmap

- [ ] Optimisation mobile complète
- [ ] Export en `.md`
- [ ] Thème sombre
- [ ] Version Android via Capacitor

## 📄 Licence

MIT

# Journées du patrimoine à Lyon — 19 & 20 septembre 2026

Carte des **lieux gratuits** (et quelques tarifs JEP réduits) pendant les 43e Journées européennes du patrimoine, à Lyon et dans la Métropole.

L’app croise le **programme officiel** du ministère de la Culture pour recenser les sites, les placer sur une carte, estimer l’affluence et noter l’intérêt patrimonial.

## Lancer en local

```bash
npm install
npm run build
npm start
```

Ouvrez [http://localhost:43141](http://localhost:43141).

Le build produit un site **statique** (`out/`). `npm start` sert ce dossier. En développement : `npm run dev` (Turbopack).

## Continuer dans Cursor en local

Ce projet a été construit dans un Cloud Agent. Pour l’ouvrir sur ta machine :

1. Clique **Create repo** au-dessus du chat (ça publie le code).
2. Clone le dépôt, puis **File → Open Folder** dans Cursor local.
   Ou dézippe l’archive `jep_lyon_carte_source.zip` jointe à l’agent.
3. `npm install` puis `npm run dev` (ou `npm run build && npm start`).

## Publier sur GitHub Pages (depuis ta machine)

Le Cloud Agent n’a pas le jeton GitHub de ton laptop. Une fois le dossier ouvert en local :

```bash
npm run publish:pages
```

Ça crée un dépôt **public** `jep-lyon-carte`, pousse `main`, et active Pages via GitHub Actions.

- Dépôt `compte/jep-lyon-carte` → `https://compte.github.io/jep-lyon-carte/`
- Autre nom : `bash scripts/publish-github-pages.sh mon-nom`

Le `basePath` est calculé dans le workflow. Premier run : Actions peut demander d’autoriser l’environnement **github-pages**. Si 404 : **Settings → Pages → Source : GitHub Actions**.

## Contenu

- **275+ lieux gratuits** issus du programme officiel (filtre « Lyon ville » par défaut, bascule Métropole).
- Couleur des points = **affluence estimée** (calme → très forte).
- Note d’intérêt /5, ouvertures exceptionnelles, réservation, horaires.
- Pistes : ouvertures rares, éviter la foule, musées, Croix-Rousse, Vieux-Lyon, Presqu’île.
- **Favoris** : un cœur sur la carte ou la fiche, stocké dans le navigateur (pas de compte).
- **Samedi** : un parcours unique depuis le **72 route de Vienne** — crématorium le matin, Villa Berliet sans se presser, visite libre tardive de l’Auditorium puis concert d’orgue à 18h.
- **Dimanche** : Lugdunum le matin (créneaux officiels), descente au Vieux-Lyon pour les coulisses de Guignol puis Gadagne.
- Lien vers la fiche officielle de chaque animation.

Les estimations d’affluence s’appuient sur la jauge, le centre-ville et les habitudes des JEP lyonnaises — ce ne sont pas des compteurs en temps réel. Vérifiez toujours horaires et réservations sur [journeesdupatrimoine.culture.gouv.fr](https://journeesdupatrimoine.culture.gouv.fr/programme).

## Données

Le fichier `src/data/places.json` est généré depuis l’API cartographique officielle des JEP (Wemap / ministère de la Culture) :

```bash
python3 scripts/build-places.py
```

(nécessite le dump brut `/tmp/jep/metro_raw.json` produit par le script de collecte).

Thèmes 2026 : *Patrimoine de la photographie* et *Patrimoine en péril : raviver, résister, réimaginer*.

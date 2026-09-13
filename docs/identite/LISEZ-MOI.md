# Identité visuelle

| Fichier | Usage |
|---|---|
| `avatar-512.png` | Avatar du projet GitLab (Settings → General → Project avatar). Fond opaque, marque agrandie pour rester lisible à 32 px dans une liste de projets |
| `bandeau-readme.png` | En-tête du README, 1280 × 320 |

La marque — boule d'acier striée et cochonnet — est la même que l'icône de
l'application (`src-tauri/icons/`), à une différence près : l'avatar la fait
occuper davantage le carré. Une icône de bureau vit à 48 px sur un fond de
Bureau quelconque ; un avatar de projet vit à 32 px dans une liste dense, et les
marges qui aèrent la première étouffent la seconde.

Couleurs : vert `#14532d`, crème `#f4f2ed`, ocre du cochonnet `#c87d27` — les
mêmes que l'application.

Pour régénérer : le gabarit est reconstruit à la main, il n'y a pas de script
permanent. Attention si vous le refaites : les dégradés doivent être déclarés
dans un `<defs>` **à l'intérieur** de chaque SVG. Placés dans un SVG masqué par
`display:none`, ils ne sont pas appliqués et les boules sortent transparentes.

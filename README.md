# Concours de pétanque

Application de gestion de concours de pétanque pour la table de marque, prévue
pour tourner sur un PC, hors ligne, sans compte ni connexion.

## Principe

L'opérateur ne saisit que le nombre d'équipes et le format. Le logiciel en
déduit tout le reste : nombre de poules, nombre de tours, taille du tableau,
exempts, attribution des terrains.

## Formats

| Format | Ce qu'il fait |
|---|---|
| Poules | Poules de 4 (complétées par des poules de 3), 2 qualifiés par poule, avec barrage |
| Système suisse | Chaque équipe rencontre une équipe au même nombre de victoires, sans revanche |
| Élimination directe | Tableau avec têtes de série et exempts au premier tour |
| Multi-chances A/B/C | Les battus d'entrée repartent dans le tableau suivant |

Les quatre formats partagent un même noyau (équipes, tours, matchs, terrains,
classement) : `src/engine/formats/` ne contient que la règle d'appariement propre
à chaque format.

## Développement

```sh
npm install
npm run dev      # serveur de développement
npm test         # tests du moteur
npm run build    # bundle de production
```

Le moteur (`src/engine/`) est du TypeScript pur, sans dépendance à React : c'est
la partie dont une erreur se verrait publiquement le jour du concours, elle est
donc testée séparément de l'interface.

## Classement

Départage FFPJP : victoires, puis goal-average (différence de points), puis
points marqués, puis confrontation directe. Un exempt compte comme une victoire
acquise mais pas comme un match joué.

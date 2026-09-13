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

## Distribution

Le pipeline GitLab produit trois choses sur un runner Windows :

| Fichier | Pour quoi |
|---|---|
| `concours-petanque-portable.zip` | **La voie principale.** Un dossier à décompresser, rien à installer : l'exécutable, son dossier `donnees` et un LISEZ-MOI. Le raccourci du Bureau se crée par un clic droit → Envoyer vers |
| `...-setup.exe` (NSIS) | Filet de secours : lui seul sait récupérer WebView2 s'il manque sur un poste ancien. Installe pour l'utilisateur courant, sans droits administrateur |
| `...msi` | Déploiement en poste géré |

La version portable contient un dossier `donnees` à côté de l'exécutable. Sa
seule présence fait écrire WebView2 dans ce dossier plutôt que dans
`%LOCALAPPDATA%` : l'application et le concours en cours voyagent alors
ensemble. La version installée n'a pas ce dossier et garde le comportement
normal — écrire à côté de l'exécutable échouerait sous `Program Files`.

Dans les deux cas Windows doit disposer de **Microsoft Edge WebView2**,
présent d'office sur Windows 11 et sur la quasi-totalité des Windows 10.
L'installeur sait l'installer au besoin ; la version portable, non.

## Mettre le logiciel sur le PC du club

`docs/installation.html` est une page à imprimer, destinée à la personne qui
prépare l'ordinateur une seule fois. Elle couvre le point qui bloque vraiment :
l'exécutable n'étant pas signé, Windows affiche un avertissement au premier
lancement — sauf si le fichier arrive par une clé USB, qui lui fait perdre sa
marque « téléchargé depuis Internet ». D'où l'insistance sur ce détour.

```sh
node outils/pdf.mjs docs/installation.html installation.pdf
```

Le mode d'emploi de la table de marque, lui, s'imprime depuis le logiciel
(onglet Réglages).

## Développement

```sh
npm install
npm run dev          # serveur de développement
npm test             # tests du moteur
npm run build        # bundle web de production
npm run app:portable # application Windows + dossier portable prêt à copier
```

`app:portable` doit tourner **sur Windows** et demande Rust ainsi que les outils
C++ de Visual Studio. Il produit `portable/Concours de petanque/`, à copier tel
quel sur une clé USB. Le pipeline lance exactement le même script, pour que les
deux sorties soient identiques.

Le moteur (`src/engine/`) est du TypeScript pur, sans dépendance à React : c'est
la partie dont une erreur se verrait publiquement le jour du concours, elle est
donc testée séparément de l'interface.

## Classement

Départage FFPJP : victoires, puis goal-average (différence de points), puis
points marqués, puis confrontation directe. Un exempt compte comme une victoire
acquise mais pas comme un match joué.

![Concours de pétanque](docs/identite/bandeau-readme.png)

# Concours de pétanque

Application de gestion de concours de pétanque, écrite pour **la Bouillonne**,
association de quartier de Montoir-de-Bretagne, et utilisable par n'importe quel
club.

L'opérateur saisit les joueurs et choisit une formule ; le logiciel en déduit les
poules, les tours, le tableau, les exempts et l'attribution des terrains. Il suit
les scores, tient le classement à jour, imprime les feuilles de match et le bilan
de fin de concours, et propose un affichage à projeter pour que les joueurs
voient où en est le tournoi sans venir le demander à la table.

Tout fonctionne hors ligne, sans compte ni connexion, et tient sur une clé USB.

## Principe

L'opérateur ne saisit que le nombre d'équipes et le format. Le logiciel en
déduit tout le reste : nombre de poules, nombre de tours, taille du tableau,
exempts, attribution des terrains.

## Formats

| Format | Ce qu'il fait |
|---|---|
| Poules | Poules de 4 (complétées par des poules de 3), 2 qualifiés par poule, avec barrage, puis deux tableaux à élimination directe : les premières de poule en A, les deuxièmes en B |
| Système suisse | Chaque équipe rencontre une équipe au même nombre de victoires, sans revanche |
| Élimination directe | Tableau avec têtes de série et exempts au premier tour |
| Multi-chances A/B/C | Les battus d'entrée repartent dans le tableau suivant |

Les quatre formats partagent un même noyau (équipes, tours, matchs, terrains,
classement) : `src/engine/formats/` ne contient que la règle d'appariement propre
à chaque format.

## Télécharger

**https://gitlab.com/wicaonith/petbou/-/releases**

Cette page ne change jamais d'adresse et ne périme pas : c'est le lien à donner.
Les fichiers vivent dans le registre de paquets du projet, là où un lien vers un
artefact de pipeline serait supprimé au bout de trente jours.

Publier une version, en deux gestes :

1. Changer le numéro dans `src-tauri/tauri.conf.json`, commiter, pousser.
2. Onglet **CI/CD → Pipelines**, bouton ▶ sur le job `installeur-windows`.

Le job compile, envoie les trois fichiers, crée l'étiquette de version et la
page de téléchargement. Rien à taguer à la main : l'API des versions crée
l'étiquette elle-même, ce qui évite d'avoir à créer un jeton d'écriture sur le
dépôt — un jeton qui expirerait au bout d'un an, probablement la veille d'un
concours.

Republier le même numéro échoue exprès, avec le message qui dit quoi faire : une
version publiée ne doit pas changer de contenu dans le dos de qui l'a téléchargée.

Un exécutable qui arrive par téléchargement porte la marque « téléchargé depuis
Internet » et Windows affiche un avertissement au premier lancement. C'est
pratique pour qui prépare le poste ; pour la personne qui tient la table, la
clé USB reste le chemin le plus simple — voir plus bas.

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

Deux documents, selon que la personne est en face de vous ou non :

| Document | Pour qui |
|---|---|
| `docs/installation.html` | Une page à imprimer, pour qui prépare l'ordinateur une seule fois |
| `docs/courriel-telechargement.md` | Le même parcours en courriel, quand on ne peut pas apporter la clé soi-même |

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

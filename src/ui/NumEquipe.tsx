/**
 * Le dossard d'une équipe, toujours collé à ses noms.
 *
 * Une doublette se cherche des yeux par son numéro, pas par deux patronymes lus
 * de loin sur un écran ou dans une liste de vingt-cinq lignes. Il apparaît donc
 * partout où l'équipe apparaît — saisie, tirage, matchs, classement, feuilles,
 * écran public — et de la même façon, pour qu'il se reconnaisse sans y penser.
 */
export const NumEquipe = ({ n }: { n: number }) => <span className="numero">{n}</span>

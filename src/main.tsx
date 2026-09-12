import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import AffichageSeul from './AffichageSeul.tsx'

// Les deux fenêtres servent le même fichier ; le paramètre décide de ce qui
// s'affiche, ce qui évite un second point d'entrée à construire et à empaqueter.
const estAffichage = new URLSearchParams(window.location.search).has('affichage')

createRoot(document.getElementById('root')!).render(
  <StrictMode>{estAffichage ? <AffichageSeul /> : <App />}</StrictMode>,
)

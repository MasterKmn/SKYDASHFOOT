# Sky Dash (PWA)
Jeu runner simple jouable sur iPhone (Safari) et hors-ligne via l'ajout à l'écran d'accueil.

## Installation rapide (iPhone)
1) Ouvrir `index.html` via un hébergement local (ou un serveur de fichiers) **ou** décompresser et ouvrir depuis un hébergeur.
2) Dans Safari, appuyez sur **Partager** > **Sur l'écran d'accueil**.
3) Lancez depuis l'icône "Sky Dash".

## Contrôles
- **Toucher/cliquer** : saut (double saut autorisé).
- **Espace** : saut (si clavier).
- **⏸️** : pause. **🔊/🔇** : son on/off.

## Détails techniques
- Canvas 2D, 60 FPS, responsive.
- Record sauvegardé en `localStorage`.
- PWA (manifest + service worker) pour l'hors-ligne.

Vous pouvez modifier la difficulté dans `main.js` (gravité, vitesse, etc.).

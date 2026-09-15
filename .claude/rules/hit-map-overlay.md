---
paths:
  - "src/directives/hit-map.directive.ts"
  - "src/utils/localForage.ts"
---

# Trappola: l'URL dei tile CARG è accoppiato al consumer

Il perché sta in [docs/knowledge/cache-offline-carg.md](../../docs/knowledge/cache-offline-carg.md).

- **Non cambiare la base URL dei tile CARG senza allineare l'`overlayXYZ` che il consumer passa a
  `downloadOverlay()`**, e viceversa. Sono due percorsi di codice separati che devono puntare alla
  stessa origine: `downloadOverlay()` costruisce `${overlayXYZ}/${tile}.png`, quindi se divergono
  l'utente **vede un tileset e ne scarica un altro**.

  Niente in CI se ne accorge, e il valore del consumer sta in un repo che questo non vede cambiare:
  la regola simmetrica è nel `CLAUDE.md` di `webmapp-app`.

# map-core — CLAUDE.md

## Feature disponibili

| Feature | Ticket | Moduli toccati | Note |
|---|---|---|---|
| EC POI: show_image_on_map | oc:7988 | `src/directives/track.related-pois.directive.ts`, `src/types/model.ts` | Rendering POI su mappa pilotato dal campo `feature_image.show_image_on_map`; fallback legacy per app mobile |

## Decisioni architetturali

### EC POI: show_image_on_map (oc:7988)
- La logica a tre vie (`true` → immagine, `false` → icona, `null/undefined` → fallback legacy) è in `_createPoiMarker` — il campo `show_image_on_map` sovrascrive la decisione automatica solo quando esplicitamente presente.
- `show_image_on_map` è tipizzato in `IWmImage` perché arriva strutturalmente dentro `feature_image` nel JSON dell'API.
- `sizes['108x137']` è hardcoded come proxy dell'immagine nel fallback legacy — tech debt noto, non toccare senza verificare entrambe le righe che lo usano (guardia + URL canvas).

## Note ambiente
- I test Karma non sono eseguibili: errori TS preesistenti in altri spec bloccano l'avvio. Ticket: oc:7989.
- Per eseguire i test usare `nvm use 22` prima di `npm test`.

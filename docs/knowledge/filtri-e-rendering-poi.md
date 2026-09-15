# POI: filtri, rendering e visibilità iniziale

## Come funziona oggi

**I marker si creano una volta e si filtrano al volo.** `_allPoiMarkers` è il superset, `_poiMarkers` lo stato corrente; `_updateFilteredPois()` fa `source.clear()` e riaggiunge i filtrati, senza `addFeatureToLayer` dentro il loop di `_addPoisMarkers`.

**Il filtro per tipo vale anche per i related POI della traccia**: `wmMapPoisFilters` raggiunge sia `pois.directive.ts` sia `track.related-pois.directive.ts`, con fallback su `taxonomy.poi_type.identifier` quando `taxonomyIdentifiers` è assente. `isArrayContained` è estratta in `src/utils/ol.ts` e condivisa.

**Come si rende un POI lo decide `feature_image.show_image_on_map`** in `_createPoiMarker`, a tre vie: `true` → immagine, `false` → icona, `null`/`undefined` → fallback legacy.

**La visibilità iniziale del cluster layer si decide in un momento solo**, combinando `!disabled && zoom >= poisMinZoom`.

## Perché così

- **Il fallback su `taxonomy.poi_type.identifier`** (oc:7646): i related POI dentro il payload della traccia non includono `taxonomyIdentifiers`, a differenza dei POI globali — senza fallback il filtro non avrebbe effetto su di loro.
- **`show_image_on_map` è tipizzato in `IWmImage`** (oc:7988) perché arriva strutturalmente dentro `feature_image` nel JSON dell'API.
- **Il campo sovrascrive la decisione automatica solo se esplicitamente presente** (oc:7988): un `null` significa «decidi come prima», e serve a non cambiare comportamento sugli shard il cui backend non lo espone.
- **La visibilità va decisa una volta** (oc:8114): il layer nasceva con `visible: true`, default di OpenLayers, e veniva nascosto subito dopo da `_checkZoom` — con un frame visibile nel mezzo, il flash all'avvio dell'app.

## Debito noto

- **`sizes['108x137']` è hardcoded** come proxy dell'immagine nel fallback legacy (oc:7988), e compare in due punti: la guardia e l'URL del canvas. L'obbligo di tenerli allineati sta in [.claude/rules/directives.md](../../.claude/rules/directives.md).
- **`_disableClusterLayer` ignora lo zoom** (oc:8114): bug preesistente, non risolto in quel ciclo.

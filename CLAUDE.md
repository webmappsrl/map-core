# map-core — CLAUDE.md

## Feature disponibili

| Feature | Ticket | Moduli toccati | Note |
|---|---|---|---|
| Filtro POI type esteso ai related POI | oc:7646 | `src/directives/track.related-pois.directive.ts`, `src/directives/pois.directive.ts`, `src/utils/ol.ts` | wmMapPoisFilters ora filtra anche i POI della traccia corrente; fallback su taxonomy.poi_type.identifier se taxonomyIdentifiers assente |
| EC POI: show_image_on_map | oc:7988 | `src/directives/track.related-pois.directive.ts`, `src/types/model.ts` | Rendering POI su mappa pilotato dal campo `feature_image.show_image_on_map`; fallback legacy per app mobile |

## Decisioni architetturali

### Filtro POI type ai related POI (oc:7646)
- `_allPoiMarkers` (superset) è separato da `_poiMarkers` (stato corrente del layer): i marker vengono creati una sola volta e filtrati al volo senza ricrearli.
- `_updateFilteredPois()` fa `source.clear()` + riaggiunta filtrata: nessun `addFeatureToLayer` nel loop di `_addPoisMarkers`.
- Fallback su `taxonomy.poi_type.identifier` quando `taxonomyIdentifiers` è assente: i related POI nel payload della traccia non includono `taxonomyIdentifiers` (a differenza dei POI globali).
- `isArrayContained` estratta in `src/utils/ol.ts` ed esportata: condivisa tra `pois.directive.ts` e `track.related-pois.directive.ts`.

### EC POI: show_image_on_map (oc:7988)
- La logica a tre vie (`true` → immagine, `false` → icona, `null/undefined` → fallback legacy) è in `_createPoiMarker` — il campo `show_image_on_map` sovrascrive la decisione automatica solo quando esplicitamente presente.
- `show_image_on_map` è tipizzato in `IWmImage` perché arriva strutturalmente dentro `feature_image` nel JSON dell'API.
- `sizes['108x137']` è hardcoded come proxy dell'immagine nel fallback legacy — tech debt noto, non toccare senza verificare entrambe le righe che lo usano (guardia + URL canvas).

## Convenzioni template — binding su elementi con più direttive

In Angular, quando più direttive sullo stesso host element espongono lo stesso `@Input()`, un singolo binding nel template raggiunge tutte. Non duplicare mai un binding per farlo arrivare a più direttive.

### Ordine degli attributi

Gli attributi di un elemento con più direttive seguono questo ordine:

1. **Input condivisi da più direttive** — alla fine del gruppo degli attributi generali, subito prima del primo selettore di direttiva. L'ordine interno segue la specificità del nome: nomi più corti e generici prima, nomi più lunghi e specifici dopo (nome più lungo = più specifico = più opzionale).
2. **Selettore di direttiva** (es. `wmMapPois`)
3. **Input usati solo da quella direttiva** — subito dopo il suo selettore.

```html
<wm-map
    [wmMapConf]="..."               ← generico, non appartiene a nessuna direttiva specifica
    [wmMapPadding]="..."
    [wmMapPoisFilters]="..."        ← condiviso (wmMapPois + wmMapTrackRelatedPois): alla fine del gruppo generale
    wmMapPois                       ← selettore direttiva
    [wmMapPoisPois]="..."           ← solo wmMapPois: dopo il suo selettore
    [wmMapPoisDisableClusterLayer]="..."
    wmMapTrackRelatedPois           ← selettore direttiva
    [wmTrackRelatedPoiIcons]="..."  ← solo wmMapTrackRelatedPois: dopo il suo selettore
>
```

**Perché**: la posizione segnala immediatamente se un input è condiviso (prima dei selettori) o dedicato (dopo il selettore della sua direttiva). Un binding condiviso posizionato dentro il blocco di una direttiva specifica è fuorviante.

## Note ambiente
- I test Karma non sono eseguibili: errori TS preesistenti in altri spec bloccano l'avvio. Ticket: oc:7989.
- Per eseguire i test usare `nvm use 22` prima di `npm test`.

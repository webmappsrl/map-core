> Ticket: oc:7646

# Notes — ECPOI filtro POI type: estensione ai related POI (map-core)

## Deviazioni dal piano

### Task 4 (binding template wm-core) — nessuna modifica al template necessaria
Il piano originale prevedeva di aggiungere `[wmMapPoisFilters]="poiFilterIdentifiers$|async"` sulla directive `wmMapTrackRelatedPois` in `geobox-map.component.html`. Durante l'implementazione è emerso che Angular propaga automaticamente un binding a tutte le direttive sullo stesso host element che espongono lo stesso `@Input()`. Il binding esistente alla riga 47 (per `wmMapPois`) raggiunge già `wmMapTrackRelatedPois` senza duplicazione. La modifica al template è stata quindi un riposizionamento (spostare il binding nella posizione corretta per la convenzione "condivisi prima dei selettori") e non un'aggiunta.

## Bug trovati

### `taxonomyIdentifiers` assente nei related POI
I related POI nel payload di `track.properties.related_pois` non hanno il campo `taxonomyIdentifiers` (presente invece nei POI globali). Il predicato di filtro originale usava solo `taxonomyIdentifiers` → i related POI passavano sempre il filtro (tutti visibili). Fix: derivare l'identifier da `taxonomy.poi_type.identifier` quando `taxonomyIdentifiers` è assente.

### `identifier: null` in `taxonomy.poi_type` per POI non rigenerati
Durante il test, il POI "provola" aveva `taxonomy.poi_type.identifier: null` perché il contenuto della traccia non era stato rigenerato dopo l'ultimo aggiornamento del POI. Rigenerando il contenuto da Nova, il campo si è popolato correttamente. Non è un bug del codice — è un dato stale in DB.

### Variabile `isContained` inutilizzata in `pois.directive.ts`
Trovata durante il refactoring di `_isArrayContained`: la riga `const isContained = isArrayContained(...)` era seguita immediatamente da `return isArrayContained(...)` (stesso calcolo duplicato). Rimossa.

## Decisioni

- **`_allPoiMarkers` separato da `_poiMarkers`**: i marker creati una volta vengono tutti conservati in `_allPoiMarkers`; `_poiMarkers` continua a riflettere lo stato attuale del layer per la logica di deduplicazione esistente.
- **Nessun `addFeatureToLayer` nel loop**: le feature vengono aggiunte alla source solo da `_updateFilteredPois()`, evitando il doppio lavoro (aggiungi nel loop → clear → riaggiunge filtrate).
- **Guard `JSON.stringify`**: usato invece di `distinctUntilChanged` sull'Observable perché l'input arriva via `@Input()` setter, non via Observable diretto.

## Follow-up

- Il backend (`wm-package`) non include `taxonomyIdentifiers` nei `related_pois` della traccia. Il frontend gestisce il caso con il fallback su `taxonomy.poi_type.identifier`, ma sarebbe più robusto che il backend allineasse il formato. Aprire ticket separato se necessario.

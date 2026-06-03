> Ticket: oc:7646

# ECPOI filtro POI type — estensione ai related POI (map-core)

## Cosa cambia
`WmMapTrackRelatedPoisDirective` supporta un nuovo input `wmMapPoisFilters: string[]`. Quando il filtro è attivo, sulla mappa vengono mostrati solo i related POI il cui `taxonomyIdentifiers` contiene almeno uno degli identifier attivi. Se il filtro è vuoto, `null`, o il POI non ha `taxonomyIdentifiers`, il POI è sempre visibile.

## Perché
Il filtro per POI type era applicato solo al layer dei POI globali (`WmMapPoisDirective`). I related POI (visibili durante la navigazione di una traccia) ignoravano il filtro, causando incoerenza: l'utente disabilitava un tipo ma continuava a vederlo sui related.

## Requisiti
- [ ] `WmMapTrackRelatedPoisDirective` espone `@Input() wmMapPoisFilters: string[] = []`
- [ ] Input setter tratta `null` come `[]` (async pipe non ancora emessa = nessun filtro attivo)
- [ ] I marker vengono creati una sola volta al caricamento della traccia e salvati in `_allPoiMarkers`
- [ ] Al cambio di `wmMapPoisFilters`, il layer viene aggiornato senza ricreare i marker (`featureSource.clear()` + riaggiunta feature filtrate)
- [ ] Predicato di filtro: se `wmMapPoisFilters` è vuoto → tutti i POI visibili; se il POI non ha `taxonomyIdentifiers` (null/undefined/vuoto) → POI sempre visibile; altrimenti `_isArrayContained(wmMapPoisFilters, taxonomyIdentifiers)`
- [ ] `_isArrayContained` estratta in funzione condivisa in `utils` (non duplicata dalla directive dei POI globali)
- [ ] Input setter usa `distinctUntilChanged` per evitare re-render su emissioni identiche consecutive
- [ ] `_allPoiMarkers` resettato in `_resetView()` insieme a `_poiMarkers`
- [ ] Il filtro viene applicato solo dopo che `_initPois$` emette `true` (guard contro race condition)
- [ ] Test unitari in `track.related-pois.directive.spec.ts`: array vuoto → tutti visibili, `null` → tutti visibili, POI senza `taxonomyIdentifiers` → visibile, filtro attivo → solo matching

## Rischi
- **Race condition wmMapPoisFilters / _initPois$**: se il filtro arriva prima del completamento dell'init, la prima selezione viene persa. Mitigazione: il filtro viene applicato in risposta a `_initPois$.next(true)` e ad ogni successiva emissione di `wmMapPoisFilters`.
- **Marker orfani**: se `_allPoiMarkers` non viene resettato al cambio traccia, POI di una traccia precedente riappaiono. Mitigazione: reset esplicito in `_resetView()`.
- **Deployment asincrono**: map-core e wm-core devono essere sincronizzati — il binding in wm-core è inutile senza la directive aggiornata, e viceversa.

## Out of scope
- Configurazione backend `poi_min_zoom` e `filter_poi_type` via Nova
- Nuova UI dei filtri
- Persistenza filtri su DB o URL
- Clustering POI
- Feedback UX quando nessun POI corrisponde al filtro

## Moduli toccati
- `core/src/app/shared/map-core/src/directives/track.related-pois.directive.ts`
- `core/src/app/shared/map-core/src/directives/track.related-pois.directive.spec.ts`
- `core/src/app/shared/map-core/src/utils/` (estrazione `_isArrayContained`)

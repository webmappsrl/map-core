# map-core — CLAUDE.md

## Feature disponibili

| Feature | Ticket | Moduli toccati | Note |
|---|---|---|---|
| Fallback offline per fogli CARG e icone controlli mappa | oc:8219 | `src/directives/hit-map.directive.ts`, `src/components/controls/button/button.controls.map.ts`, `src/utils/localForage.ts`, `src/utils/cacheFallback.ts` | Cache locale dedicata con fallback quando il fetch remoto fallisce offline; `withCacheFallback` condiviso tra i due; `distinctUntilChanged` evita il re-fetch delle icone ad ogni riconnessione di rete |
| Filtro POI type esteso ai related POI | oc:7646 | `src/directives/track.related-pois.directive.ts`, `src/directives/pois.directive.ts`, `src/utils/ol.ts` | wmMapPoisFilters ora filtra anche i POI della traccia corrente; fallback su taxonomy.poi_type.identifier se taxonomyIdentifiers assente |
| EC POI: show_image_on_map | oc:7988 | `src/directives/track.related-pois.directive.ts`, `src/types/model.ts` | Rendering POI su mappa pilotato dal campo `feature_image.show_image_on_map`; fallback legacy per app mobile |

## Decisioni architetturali

### Fallback offline per fogli CARG e icone controlli mappa (oc:8219)
- **Solo cache locale, nessun retry su riconnessione**: per scaricare un foglio l'utente deve prima cliccarlo sulla mappa, il che richiede che il layer di hit-test sia già stato costruito con successo — quindi un fetch riuscito (e una cache valida) esiste sempre prima che un download possa esistere. Il fallback da cache copre interamente lo scenario "riapro l'app offline dopo un download", senza bisogno di ascoltare lo stato di rete.
- **Cache dedicate, non riuso di `saveFeatureCollection`/`getFeatureCollection`**: quelle funzioni condividono keyspace con i download per-foglio di `downloadOverlay()` e hanno un fallback di rete implicito su cache-miss — avrebbero reintrodotto un retry non voluto. Nuove istanze `localForage`: `hitMapBoundariesLocalForage`, `iconBlobsLocalForage`.
- **Icone dei controlli mappa non passano da `<wm-img>`/`getImg` (wm-core)**: `map-core` non dipende mai da `wm-core` (libreria OL indipendente); inoltre `getImg()` legge da cache popolate solo dal flusso di sync UGC/foto profilo, non dalle icone di config. Nuova cache locale autonoma in `map-core`.
- **`withCacheFallback` (`src/utils/cacheFallback.ts`)**: operatore RxJS condiviso per il pattern fetch→valida→salva→fallback, usato sia da `hit-map.directive.ts` sia da `button.controls.map.ts` — evita di duplicare la stessa catena switchMap/catchError con validazioni divergenti (una review pre-commit aveva trovato l'icona cachata senza validazione, a differenza della GeoJSON).
- **`distinctUntilChanged()` obbligatorio su pipeline innescate da un `@Input` setter ricostruito da NgRx**: `conf.reducer.ts` crea nuovi riferimenti oggetto per i control `tiles`/`data`/`overlays` ad ogni `loadConfSuccess`, e l'app dispatcha `loadConf()` ad ogni riconnessione di rete (`home.page.ts`) — senza `distinctUntilChanged`, ogni reconnect rifaceva il fetch di tutte le icone anche se invariate.
- **Guardia su componente distrutto durante un cache-lookup asincrono pendente**: nessuna directive/componente di questo file ha `ngOnDestroy`/`takeUntil` per disiscrivere subscription pendenti; `WmMapComponent.ngOnDestroy()` imposta `this.map = null` — qualsiasi callback che dereferenzia `this.mapCmp.map` dopo un hop asincrono (es. lettura da `localForage`) deve controllare `!= null` prima di usarlo.
- **`button.controls.map.spec.ts` in CI headless**: è presentazionale (nessun `OlMap`), aggiunto a `angular.json` → `configurations.ci.include` — a differenza degli altri directive/component spec che montano un vero `OlMap` e restano esclusi dalla CI (limite GPU, vedi "Note ambiente").
- **Debito noto non affrontato**: fix di `CustomTileSource` per l'inaffidabilità di `navigator.onLine` sui tile raster (problema preesistente, più ampio di questo ticket); rimozione di `loadHitmap$`/`loadHitmapFeatures`/`wmMapHitmapFeatures` in wm-core (codice apparentemente morto, proposto come ticket Task separato).

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

### Test Karma (fix: oc:7989)

- **CI (27 test utils):** `CI=true npx ng test map-core --configuration=ci` — gira solo i spec utils che non dipendono da OL Map rendering.
- **Locale (tutti i test):** `nvm use 22 && npx ng test map-core` — apre Chrome con GPU, tutti i 186 spec disponibili.
- **Limitazione CI:** i directive/component spec (base, track, pois, position, etc.) creano un vero `OlMap` che crashe Chrome headless `--disable-gpu`. Per eseguirli serve un browser con GPU. Il CI include solo i 27 test utils.
- Per eseguire i test usare `nvm use 22` prima di `npm test`.

### Fix applicati (oc:7989)

- `angular.json`: sostituito `main: "src/test.ts"` (usa `require.context` webpack 4) con `polyfills: ["zone.js", "zone.js/testing"]` (webpack 5 compatible)
- `tsconfig.spec.json`: rimosso `"files": ["src/test.ts"]`
- `src/directives/base.directive.spec.ts`: aggiunto `standalone: false` a `TestComponent` (Angular 17+ default standalone)
- `src/karma.conf.js`: aggiunto flag Chrome headless per ambiente CI
- `angular.json` `configurations.ci`: aggiunto `include` con soli spec utils
- `src/utils/styles.spec.ts`: aggiornati z-index attesi (TRACK_DIRECTIVE_ZINDEX 50→500), riscritti test `buildRefStyle` per firma corrente

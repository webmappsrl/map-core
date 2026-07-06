> Ticket: oc:8219

# Piano implementativo — Fogli raster CARG non si caricano se l'app viene riaperta offline dopo il download

Repo: `map-core` (submodulo). Nessuna modifica a `wm-core` o al repo principale (vedi `overview.md`).

Commit convention: `feat(oc:8219): ...` / `fix(oc:8219): ...` / `test(oc:8219): ...`.

⚠️ I commit indicati sotto ogni step sono istruzioni testuali per il developer, non azioni automatiche — nessun commit va eseguito senza conferma esplicita dell'utente (Fase: execution → review-gate).

---

## Step 1 — Cache dedicata in `localForage.ts`

File: `map-core/src/utils/localForage.ts`

- Aggiungere una nuova istanza localForage dedicata, separata da `featureCollectionLocalForage`:
  ```ts
  export const hitMapBoundariesLocalForage = localforage.createInstance({
    name: 'map-core',
    storeName: 'hitmapBoundaries',
  });
  ```
- Aggiungere una funzione di validazione minima dello schema:
  ```ts
  function isValidFeatureCollection(payload: any): payload is WmFeatureCollection {
    return payload != null && payload.type === 'FeatureCollection' && Array.isArray(payload.features);
  }
  ```
- Aggiungere `saveHitMapBoundaries(url: string, geojson: WmFeatureCollection): Promise<void>`:
  - Se `!isValidFeatureCollection(geojson)`, non scrivere nulla (log `console.error`) — non deve mai sovrascrivere una cache precedente valida con un payload rotto.
  - Altrimenti `await hitMapBoundariesLocalForage.setItem(url, geojson)`, try/catch con `console.error` (stesso pattern delle altre funzioni del file).
- Aggiungere `getHitMapBoundariesFromCache(url: string): Promise<WmFeatureCollection | null>`:
  - `await hitMapBoundariesLocalForage.getItem<WmFeatureCollection>(url)`, try/catch con `console.error`, ritorna `null` su errore o cache-miss.
  - **Nessun fallback di rete interno** (a differenza di `getFeatureCollection` esistente) — la responsabilità del fetch resta nella directive.
- Aggiungere `hitMapBoundariesLocalForage.clear()` a `clearMapCoreData()`, per coerenza con le altre istanze già pulite lì.

Non toccare `saveFeatureCollection`/`getFeatureCollection` esistenti (restano dedicate al flusso `downloadOverlay()` per-foglio).

**Verifica step:** `npx tsc --noEmit` (o build map-core) passa senza errori di tipo.

---

## Step 1B — Cache blob icone in `localForage.ts` (estensione scope)

Stesso file dello Step 1, stesso pattern.

- Nuova istanza dedicata, separata sia da `hitMapBoundariesLocalForage` sia da `featureCollectionLocalForage`:
  ```ts
  export const iconBlobsLocalForage = localforage.createInstance({
    name: 'map-core',
    storeName: 'iconBlobs',
  });
  ```
- `saveIconBlob(url: string, blob: Blob): Promise<void>` — `await iconBlobsLocalForage.setItem(url, blob)`, try/catch con `console.error`. Nessuna validazione di schema necessaria (un `Blob` valido arriva già come tale da `HttpClient` con `responseType: 'blob'`; una risposta HTTP non-2xx finisce nel branch di errore, non qui).
- `getIconBlobFromCache(url: string): Promise<Blob | null>` — `await iconBlobsLocalForage.getItem<Blob>(url)`, try/catch, ritorna `null` su errore o cache-miss. Nessun fallback di rete interno (stessa filosofia di `getHitMapBoundariesFromCache`).
- Aggiungere `iconBlobsLocalForage.clear()` a `clearMapCoreData()`.

**Verifica step:** `npx tsc --noEmit` passa senza errori di tipo.

---

## Step 2 — Fallback e validazione in `hit-map.directive.ts`

File: `map-core/src/directives/hit-map.directive.ts`

1. Importare `saveHitMapBoundaries`, `getHitMapBoundariesFromCache` da `@map-core/utils` (via `localForage.ts`, seguendo il barrel export esistente per `localForage.ts` se presente, altrimenti path diretto coerente con l'import già presente di `CustomTileSource`/`coordsFromLonLat` da `@map-core/utils`).

2. Estrarre la logica di rendering in un metodo privato condiviso tra branch di successo e di fallback:
   ```ts
   private _renderHitMap(geojson: WmFeatureCollection): void {
     try {
       this.mapCmp.map.once('precompose', () => {
         this._buildGeojson(geojson);
         this._addTileLayer();
       });
     } catch (e) {
       console.error('Failed to render hit map from geojson', e);
     }
   }
   ```
   (il try/catch copre l'eccezione sincrona di `_buildGeojson`/`_addTileLayer` se lanciata prima della callback `once`; se l'eccezione può verificarsi dentro la callback `precompose` stessa — asincrona rispetto al chiamante — spostare il try/catch dentro la callback, non attorno a `map.once(...)`. Verificare a implementazione quale dei due casi si applica leggendo dove effettivamente viene lanciata l'eccezione di OpenLayers/GeoJSON parsing.)

3. Riscrivere il setter `wmMapHitMapUrl`:
   ```ts
   @Input() set wmMapHitMapUrl(url: undefined | string) {
     this.mapCmp.isInit$
       .pipe(
         filter(e => e === true && url != null),
         switchMap(_ =>
           this._http.get(url).pipe(
             tap((geojson: WmFeatureCollection) => saveHitMapBoundaries(url, geojson)),
             catchError(_ => from(getHitMapBoundariesFromCache(url))),
           ),
         ),
         filter(geojson => geojson != null),
         take(1),
       )
       .subscribe((geojson: WmFeatureCollection) => {
         this._renderHitMap(geojson);
       });
   }
   ```
   - Import aggiuntivi da `rxjs/operators`: `catchError`, `tap`; da `rxjs`: `from`.
   - Se sia il fetch che la cache falliscono (`getHitMapBoundariesFromCache` risolve `null`), il `filter(geojson => geojson != null)` scarta l'emissione — nessun layer, nessun errore, comportamento invariato rispetto ad oggi (requisito esplicito dell'overview).
   - `saveHitMapBoundaries` internamente valida lo schema prima di scrivere (Step 1) — nessuna validazione duplicata qui nella directive.

**Verifica step:** lettura del diff — confermare che il branch di successo continua a chiamare `_buildGeojson` + `_addTileLayer` esattamente come oggi (via `_renderHitMap`), e che il branch di fallback fa lo stesso.

---

## Step 2B — Fallback e cache in `button.controls.map.ts` (estensione scope)

File: `map-core/src/components/controls/button/button.controls.map.ts` (+ template inline nello stesso file)

1. Iniettare `HttpClient` nel costruttore, importare `saveIconBlob`/`getIconBlobFromCache` da `@map-core/utils`, implementare `OnDestroy`.

2. Sostituire il binding diretto con un observable risolto:
   ```ts
   private _iconUrlEVT$ = new BehaviorSubject<string | null>(null);
   private _lastObjectUrl: string | null = null;

   iconSrc$: Observable<string> = this._iconUrlEVT$.pipe(
     filter(url => url != null),
     switchMap(url =>
       this._http.get(url, {responseType: 'blob'}).pipe(
         tap(blob => saveIconBlob(url, blob)),
         catchError(_ => from(getIconBlobFromCache(url))),
         map(blob => (blob != null ? this._toObjectUrl(blob) : url)), // fallback finale: url diretto, comportamento odierno
       ),
     ),
   );

   private _toObjectUrl(blob: Blob): string {
     if (this._lastObjectUrl) {
       URL.revokeObjectURL(this._lastObjectUrl);
     }
     this._lastObjectUrl = URL.createObjectURL(blob);
     return this._lastObjectUrl;
   }

   ngOnDestroy(): void {
     if (this._lastObjectUrl) {
       URL.revokeObjectURL(this._lastObjectUrl);
     }
   }
   ```

3. Nel setter `@Input('wmMapButtonControl') set control(...)`, dopo aver assegnato `this._control`, se `value.type === 'button' && value.icon_url != null` chiamare `this._iconUrlEVT$.next(value.icon_url)`.

4. Aggiornare il template: sostituire `[src]="iconUrl"` con `[src]="iconSrc$|async"`, mantenendo invariato `*ngIf="control.icon_url as iconUrl;else sanitazeIcon"` (il ramo `else` con l'SVG inline sanitizzato non cambia).

**Nota di design:** `iconSrc$` emette in ordine: blob dal fetch riuscito (via object URL) → blob dalla cache se il fetch fallisce (via object URL) → url diretto come ultima risorsa se anche la cache è vuota. Il fallback finale mantiene il comportamento attuale (nessuna regressione se sia rete che cache falliscono).

**Verifica step:** lettura del diff — confermare che il ramo `else sanitazeIcon` (icona SVG inline) non è toccato, e che `_toObjectUrl` revoca sempre l'object URL precedente prima di crearne uno nuovo.

---

## Step 3 — Unit test Karma

File nuovo: `map-core/src/directives/hit-map.directive.spec.ts`

Seguire il pattern di `pois.directive.spec.ts` (TestBed con `WmMapComponent` reale, `TestComponent` host con `wmMapHitMapCollection` + binding `[wmMapHitMapUrl]`, attesa di `isInit$` prima delle assertion). Mockare `HttpClient` fornito dal `TestBed` (`{provide: HttpClient, useValue: {get: jasmine.createSpy(...)}}`) e spiare `saveHitMapBoundaries`/`getHitMapBoundariesFromCache` importate dal modulo `localForage.ts` (`spyOn` sul modulo o dependency injection se il progetto lo consente — verificare pattern già usato altrove nel repo per spiare funzioni esportate da modulo, non da classe).

Casi da coprire (ognuno un `it`):
1. **Fetch riuscito con payload valido** → `_hitMapLayer` viene creato, `_addTileLayer()` chiamato, `saveHitMapBoundaries` chiamata con url e geojson.
2. **Fetch fallito + cache presente** → `getHitMapBoundariesFromCache` chiamata, `_hitMapLayer` costruito dal payload di cache, `_addTileLayer()` chiamato (stesso comportamento del caso 1, sorgente dati diversa).
3. **Fetch fallito + cache assente (`null`)** → nessun layer creato, nessuna eccezione lanciata, nessuna chiamata a `_buildGeojson`/`_addTileLayer`.
4. **Fetch riuscito con payload non valido** (es. `{notAFeatureCollection: true}`) → `saveHitMapBoundaries` non scrive (verificabile spiando `hitMapBoundariesLocalForage.setItem` o il comportamento di `isValidFeatureCollection` se esportata) — la cache precedente non viene sovrascritta.
5. **Cache con payload corrotto che fa lanciare `GeoJSON.readFeatures`** → l'eccezione non si propaga fuori dalla subscribe (il test non deve fallire per unhandled exception), nessun layer creato.

⚠️ Nota da riportare in `notes.md`: questo spec, come gli altri directive spec del repo, crea una vera `OlMap` e **non gira in CI headless** (limite documentato in `map-core/CLAUDE.md` — solo i 27 test "utils" girano in CI). Va eseguito localmente con `nvm use 22 && npx ng test map-core` prima di aprire la PR.

**Verifica step:** `nvm use 22 && npx ng test map-core` — tutti gli `it` di `hit-map.directive.spec.ts` passano in locale.

---

## Step 3B — Unit test Karma per `button.controls.map.ts` (estensione scope)

File nuovo: `map-core/src/components/controls/button/button.controls.map.spec.ts`

Setup minimo (componente presentazionale, non richiede `WmMapComponent`/`OlMap` reale — TestBed diretto su `WmMapButtonControls` con `HttpClientTestingModule` o `{provide: HttpClient, useValue: ...}`).

Casi da coprire:
1. **Fetch riuscito** → `iconSrc$` emette un object URL (`blob:...`), `saveIconBlob` chiamata con l'url e il blob.
2. **Fetch fallito + cache presente** → `getIconBlobFromCache` chiamata, `iconSrc$` emette un object URL costruito dal blob di cache.
3. **Fetch fallito + cache assente** → `iconSrc$` emette l'URL diretto originale (fallback finale, nessuna regressione).
4. **`ngOnDestroy`** → `URL.revokeObjectURL` chiamata sull'ultimo object URL creato (spy su `URL.revokeObjectURL`/`URL.createObjectURL`).

Questo spec **non** crea una `OlMap` (componente presentazionale puro) — verificare se rientra già nei test "utils" eseguibili in CI headless o se va aggiunto esplicitamente all'`include` di `configurations.ci` in `angular.json` (map-core), dato che non ha la stessa limitazione GPU degli altri directive/component spec.

**Verifica step:** `nvm use 22 && npx ng test map-core` — tutti gli `it` di `button.controls.map.spec.ts` passano; verificare anche se girano in `CI=true npx ng test map-core --configuration=ci`.

---

## Step 4 — Notes e follow-up

Compilare `docs/features/8219-fogli-carg-offline-dopo-riapertura-app/notes.md` (map-core) con:
- Follow-up: proporre ticket Task separato per la rimozione di `loadHitmap$`/`loadHitmapFeatures`/`wmMapHitmapFeatures` (wm-core, codice apparentemente morto, individuato durante l'analisi di questo bug ma out of scope).
- Nota sul limite dei test Karma su directive (non in CI, richiede esecuzione locale pre-PR).
- Eventuali deviazioni emerse durante l'implementazione (es. se il try/catch va spostato dentro la callback `precompose` invece che attorno, come segnalato nello Step 2).
- Nota sull'estensione di scope in corsa: bug delle icone dei controlli mappa scoperto durante la verifica manuale della fix principale, incluso su richiesta esplicita invece di aprire un ticket separato.

---

## Riepilogo file toccati

| File | Repo | Modifica |
|---|---|---|
| `src/utils/localForage.ts` | map-core | Nuova istanza `hitMapBoundariesLocalForage` + `saveHitMapBoundaries`/`getHitMapBoundariesFromCache`/`isValidFeatureCollection`; nuova istanza `iconBlobsLocalForage` + `saveIconBlob`/`getIconBlobFromCache` |
| `src/directives/hit-map.directive.ts` | map-core | Fallback da cache nel setter `wmMapHitMapUrl`, estrazione `_renderHitMap()` con try/catch |
| `src/directives/hit-map.directive.spec.ts` (nuovo) | map-core | Unit test Karma per i 5 casi del layer di hit-test |
| `src/components/controls/button/button.controls.map.ts` | map-core | Risoluzione `icon_url` come blob con cache locale e fallback, revoke object URL |
| `src/components/controls/button/button.controls.map.spec.ts` (nuovo) | map-core | Unit test Karma per i 4 casi delle icone |
| `docs/features/8219-.../notes.md` (nuovo) | map-core | Follow-up e deviazioni |

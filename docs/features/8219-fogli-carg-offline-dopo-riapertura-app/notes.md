> Ticket: oc:8219

# Notes — Fogli raster CARG non si caricano se l'app viene riaperta offline dopo il download

## Deviazioni dal piano

- **Retry su riconnessione rimosso dallo scope** prima dell'implementazione: l'overview iniziale prevedeva anche un `@Input() wmMapHitMapOnline` con wiring in `wm-core` (`geobox-map.component.ts`). Rianalizzando lo scenario, il solo fallback da cache locale copre interamente il bug (un fetch riuscito, e quindi una cache valida, esiste sempre prima che un download possa esistere) — eliminata la parte di retry/wiring wm-core prima di scrivere codice, nessuna modifica a wm-core in questo ciclo.
- **Estensione di scope in corsa**: durante la verifica manuale della fix principale, è emerso che anche le icone dei controlli mappa (`WmMapButtonControls`, `icon_url`) restano vuote offline — stesso sintomo di fondo (risorsa remota senza fallback), meccanismo e componente diversi, non CARG-specifico. Incluso in questo ciclo su richiesta esplicita del developer invece di aprire un ticket separato. `overview.md` e `plan.md` sono stati aggiornati per riflettere l'estensione (sezioni "Requisiti aggiuntivi — icone dei controlli mappa" e Step 1B/2B/3B).
- **`_renderHitMap()` con try/catch dentro la callback `precompose`**, non attorno a `map.once(...)`: l'eccezione di `_buildGeojson()`/`_addTileLayer()` si verifica dentro la callback asincrona, non nella chiamata sincrona a `map.once`.

## Bug trovati

- Spiare direttamente le funzioni esportate da `localForage.ts` (`saveHitMapBoundaries`, `getHitMapBoundariesFromCache`, `saveIconBlob`, `getIconBlobFromCache`) con `spyOn(moduleNamespace, 'fnName')` fallisce a runtime con `<spyOn> : ... is not declared writable or has no setter` — le esportazioni ES module compilate da questo build (webpack/TS) non sono configurabili. Fix: spiare i metodi dell'istanza `localForage` sottostante (es. `hitMapBoundariesLocalForage.setItem`/`getItem`, `iconBlobsLocalForage.setItem`/`getItem`), che sono proprietà di un oggetto plain JS e restano spiabili normalmente. **Da tenere a mente per futuri test che spiano funzioni esportate da modulo in questo repo** — non è un problema specifico di questo ticket, riguarda qualunque test futuro con lo stesso pattern.
- `hit-map.directive.spec.ts` falliva con `NG0201: No provider found for ActivatedRoute` — `WmMapComponent` (map-core) inietta `ActivatedRoute` nel costruttore; nessuno spec esistente nel repo lo fornisce esplicitamente nel `TestBed`. Aggiunto un provider stub minimo. Probabile problema latente anche per gli altri spec esistenti che montano `WmMapComponent` — non indagato oltre, fuori scope.

## Decisioni

- Cache dedicata (`hitMapBoundariesLocalForage`, `iconBlobsLocalForage`) invece di riuso di `saveFeatureCollection`/`getFeatureCollection` esistenti — vedi "Rischi" in `overview.md` (keyspace condiviso con i download per-foglio + fallback di rete implicito indesiderato).
- Icone dei controlli mappa: nuova cache locale in `map-core` invece di riuso di `<wm-img>`/`getImg` (wm-core) — `<wm-img>` dipende da `@wm-core/utils/localForage`, userlo da `map-core` violerebbe il confine architetturale "map-core non dipende da wm-core" già scelto per il retry della GeoJSON. Inoltre `getImg()` legge da cache (`deviceImg`/`synchronizedImg`) popolate solo dal flusso di sync UGC/foto profilo — le icone di config CARG non ci finirebbero comunque dentro senza ulteriore lavoro su wm-core.

## Review formale (wm-review-ticket, pre-commit)

Eseguita una review con 5 finder paralleli sul diff non ancora committato. Verdetto: approvato con riserve, 2 blocker + 5 cleanup, tutti corretti prima del commit.

**Blocker corretti:**
- **Crash null-pointer su distruzione componente durante un cache-lookup pendente** (`hit-map.directive.ts`, `_renderHitMap`): se il fetch fallisce offline e l'utente naviga via prima che `getHitMapBoundariesFromCache()` si risolva, `WmMapComponent.ngOnDestroy()` ha già impostato `this.mapCmp.map = null` — la vecchia `_renderHitMap` chiamava `.once()` su `null` fuori dal try/catch. Aggiunta una guardia `if (this.mapCmp.map == null) return;` in testa al metodo. Nuovo test dedicato: "componente distrutto durante il cache-lookup pendente".
- **Icone dei controlli mappa ri-scaricate ad ogni riconnessione di rete** (`button.controls.map.ts`): `conf.reducer.ts` crea nuovi riferimenti oggetto per ogni control ad ogni `loadConfSuccess`, e `home.page.ts` dispatcha `loadConf()` ad ogni transizione offline→online — senza `distinctUntilChanged()`, ogni riconnessione rifaceva il fetch di tutte le icone. Aggiunto `distinctUntilChanged()` sulla pipeline `iconSrc$`.

**Cleanup corretti:**
- Validazione minima del blob delle icone prima di cachare (`isValidIconBlob`, rifiuta blob vuoti) — simmetrico alla validazione già presente per la GeoJSON.
- Estratto un operatore RxJS condiviso `withCacheFallback` (nuovo file `src/utils/cacheFallback.ts`) che unifica il pattern "fetch → valida → salva su successo → fallback da cache su fallimento/payload invalido", usato sia da `hit-map.directive.ts` sia da `button.controls.map.ts` — elimina la duplicazione segnalata dalla review e logga l'errore HTTP originale prima di ricadere sulla cache (prima veniva scartato silenziosamente).
- `isValidFeatureCollection` ora esportata e riusata anche sul ramo di successo (non solo prima della scrittura in cache): un payload 200 ma con schema errato ora fa fallback sulla cache invece di tentare un render con dati corrotti.
- Rinominato `_iconUrlEVT$` → `_iconUrl$` (il suffisso `EVT$` nel repo è riservato a `@Output`/eventi, non a stato interno).
- Riscritto il test "fetch riuscito con payload non valido": la versione precedente chiamava le funzioni di `localForage.ts` direttamente, bypassando la pipeline della direttiva — ora esercita `directive.wmMapHitMapUrl` con un payload invalido e verifica sia il mancato overwrite della cache sia il fallback effettivo.
- Aggiunto assert mancante nel test "cache con payload corrotto" (`_addTileLayer` non deve essere chiamato).
- Decisione presa sull'inclusione CI (richiesta da `plan.md` Step 3B, mai presa prima): `button.controls.map.spec.ts` aggiunto a `angular.json` → `configurations.ci.include` — è presentazionale, nessun `OlMap`/GPU richiesto. Verificato: `CI=true npx ng test map-core --configuration=ci` → 31/31 SUCCESS (27 preesistenti + 4 nuovi).

Dopo i fix, `nvm use 22 && npx ng test map-core` (locale, GPU) resta comunque necessario per verificare i 6 test di `hit-map.directive.spec.ts` (non eseguibili in modo affidabile in questo sandbox, vedi sopra).

## Follow-up

- **Ticket Task separato proposto**: rimozione di `loadHitmap$` / `loadHitmapFeatures` / `wmMapHitmapFeatures` (`user-activity.effects.ts`, wm-core) — meccanismo di fetch equivalente a quello fixato in questo ticket ma apparentemente senza consumer (nessun componente sottoscrive lo state risultante), scoperto durante l'analisi ma esplicitamente out of scope qui.
- **Verifica manuale richiesta al developer prima del merge**: eseguire `nvm use 22 && npx ng test map-core` in locale per una verifica affidabile di `hit-map.directive.spec.ts` (in questo sandbox l'esecuzione reale di test che montano un vero `OlMap` non è affidabile — anche spec preesistenti e non toccati da questa fix, es. `pois.directive.spec.ts`, falliscono qui per un problema di bootstrap globale scollegato da questo ticket). `button.controls.map.spec.ts` è stato invece verificato con successo in questo sandbox (4/4 test passano).
- **Test manuale su device/emulatore Android in modalità aereo**: non eseguito in questa sessione (nessun device disponibile) — demandato al developer prima del merge, come da `overview.md`.
- **CORS sulle icone `icon_url`**: non verificato se i CDN attualmente usati per le icone dei controlli mappa espongono header CORS — se non li espongono, il fetch blob fallirà sempre (fallback sicuro sull'URL diretto, nessuna regressione) ma con una richiesta di rete aggiuntiva ad ogni icona. Da monitorare dopo il rilascio.

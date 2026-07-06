> Ticket: oc:8219

# Fogli raster CARG non si caricano se l'app viene riaperta offline dopo il download

## Cosa cambia

`WmMapHitMapDirective` (`hit-map.directive.ts`) smette di dipendere in modo esclusivo da un fetch remoto one-shot per costruire il layer di hit-test dei fogli CARG (`_hitMapLayer`):

- Ogni fetch remoto riuscito della GeoJSON dei confini fogli (`wmMapHitMapUrl`) viene persistito in `localForage` (map-core, `localForage.ts`).
- Se il fetch remoto fallisce (es. app avviata offline), la direttiva ricostruisce `_hitMapLayer` a partire dalla GeoJSON in cache locale, se presente — il click su un foglio già scaricato in precedenza torna a funzionare offline.

Nessun meccanismo di retry sulla riconnessione: per poter scaricare un foglio, l'utente deve prima averlo cliccato sulla mappa, il che richiede che `_hitMapLayer` sia già stato costruito con successo — quindi un fetch remoto riuscito (e di conseguenza una cache valida) esiste sempre prima che un download possa esistere. Il solo fallback da cache locale copre quindi interamente lo scenario del ticket, senza bisogno di ascoltare lo stato di rete né di introdurre dipendenze tra `map-core` e `wm-core`.

**Estensione dello scope (scoperta durante l'implementazione):** anche le icone dei controlli mappa (pannello "features"/layer switcher: `tiles`/`data`/`overlays` di `ICONTROLS`) risultano vuote offline. `WmMapButtonControls` (`components/controls/button/button.controls.map.ts`) renderizza `control.icon_url` con un semplice `<img [src]="iconUrl">` su un URL remoto, senza alcuna cache — a differenza del layer di hit-test, qui non esiste nessun meccanismo offline preesistente. Si applica lo stesso pattern già validato per la GeoJSON dei confini: fetch dell'icona come blob, cache locale dedicata al successo, fallback dalla cache al fallimento.

A differenza del resto della fix (scoperta esplicitamente per `hitMapUrl`/CARG), questa parte **non è CARG-specific**: `ICONTROLSBUTTON.icon_url` è un campo generico usato da tutti gli shard che configurano icone remote per i controlli `tiles`/`data`/`overlays` — il fix si applica a tutte le app, non solo a CARG.

## Perché

Bug segnalato su build Android shard CARG: dopo aver scaricato un foglio raster online, chiudendo e riaprendo l'app offline il foglio risulta nell'elenco download ma il click sulla mappa non fa nulla. Root cause: `_http.get(url)` nel setter di `wmMapHitMapUrl` non ha `catchError`/fallback — se fallisce, `_hitMapLayer` non viene mai creato in quella sessione, anche se i tile del foglio sono già disponibili offline in `localForage` (serviti da `CustomTileSource`). Il secondo sintomo riportato ("tornando online senza riavviare l'app la mappa resta bloccata") è conseguenza diretta dell'assenza totale di fallback: con la cache locale in place non si presenta più, perché l'app offline funziona già correttamente fin da subito.

Durante la verifica manuale della fix, l'utente ha notato che anche le icone del pannello dei controlli mappa (es. "Geologia punti/linee/poligoni") restano vuote offline — stesso sintomo di fondo (risorsa remota senza fallback locale), componente e meccanismo diversi. Incluso in questo ciclo su richiesta esplicita, invece di aprire un ticket separato.

## Requisiti

- [ ] La GeoJSON dei confini fogli (`wmMapHitMapUrl`) viene salvata in cache locale dedicata ad ogni fetch remoto riuscito, **solo dopo validazione minima dello schema** (es. `type === 'FeatureCollection'`) — un payload non valido (es. pagina HTML di manutenzione risposta con 200) non deve mai sovrascrivere una cache precedente valida
- [ ] Se il fetch fallisce, `_hitMapLayer` viene costruito dalla GeoJSON in cache locale, se presente
- [ ] Il branch di fallback-da-cache chiama sia `_buildGeojson()` sia `_addTileLayer()`, a specchio del branch di successo (righe 37-42 attuali) — senza questo il layer raster CARG non verrebbe mai creato pur avendo il layer di hit-test funzionante
- [ ] `_buildGeojson()` è avvolta in try/catch in entrambi i branch (successo e fallback): un payload corrotto logga l'errore e lascia lo stato invariato (nessun layer), non propaga l'eccezione fuori dalla subscribe RxJS
- [ ] Cache dedicata su istanza `localForage` separata da quella usata da `downloadOverlay()` per le feature-collection per-foglio (nuove funzioni, es. `saveHitMapBoundaries(url, geojson)` / `getHitMapBoundariesFromCache(url)`, su una nuova istanza tipo `hitMapBoundariesLocalForage`) — nessun riuso di `saveFeatureCollection`/`getFeatureCollection` esistenti, che condividono keyspace con i download per-foglio e hanno un fallback di rete implicito su cache-miss che reintrodurrebbe un retry non voluto
- [ ] Se non c'è né fetch riuscito né cache locale disponibile, il comportamento resta quello attuale (nessun layer, nessun errore non gestito)
- [ ] Fix scoperta esplicitamente per l'uso attuale di `hitMapUrl` (solo shard CARG) — nessuna astrazione generica pensata per altri shard
- [ ] Unit test Karma su `hit-map.directive.ts`: mock `HttpClient` che fallisce + verifica fallback da cache locale (inclusa chiamata a `_addTileLayer()`); mock fetch riuscito + verifica che la GeoJSON venga salvata in cache dedicata; mock payload non valido (schema errato) + verifica che la cache precedente non venga sovrascritta; mock cache corrotta + verifica che l'eccezione non si propaghi

### Requisiti aggiuntivi — icone dei controlli mappa

- [ ] `WmMapButtonControls` risolve `control.icon_url` come blob via `HttpClient` invece del binding diretto `<img [src]="iconUrl">`
- [ ] Ogni fetch riuscito salva il blob dell'icona in una cache locale dedicata (nuova istanza `localForage`, es. `iconBlobsLocalForage`, separata da `hitMapBoundariesLocalForage` e da `featureCollectionLocalForage`)
- [ ] Se il fetch fallisce, l'icona viene letta dalla cache locale se presente e mostrata da lì (object URL dal blob cachato)
- [ ] Se non c'è né fetch riuscito né cache disponibile, fallback sul comportamento attuale (binding diretto all'URL remoto) — nessuna regressione visibile rispetto a oggi in quel caso
- [ ] Gli object URL creati con `URL.createObjectURL` vengono revocati (`URL.revokeObjectURL`) quando non più necessari (cambio icona, distruzione componente) per evitare leak di memoria
- [ ] Il fallback `control.icon` (SVG inline sanitizzato, ramo `else sanitazeIcon` del template) resta invariato — non necessita fix, il dato è già embedded nella config e disponibile offline
- [ ] Fix applicata a tutti gli usi di `icon_url` in `ICONTROLSBUTTON` (tiles/data/overlays), non solo al contesto CARG — coerente con la natura generica del componente
- [ ] Unit test Karma su `button.controls.map.ts`: mock `HttpClient` che fallisce + verifica fallback da cache; mock fetch riuscito + verifica che il blob venga salvato in cache; mock fetch fallito e cache assente + verifica fallback sull'URL diretto

## Rischi

- **Tile raster non coperti dal fix — limite noto, accettato**: `CustomTileSource` (`map-core/src/utils/ol.ts`) decide se servire un tile dalla cache o dalla rete guardando `navigator.onLine`, non l'esito reale della richiesta HTTP. `navigator.onLine` è inaffidabile in WebView (es. Wi-Fi connesso senza internet reale, captive portal — scenario plausibile in aree outdoor). In quel caso il layer di hit-test si ricostruisce correttamente da cache (click funzionante) ma i tile raster potrebbero comunque apparire rotti/vuoti. Fuori scope: problema preesistente di `CustomTileSource`, non introdotto da questo fix — non toccato in questo ciclo.
- **Cache stale**: la GeoJSON cachata potrebbe non riflettere modifiche ai confini fogli lato backend se l'utente resta a lungo offline. Accettato per questo ciclo: il fallback è pensato per lo scenario "riapro l'app offline dopo un download recente", non come sostituto permanente del dato remoto — al primo fetch riuscito e validato la cache viene sovrascritta.
- **Cache mai popolata**: se l'app non ha mai fatto un fetch riuscito in precedenza (nessun dato in cache), il layer resta assente come oggi — accettabile perché in quel caso non può comunque esistere nessun foglio scaricato da mostrare.
- **Affidabilità di `localForage` su iOS**: WKWebView può evictare in modo aggressivo IndexedDB/localStorage sotto pressione di storage o dopo lunga inattività dell'app — il fallback potrebbe smettere di funzionare in modo intermittente e difficile da riprodurre. Limite noto della piattaforma, non mitigabile in questo ticket.
- **Invariante implicito "click sulla mappa prima del download" non imposto da test/architettura**: il fix assume che un fetch riuscito (e quindi una cache valida) esista sempre prima che un download possa esistere, perché oggi l'unico modo di avviare un download passa dal click su `_hitMapLayer`. Se una feature futura introducesse un percorso di download alternativo (es. "ri-scarica dalla lista download" senza passare dal click mappa), questa assunzione si romperebbe silenziosamente e il bug potrebbe ripresentarsi in forma nuova. Da tenere presente in review future, non azionabile ora.
- **Nessun timeout esplicito sul fetch remoto**: su reti lente-ma-non-morte il fallback scatterebbe solo dopo un'attesa lunga, con UX peggiore di un fallimento immediato. Micro-miglioramento non richiesto da questo ticket.
- **Nessun feature flag/kill switch, rollback lento**: `map-core` è un submodulo git con versione pinnata via commit SHA — un regresso introdotto da questo fix richiederebbe bump submodulo + nuova build + nuova release app store per essere disattivato, non un lever lato backend. Intrinseco all'architettura del progetto, non specifico di questa fix.
- **Cache senza versionamento/TTL, storage quota-exceeded silenzioso**: `saveFeatureCollection`-style functions loggano solo `console.error` su fallimento di scrittura, senza segnale visibile all'utente o telemetria. Debito tecnico accettato per lo scope di questo bug fix.
- **Blast radius più ampio per il fix delle icone**: `WmMapButtonControls` è un componente generico usato da tutti gli shard per tiles/data/overlays, non solo CARG — un regresso qui (es. leak di object URL, icone che smettono di aggiornarsi se il backend cambia l'immagine) si propaga a tutte le app, non solo a quella coinvolta nel bug originale. Mitigato dal fallback esplicito sul comportamento attuale in caso di fetch e cache entrambi falliti (nessuna regressione visibile in quel caso).
- **CORS su fetch via `HttpClient` per le icone**: un `<img src>` diretto non richiede header CORS per essere visualizzato (richiesta opaca), mentre `HttpClient.get(url, {responseType: 'blob'})` sì. Se il CDN delle icone non espone `Access-Control-Allow-Origin`, il fetch blob fallisce anche online — il fallback ricade sul binding diretto all'URL (stesso comportamento di oggi, quindi nessuna regressione), ma comporta un doppio tentativo di rete (fetch blob fallito + `<img>` diretto) per ogni icona dietro un CDN senza CORS, con latenza aggiuntiva. Da verificare quali CDN sono effettivamente usati per `icon_url` nelle config esistenti.
- **Cache icone senza versionamento**: se il backend sostituisce l'immagine dietro lo stesso `icon_url` (stesso problema di staleness già accettato per la GeoJSON), l'icona cachata offline potrebbe non riflettere l'ultima versione — accettato per lo stesso motivo (fallback pensato per uso recente offline, non sostituto permanente del dato remoto).

## Out of scope

- Fix di `CustomTileSource`/gestione `navigator.onLine` per i tile raster — vedi Rischi, problema preesistente e più ampio di questo ticket.
- Retry automatico del fetch alla riconnessione di rete — non necessario per lo scenario del ticket (vedi "Cosa cambia"); eventuale nice-to-have per l'edge case di cache mai popolata, da valutare separatamente se mai richiesto.
- Rimozione di `loadHitmap$` / `loadHitmapFeatures` / `wmMapHitmapFeatures` (action/effect/reducer/selector in `user-activity.effects.ts`, wm-core) — meccanismo di fetch equivalente ma apparentemente senza consumer (nessun componente lo sottoscrive), non collegato a questo bug. Segnalato come follow-up in `notes.md`, da trattare come ticket Task separato.
- Generalizzazione di `hitMapUrl`/`overlayXYZ` per shard diversi da CARG.
- Modifiche a `wm-core` (nessuna necessaria: la fix è interamente contenuta in `map-core`).
- Riuso del meccanismo `getImg`/`OfflineCallbackManager` già esistente in `wm-core` per le immagini UGC/profilo — non applicabile senza violare il confine `map-core`↛`wm-core`, e concettualmente diverso (quel meccanismo presuppone un passo di sync/download esplicito, assente per le icone di config)
- Test E2E Cypress per lo scenario "chiudi/riapri app offline dopo download" — non riproducibile in modo affidabile con gli intercept Cypress attuali (richiede controllo reale di rete + persistenza `localForage` tra reload app). Verifica manuale su device/emulatore Android in modalità aereo demandata al developer post-merge.
- Fix di eventuali altri usi di `<img src>` remoti non coperti da questo ticket (es. altre parti dell'app che mostrano immagini di config) — limitato esplicitamente a `WmMapButtonControls`/`icon_url` scoperto in questo ciclo.

## Moduli toccati

- `map-core/src/directives/hit-map.directive.ts` — fallback da cache locale sul fetch fallito, validazione schema anche sul ramo di successo, guardia su componente distrutto, try/catch su `_buildGeojson()`
- `map-core/src/utils/localForage.ts` — nuove funzioni dedicate di persistenza/lettura della GeoJSON dei confini fogli e dei blob delle icone (con validazione), su istanze `localForage` separate
- `map-core/src/utils/cacheFallback.ts` (nuovo) — operatore RxJS condiviso `withCacheFallback`, usato sia da `hit-map.directive.ts` sia da `button.controls.map.ts`
- `map-core/src/components/controls/button/button.controls.map.ts` — risoluzione di `icon_url` come blob con cache locale, fallback, e `distinctUntilChanged()` per evitare re-fetch ad ogni riconnessione
- `map-core/angular.json` — `button.controls.map.spec.ts` aggiunto all'`include` CI headless

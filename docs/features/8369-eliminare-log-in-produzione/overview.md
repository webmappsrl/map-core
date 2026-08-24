> Ticket: oc:8369

# Eliminare log in produzione — submodule map-core

## Cosa cambia

Triage manuale di tutte le chiamate `console.log/warn/error/debug/info` presenti in `map-core` (15 file, ~58 occorrenze):

- I `console.log` di puro rumore/debug estemporaneo vengono **cancellati**.
- I log strutturati con contesto utili per diagnosticare problemi futuri (es. diagnostica di caricamento tile/feature in `layer.directive.ts`, `hit-map.directive.ts`) vengono **commentati** con marker dedicato `// DEBUG: <riga originale>`.
- **Qualsiasi `console.*` (incluso `console.log`) dentro un blocco `catch` o un percorso di gestione errore resta intatto e visibile anche in produzione** — regola per *posizione*, non solo per metodo. Casi identificati: `position.directive.ts:297`, `map.component.ts:466,469`, `feature-collection.directive.ts:452` (tutti `console.log` dentro `catch`, non più candidati a cancellazione).
- Un `console.log`/`console.warn` fuori da `catch` che è l'**unico segnale diagnostico di un'area già documentata come fragile/critica** viene **commentato**, mai cancellato. Area rilevante qui: il fallback offline CARG (`hit-map.directive.ts`, `utils/localForage.ts`, `utils/cacheFallback.ts`, documentato come debito noto in CLAUDE.md oc:8219).
- Gli altri `console.error`/`console.warn` (es. `utils/httpRequest.ts`, `utils/cacheFallback.ts`, `styles.ts:93,189` fuori da catch, `map.component.ts:455`) **restano intatti e visibili anche in produzione**, per regola generale (error/warn restano sempre, indipendentemente dalla posizione).

Questo submodule non era taggato nel ticket originale (`oc:8369` include solo i tag `webmapp-app`/`wm-core`), ma è stato incluso esplicitamente su richiesta del developer per applicare la stessa policy a tutti i submodule in un solo ciclo.

## Perché

Stessa motivazione del repo principale e di wm-core (vedi rispettivi `overview.md`): policy aziendale di non mostrare log in produzione. `map-core` gestisce l'integrazione OpenLayers (tile, feature, disegno tracce) — i log qui sono spesso diagnostiche di performance/caricamento (`utils/performance.ts`, `utils/ol.ts`).

## Requisiti

- [ ] Ogni `console.log/warn/error/debug/info` in map-core è stato classificato: cancella / commenta con `// DEBUG:` / lascia intatto
- [ ] Qualsiasi `console.*` (incluso `log`) dentro un `catch` o percorso di gestione errore resta non modificato — regola per posizione, non solo per metodo
- [ ] `utils/performance.ts` (`startTime`/`endTime`): i `console.warn` restano invariati — asseriti da `utils/performance.spec.ts:19-23` via `spyOn(console, 'warn')`; **eccezione test**, stesso trattamento delle eccezioni già previste in wm-core. Nota: il file è codice morto (nessuna chiamata attiva, solo riferimenti commentati in `ol.ts`/`httpRequest.ts`), quindi l'eccezione ha impatto pratico nullo ma evita di rompere il test
- [ ] `npm run test` (Karma, dove eseguibile per questo submodule) continua a passare dopo le modifiche

## Rischi

- **Incoerenza tra repo** — stesso rischio già segnalato negli overview di webmapp-app/wm-core: criterio di classificazione applicato indipendentemente su 3 repo, mitigato dal criterio condiviso documentato in tutti e tre gli overview.md

## Out of scope

- Attivazione di un meccanismo di override dinamico (equivalente a `console-override.ts` di wm-core) — non esiste in map-core e non viene introdotto in questo ciclo
- Estensione dell'override di `main.ts` (repo principale) per silenziare `warn`/`error` — deciso di non farlo
- Log nativi Capacitor/logcat — fuori scope, copre solo `console.*` JS/TS (vedi overview repo principale)

## Moduli toccati

- `core/src/app/shared/map-core/src/components/controls/controls.map.ts`
- `core/src/app/shared/map-core/src/components/map/map.component.ts`
- `core/src/app/shared/map-core/src/directives/custom-tracks.draw.directive.ts`
- `core/src/app/shared/map-core/src/directives/draw-ugc-poi.directive.ts`
- `core/src/app/shared/map-core/src/directives/feature-collection.directive.ts`
- `core/src/app/shared/map-core/src/directives/hit-map.directive.ts`
- `core/src/app/shared/map-core/src/directives/layer.directive.ts`
- `core/src/app/shared/map-core/src/directives/pois.directive.ts`
- `core/src/app/shared/map-core/src/directives/position.directive.ts`
- `core/src/app/shared/map-core/src/utils/cacheFallback.ts`
- `core/src/app/shared/map-core/src/utils/httpRequest.ts`
- `core/src/app/shared/map-core/src/utils/localForage.ts`
- `core/src/app/shared/map-core/src/utils/ol.ts`
- `core/src/app/shared/map-core/src/utils/performance.ts`
- `core/src/app/shared/map-core/src/utils/styles.ts`

---
paths:
  - "src/directives/**"
  - "src/components/**"
---

# Trappole: direttive e componenti della mappa

Il perché sta in [docs/knowledge/listener-e-lifecycle.md](../../docs/knowledge/listener-e-lifecycle.md),
[docs/knowledge/cache-offline-carg.md](../../docs/knowledge/cache-offline-carg.md) e
[docs/knowledge/fit-view-e-padding.md](../../docs/knowledge/fit-view-e-padding.md).

- **Non importare `WmMapBaseDirective` dal barrel `@map-core/directives`.** `layer.directive.ts` la
  importa da `./base.directive` apposta: il barrel ri-esporta anche `custom-tracks.draw.directive.ts`
  → `graphhopper-js-api-client`, una build UMD non risolvibile sotto Karma (`ReferenceError:
  GraphHopperRouting is not defined`, indipendente da GPU/headless). Siccome l'`extends` è un uso
  reale a runtime e il bundler non può eliderlo, ogni test che carica quel file trascina il crash.
  **La CI non intercetterebbe la regressione**: quello spec non è in `configurations.ci.include`.
- **`map.un(type, listener)` crasha se il listener è `undefined`**: OpenLayers ne legge
  `listener.ol_key`. Proteggi ogni rimozione con una guardia sul riferimento, e crea il listener
  **una volta sola** — OpenLayers deduplica le registrazioni `on()` per riferimento, quindi tenere
  lo stesso riferimento è sicuro e non serve un contatore.
- **`map.changed()` non basta a ridisegnare i vector tile già caricati**: la cache di rendering
  resta e le tracce mantengono lo stile vecchio finché un pan o uno zoom non carica tile mai visti.
  Serve `layer.changed()` su ciascun layer.
- **`distinctUntilChanged()` è obbligatorio sulle pipeline innescate da un `@Input` setter** che il
  consumer ricostruisce da NgRx: il reducer crea nuovi riferimenti a ogni `loadConfSuccess` e l'app
  dispatcha `loadConf()` a ogni riconnessione di rete — senza, ogni reconnect rifà il fetch di tutte
  le risorse invariate.
- **Dopo un hop asincrono la mappa può non esserci più.** Nessuna direttiva qui ha
  `ngOnDestroy`/`takeUntil`, e `WmMapComponent.ngOnDestroy()` imposta `this.map = null`: ogni
  callback che dereferenzia `this.mapCmp.map` dopo una lettura da `localForage` deve controllare
  `!= null`.
- **`view.fit()` ignora in silenzio il padding della `View`.** Chi chiama `fit()` direttamente deve
  passare `padding: this.wmMapPadding ?? undefined`; gli helper `fitView()`/`fitViewFromLonLat()` lo
  fanno già, ma non sono sostituti drop-in — hanno side-effect su `wmMapDisableFitView` e sui query
  param.

> Ticket: oc:7989

# Notes — map-core: fix Karma/test config per CI headless

## Problema

I test Karma di map-core non erano eseguibili: il file `src/test.ts` usava `require.context()` (API webpack 4), non supportata da webpack 5 (Angular 20). Il runner terminava immediatamente con `__webpack_require__(...).context is not a function`.

## Fix applicati

### `angular.json` — entry point del test runner
- **Prima:** `"main": "src/test.ts"` (richiedeva `require.context`)
- **Dopo:** `"polyfills": ["zone.js", "zone.js/testing"]` (webpack 5 compatible, Angular scopre i spec dal tsconfig)
- Aggiunta configurazione `ci` con `include` esplicito ai soli spec utils (vedi limitazione CI sotto)

### `tsconfig.spec.json`
- Rimossa la voce `"files": ["src/test.ts"]` (non più necessaria)

### `src/directives/base.directive.spec.ts`
- Aggiunto `standalone: false` a `TestComponent`: in Angular 17+ i componenti senza dichiarazione esplicita defaultano a `standalone: true`, che non è compatibile con `declarations: []` nel modulo di test

### `src/karma.conf.js`
- Aggiunti flag Chrome headless per l'ambiente CI: `--disable-gpu-compositing`, `--disable-gl-drawing-for-tests`, `--use-gl=swiftshader`, `--ignore-gpu-blocklist`, `--disable-webgl`, `--disable-webgl2`, `--disable-software-rasterizer`

### `src/utils/styles.spec.ts`
- **`getLineStyle`**: aggiornati z-index attesi da 51/52 a 501/502 (la costante `TRACK_DIRECTIVE_ZINDEX` è stata cambiata da 50 a 500 ma i test non erano stati aggiornati)
- **`buildRefStyle`**: la firma della funzione è cambiata nel tempo (`Feature` → `LineString`, aggiunto parametro `opt.map` obbligatorio, ritorno cambiato da `Style` a `Style[]`). I test sono stati riscritti per riflettere la firma attuale, con un mock map che implementa `getSize()` e `getView().{getResolution, calculateExtent}`

## Limitazione CI — OL Map e Chrome headless

I directive/component spec (`base.directive.spec.ts`, `track.directive.spec.ts`, `pois.directive.spec.ts`, ecc.) creano un componente `WmMapComponent` reale nei `beforeEach`. Questo esegue `new OlMap({target: domElement})` che inizializza il canvas e il rendering loop di OpenLayers. In Chrome headless con `--disable-gpu`, questa operazione causa il crash del browser (disconnect del ping WebSocket dopo ~11 secondi).

**Soluzione adottata:** la configurazione `ci` in `angular.json` usa `include` per limitare il bundle ai soli 5 spec utils che non istanziano OL Map:
- `src/utils/styles.spec.ts` (16 test)
- `src/utils/popover.spec.ts` (4 test)
- `src/utils/httpRequest.spec.ts` (2 test)
- `src/utils/img.spec.ts` (3 test)
- `src/utils/performance.spec.ts` (2 test)

**Totale CI:** 27 test, 27 SUCCESS.

**Per i directive test localmente:** `nvm use 22 && npx ng test map-core` (senza `--configuration=ci`) apre Chrome con GPU e li esegue tutti.

## Follow-up

Per eseguire i directive/component spec in CI sarà necessario un mock globale di `OlMap` che sostituisca l'implementazione reale durante i test. Questo è un task separato.

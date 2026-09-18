# Inquadratura della mappa: `fit()` e `wmMapPadding`

## Come funziona oggi

`WmMapGeojsonDirective._buildGeojson()` passa `padding: this.wmMapPadding ?? undefined` alla chiamata `view.fit()` (`geojson.directive.ts:83`), quindi `wmMapPadding` viene rispettato anche quando la mappa si inquadra su un layer GeoJSON.

## Perché così

- **`fit()` ignora silenziosamente il padding della `View`** (oc:4783): la direttiva chiamava `getView().fit(extent, {…})` direttamente su OpenLayers invece di passare per `fitView()`/`fitViewFromLonLat()` di `WmMapBaseDirective`, che il padding lo applicano. Senza `padding` esplicito OpenLayers ricade sul default `[0,0,0,0]`: nessun errore, il valore configurato semplicemente non ha effetto.
- **La race ipotizzata non esiste** (oc:4783): si temeva che `_handleWmMapPaddingChange`, che rifitta la view sul bbox di config a ogni cambio di `wmMapPadding`, competesse col fit del geojson, perché un array literal nel template cambierebbe reference a ogni change detection. Verificato che il compilatore Ivy fa hoisting delle costanti letterali, quindi `[20, 20, 20, 20]` non cambia reference per la stessa istanza; confermato poi empiricamente dal developer riproducendo a mano.

## Debito noto

- **Il test non è mai stato eseguito**: `geojson.directive.spec.ts` è scritto ma il requisito nel cantiere è ancora **non spuntato**. Va lanciato in locale con `nvm use 22 && npx ng test map-core --include='**/geojson.directive.spec.ts'`.
- **Il padding è gestito in quattro punti** (oc:4783): `base.directive.ts` (due volte), `map.component.ts` e `geojson.directive.ts`. `this.wmMapPadding ?? undefined` andrebbe estratto in un getter condiviso (`resolvedPadding`). Attenzione nel futuro refactor: `fitView()` **non** è un sostituto drop-in di `fit()`, ha side-effect su `wmMapDisableFitView` e sui query param.
- **Altri quattro directive hanno lo stesso problema** — `feature-collection.directive.ts`, `pois.directive.ts`, `ugc-pois.directive.ts`, `hit-map.directive.ts` — fuori scope per decisione esplicita.
- **`wmMapGeojsonFit = true` con un `wmMapPadding` grande non ha guardia**: con `fit === true` viene passata una `size` fittizia `[50,50]`, e un padding ≥ 25px renderebbe l'area utile nulla o negativa, con rischio di `NaN`. Nessun consumer attuale combina i due.

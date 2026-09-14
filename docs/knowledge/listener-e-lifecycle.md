# Listener OpenLayers, ciclo di vita dei layer e invalidazione del rendering

## Come funziona oggi

Il listener `moveend` di `WmMapLayerDirective` si crea **una volta sola** e non si ricrea mai: la closure chiude su un campo stabile (`_moveEndSubject$`), e ogni `map.un('moveend', …)` è protetto da una guardia sul riferimento.

`_updateMap()` (`map.component.ts`) chiama `layer.changed()` su tutti i layer prima di renderizzare, non solo `map.changed()`.

`styleFn` (`src/utils/styles.ts`) nasconde le tracce dei layer esclusi dai filtri Home solo se `this.currentLayer == null`.

## Perché così

- **`map.un()` con listener `undefined` lancia il crash `ol_key`** (oc:8399), verificato nel sorgente di OpenLayers (`Observable.js`, `unInternal`): quel metodo legge `listener.ol_key`. `_moveEndListener` veniva assegnato solo dentro il setter di `wmMapLayerEnableFeaturesInViewport` quando `enable === true`, quindi per la maggioranza dei layer restava `undefined`.
- **Creare il listener una volta, invece di rimuoverlo e riassegnarlo** (oc:8399): remove-then-reassign era stato pianificato e scartato, perché dopo una seconda riattivazione il listener rimosso non veniva più ri-registrato finché l'utente non cambiava zoom. Tenere lo stesso riferimento è sicuro perché **OpenLayers deduplica le registrazioni `on()` per riferimento** (`Target.addEventListener`, verificato nel sorgente): non serve un contatore.
- **`map.changed()` non invalida la cache di rendering dei vector tile già caricati** (oc:8414): le tracce restavano congelate con lo stile precedente finché un pan o uno zoom non caricava tile mai visti — dando la falsa impressione che «zoomando funzioni».
- **A layer aperto i filtri della Home non sono più pertinenti** (oc:8414): senza la condizione su `currentLayer` nascondevano le tappe del layer che l'utente stava guardando. Il dettaglio del lavoro lato consumer sta in `wm-core/docs/features/8414-filtri-cammini-home/notes.md`.

## Debito noto

- **Cinque spec preesistenti sono rotti** dallo stesso problema del barrel (oc:8399): `pois.directive.spec.ts`, `track.directive.spec.ts`, `track.related-pois.directive.spec.ts`, `track.highlight.directive.spec.ts`, `custom-tracks.directive.spec.ts`. `map.component.spec.ts` è rotto per `NG0201: No provider found for ActivatedRoute`. Nessuno gira in CI, quindi non era mai emerso — e nessuno ha riverificato dopo quel ciclo se siano ancora rotti.
- **`enable = false` sul setter non è definitivo** (oc:8399): un cambio di zoom successivo può ri-registrare il listener. La finestra di rischio è ora permanente invece che transitoria.

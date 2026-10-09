> Ticket: oc:8743

# Notes — map-core

## Decisioni

- `track.record.directive.ts` riceve l'elenco completo dei punti tenuti, non più un punto alla
  volta: una stessa emissione può aggiungerne più di uno (i sospetti si decidono insieme al punto
  buono successivo) e alla ripresa o con la pulizia rifatta l'elenco cambia anche prima della coda.
- Primo commit: un solo `setCoordinates` per emissione, togliendo il buffer di 5 punti / 1 s.
  Rivisto su segnalazione del dev, perché il costo cresceva con la lunghezza della traccia: se il
  nuovo elenco contiene gli stessi oggetti di quello già disegnato (confronto per riferimento:
  wm-core allunga l'elenco con `concat`) si proiettano e si aggiungono solo i punti nuovi, con un
  solo `changed()`; altrimenti `setCoordinates` su tutto.
- I punti nuovi si aggiungono all'array di `getFlatCoordinates()` e non con `appendCoordinate`,
  che in OpenLayers 7 chiama `changed()` a ogni punto. Per lo stesso motivo il vecchio buffer non
  raggruppava i re-render: `appendCoordinate` notificava comunque punto per punto.
- Spec nuovo `track.record.directive.spec.ts`. map-core non ha `node_modules` in questa copia:
  i casi sono stati eseguiti con la suite Karma di wm-core (import `@map-core/…`), tutti verdi.

## Bug trovati

- wm-core legava `WmMapTrackRecordInitLocations`, un input che la direttiva non aveva: dopo la
  ripresa di una registrazione la linea ripartiva vuota. Il nuovo input con l'elenco completo
  copre anche la ripresa.

## Follow-up

- Nella webapp map-core e wm-core vanno aggiornati insieme: l'input `WmMapTrackRecordLocation` non
  esiste più.

Le note complete del lavoro stanno in wm-core, cantiere con lo stesso slug.

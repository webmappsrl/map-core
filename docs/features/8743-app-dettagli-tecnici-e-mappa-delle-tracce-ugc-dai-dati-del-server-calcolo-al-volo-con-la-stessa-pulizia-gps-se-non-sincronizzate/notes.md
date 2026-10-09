> Ticket: oc:8743

# Notes — map-core

## Decisioni

- `track.record.directive.ts` ridisegna la linea con un solo `setCoordinates` sull'elenco ricevuto
  a ogni emissione, senza il buffer di 5 punti / 1 s: l'elenco può perdere o aggiungere più punti
  insieme (un sospetto si decide insieme al punto buono successivo), quindi un'aggiunta
  incrementale non basterebbe. Il costo è lineare nella lunghezza della traccia per emissione.

## Bug trovati

- wm-core legava `WmMapTrackRecordInitLocations`, un input che la direttiva non aveva: dopo la
  ripresa di una registrazione la linea ripartiva vuota. Il nuovo input con l'elenco completo
  copre anche la ripresa.

## Follow-up

- Nella webapp map-core e wm-core vanno aggiornati insieme: l'input `WmMapTrackRecordLocation` non
  esiste più.

Le note complete del lavoro stanno in wm-core, cantiere con lo stesso slug.

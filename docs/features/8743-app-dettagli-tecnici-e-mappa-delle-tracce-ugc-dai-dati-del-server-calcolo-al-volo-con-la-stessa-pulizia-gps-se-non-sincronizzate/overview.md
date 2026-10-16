> Ticket: oc:8743

# App: dettagli tecnici e mappa delle tracce UGC dai dati del server, calcolo al volo con la stessa pulizia GPS se non sincronizzate

## Cosa cambia

Durante la registrazione, la direttiva `track.record.directive.ts` disegna la linea della traccia
in corso. Oggi aggiunge alla linea ogni posizione GPS che riceve (scarta solo i duplicati), quindi
anche i punti disturbati che il server poi toglie.

Con questo ticket la direttiva **disegna solo i punti già decisi**, che riceve da wm-core: la
pulizia GPS (regola di oc:8719/oc:8742) sta in wm-core, perché map-core non può importarlo. La
direttiva non decide nulla: riceve l'elenco dei punti tenuti e lo disegna. Il pallino della
posizione corrente (`position.directive.ts`) non cambia e resta quello GPS grezzo.

Il quadro completo, la regola e i requisiti stanno nell'overview di wm-core, cantiere con lo stesso
slug.

## Perché

L'utente non deve vedere durante la registrazione una linea che non ritroverà dopo il salvataggio:
la geometria salvata contiene solo i punti tenuti, e la linea live deve coincidere con quella.

## Requisiti

- [ ] La direttiva riceve l'elenco completo dei punti tenuti (non un punto alla volta) e ridisegna
      la linea quando l'elenco cambia: wm-core può decidere più punti nella stessa emissione.
- [ ] La linea live mostra esattamente i punti tenuti ricevuti da wm-core, nell'ordine ricevuto.
- [ ] Un punto in attesa di decisione non compare; se poi viene tenuto compare, se viene scartato non
      compare mai.
- [ ] La ripresa di una registrazione dopo un crash disegna i punti tenuti già raccolti. Oggi wm-core
      lega `WmMapTrackRecordInitLocations`, un input che la direttiva montata non ha: dopo la
      ripresa la linea parte vuota.
- [ ] Nessun import di wm-core in map-core.
- [ ] La linea delle tracce UGC salvate (`ugc-tracks.directive.ts`) continua a usare
      `feature.geometry` così com'è: dopo il salvataggio è già pulita.

## Rischi

- Cambio del contratto degli input della direttiva (`WmMapTrackRecord*`): l'unico chiamante è
  `geobox-map.component.html` di wm-core, da aggiornare insieme.


## Out of scope

- Avviso di segnale GPS scarso.
- Modifiche al pallino o al cerchio di accuratezza della posizione.

## Moduli toccati

- `src/directives/track.record.directive.ts`

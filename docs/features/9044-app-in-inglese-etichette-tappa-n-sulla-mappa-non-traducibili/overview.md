> Ticket: oc:9044 (doppione oc:9048)

# App in inglese: «Tappa N» sulla mappa non tradotto — parte map-core

## Cosa cambia

`WmMapLayerDirective` riceve la callback di traduzione già passata a `<wm-map>`:
`@Input('wmMapTranslationCallback')`, lo stesso nome che usano `feature-collection`, `draw-ugc-poi`,
`custom-tracks.draw` e i controlli. Un binding raggiunge tutte le direttive dello stesso host che
dichiarano quel nome, quindi il consumer non deve aggiungere nulla. Il default è `value => value`.

`buildRefStyle` (`src/utils/styles.ts`) disegna nel `Text` della traccia `translationCallback(ref)`
al posto di `properties.ref` così com'è. Con `ref` nullo o vuoto, o con `ref_on_track_show` falso, il
testo resta vuoto come oggi e la callback non viene chiamata.

Nessun input nuovo e nessun cambio al ridisegno: quando la lingua cambia, il consumer usa
`wmMapLayerRefresh`, che esiste già e chiama `_updateMap()`.

map-core non conosce le lingue e non importa nulla da wm-core.

## Perché

Con l'app in inglese il testo sulla traccia resta «Tappa 5», «Tappa 6»: `buildRefStyle` disegna
`ref` così come arriva dai vector tile, senza passare da nessuna traduzione (oc:9044 e il doppione
oc:9048, Cammino Minerario di Santa Barbara, layer 56).

Allo scrum del 25/11/2026 10:38 si è deciso di non rendere `ref` traducibile adesso: si traducono le
stringhe intere («Tappa 1» → «Stage 1», …) con lo stesso dizionario della pipe di traduzione, e
`ref` traducibile nel backend diventa un secondo passo.

Si riusa `wmMapTranslationCallback` invece di un input nuovo (challenge del 25/11/2026): il canale
esiste già, `wm-geobox-map` lo passa già, e un secondo canale con un'altra semantica avrebbe fatto
ridisegnare le tracce a ogni `onLangChange`, anche quando la lingua non cambia.

## Requisiti

- [ ] `WmMapLayerDirective` dichiara `@Input('wmMapTranslationCallback')` con default
      `value => value`, senza setter che chiami `_updateMap()`: lo fa già `ngOnChanges`
- [ ] Il contesto passato alle funzioni di stile (`styleFnContext` in `_initializeDataLayers()`)
      espone la callback con un getter, come già fa per `conf` e `map`
- [ ] `buildRefStyle` disegna `translationCallback(ref)` quando `ref` è una stringa non vuota e
      `ref_on_track_show` è vero; altrimenti il testo resta vuoto come oggi, senza chiamare la callback
- [ ] La callback si chiama una volta per traccia in ogni `buildRefStyle`, non per ogni punto in cui
      il testo viene ripetuto
- [ ] Test in `src/utils/styles.spec.ts` (nell'`include` della CI): testo tradotto con la callback,
      testo invariato senza callback, nessuna chiamata con `ref` nullo o vuoto, una chiamata per traccia
- [ ] Nessun import da wm-core

## Rischi

- **Altri consumer.** Ogni app con `ref_on_track_show` che passa `wmMapTranslationCallback` ora fa
  passare `ref` dal proprio dizionario: un `ref` uguale a una chiave dell'interfaccia verrebbe
  tradotto. Richiede una coincidenza esatta di stringa; senza callback il default lascia `ref` com'è.
- **Costo della callback.** `buildRefStyle` gira a ogni render delle tracce visibili dallo zoom
  `ref_on_track_min_zoom` in su: una chiamata per traccia, che è una lettura del dizionario.
- **Test della direttiva fuori dalla CI.** `layer.directive.spec.ts` non è nell'`include` della CI: la
  parte della direttiva si verifica a mano nella webapp locale (passi nel piano).

## Out of scope

- `ref` traducibile nel backend: secondo passo, deciso allo scrum del 25/11/2026.
- `styleJsonFn` (`'text-field': '{ref}'`): non usata dall'app per le tracce.
- Il widget `wm-layer-map` di wm-elements: senza callback mostra `ref` come oggi.

## Moduli toccati

| Repo | File |
|---|---|
| map-core | `src/directives/layer.directive.ts` |
| map-core | `src/utils/styles.ts` (`buildRefStyle`) |
| map-core | `src/utils/styles.spec.ts` |

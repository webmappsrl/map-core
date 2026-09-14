# Grafico altimetrico: il riflesso sulla mappa

## Come funziona oggi

Quando `trackElevationChartElements` diventa `null`, `ngOnChanges` di `track.directive.ts` chiama esplicitamente `_drawTemporaryLocationFeature(undefined, undefined)` e resetta il popover di quota, invece di saltare l'intero blocco.

## Perché così

- **La pulizia c'era già, ma non veniva mai invocata** (oc:8177): `_drawTemporaryLocationFeature` gestiva correttamente gli argomenti `undefined` facendo `_elevationChartSource.clear()`, ma il blocco chiamante era condizionato da `trackElevationChartElements != null` — quindi proprio nel caso in cui serviva pulire non si entrava, e pallino e segmento di hover restavano disegnati sulla mappa.
- **La causa radice è nel grafico, non qui** (oc:8177): il tooltip di Chart.js resta bloccato attivo perché `options.events` non include `touchend`/`mouseout` — un difetto in `wm-core`, di cui questo era il sintomo sulla mappa. Il perché completo sta in `wm-core/docs/features/8177-distanza-rimanente-posizione-profilo-altimetrico/notes.md`.

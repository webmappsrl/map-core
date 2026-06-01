> Ticket: oc:7988

# EC POI: frontend legge show_image_on_map per rendering mappa traccia

## Cosa cambia
Il renderer dei related POI sulla mappa legge il campo `feature_image.show_image_on_map` restituito dall'API per decidere se mostrare la foto o l'icona categorica. In precedenza la scelta era automatica (immagine se presente, icona altrimenti); ora è pilotata esplicitamente dall'admin.

## Perché
Il backend (oc:7645) espone `show_image_on_map: true/false` nel JSON dei `related_pois` di ogni EcTrack. Il frontend deve recepire questa scelta invece di decidere autonomamente in base alla presenza della foto. Le app mobile legacy che non mandano il campo devono continuare a funzionare come prima.

## Requisiti
- [ ] Se `show_image_on_map === true` → usa l'immagine (comportamento attuale quando l'immagine è presente)
- [ ] Se `show_image_on_map === false` → usa l'icona categorica, anche se la foto esiste
- [ ] Se `show_image_on_map` è assente o null → fallback legacy: usa l'immagine se `sizes['108x137']` esiste, altrimenti l'icona (retrocompatibilità app mobile)
- [ ] Aggiungere `show_image_on_map?: boolean` al tipo `IWmImage` in `map-core/src/types/model.ts`
- [ ] Aggiornare i test in `track.related-pois.directive.spec.ts` per coprire tutti e 3 gli scenari

## Rischi
- **Retrocompatibilità:** le app mobile non mandano `show_image_on_map` — il fallback su `undefined` deve preservare il comportamento attuale senza regressioni.

## Out of scope
- Modifica alla logica di rendering dei POI generici (non related, `pois.directive.ts`)
- Modifica al backend o al campo `show_image_on_map` stesso
- Cambio del comportamento visivo dello stato "selected" (resta invariato — solo colori/opacità)

## Moduli toccati
- `src/app/shared/map-core/src/directives/track.related-pois.directive.ts` — logica `_createPoiMarker`
- `src/app/shared/map-core/src/types/model.ts` — tipo `IWmImage`
- `src/app/shared/map-core/src/directives/track.related-pois.directive.spec.ts` — test

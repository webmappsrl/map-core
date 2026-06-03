> Ticket: oc:7988

# Notes — EC POI: show_image_on_map

## Deviazioni dal piano
- I test scritti nel piano non sono stati eseguiti: la suite Karma dell'intero progetto wm-webapp non si avvia a causa di errori TS preesistenti in altri spec. Ticket di tracciamento: oc:7989.

## Bug trovati
- Nessuno nel codice modificato.

## Decisioni
- La logica a tre vie usa `showImageOnMap == null` (loose equality) per intercettare sia `undefined` che `null` nel caso legacy, mantenendo il fallback sull'esistenza di `sizes['108x137']`.
- `show_image_on_map` aggiunto a `IWmImage` in `map-core/src/types/model.ts` perché il campo arriva strutturalmente dentro `feature_image` nell'API — rispecchia fedelmente la forma del JSON.

## Follow-up
- oc:7989 — Fix configurazione Karma: risolvere gli errori preesistenti che impediscono l'esecuzione dei test.
- Tech debt: `sizes['108x137']` è hardcoded sia come guardia nel fallback legacy che come URL dell'immagine nel canvas — se il set di dimensioni cambia, entrambe le righe si rompono insieme. Da affrontare in un ticket separato.

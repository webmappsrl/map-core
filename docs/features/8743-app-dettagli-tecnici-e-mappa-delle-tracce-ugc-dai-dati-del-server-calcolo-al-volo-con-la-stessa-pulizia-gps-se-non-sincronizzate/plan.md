> Ticket: oc:8743

# Piano — parte di map-core

Il piano completo, con interfacce, test e ordine dei task, sta in wm-core:
`docs/features/8743-app-dettagli-tecnici-e-mappa-delle-tracce-ugc-dai-dati-del-server-calcolo-al-volo-con-la-stessa-pulizia-gps-se-non-sincronizzate/plan.md`. Qui solo i task che toccano questo repo.

- **Task 6** — `src/directives/track.record.directive.ts`: l'input `WmMapTrackRecordLocation` diventa `WmMapTrackRecordLocations: Location[] | null` (elenco completo dei punti tenuti, `setCoordinates` a ogni cambio, via buffer e timeout). Commit: `feat(oc:8743): la linea di registrazione disegna l'elenco dei punti ricevuti`.

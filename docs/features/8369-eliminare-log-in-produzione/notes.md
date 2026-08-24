> Ticket: oc:8369

# Notes — Eliminare log in produzione (map-core)

## Deviazioni dal piano

Nessuna deviazione — tutte le modifiche seguono esattamente le tabelle di classificazione di `plan.md`, verificate riga per riga dopo l'esecuzione (31/31 test Karma CI passati).

## Bug trovati

Nessuno introdotto. Trovato durante l'analisi (non un bug, correzione di una premessa errata dell'overview iniziale): `utils/performance.ts` è codice morto (nessuna chiamata attiva a `startTime`/`endTime`, solo riferimenti commentati in `ol.ts`/`httpRequest.ts`), ma ha comunque un test (`performance.spec.ts`) che lo spia — escluso dal triage per non rompere il test, anche se l'impatto pratico è nullo.

## Decisioni

- Questo submodule non era taggato nel ticket originale (`oc:8369` tagga solo `webmapp-app`/`wm-core`) — incluso esplicitamente su richiesta del developer per applicare la policy a tutti i submodule in un solo ciclo.
- `utils/localForage.ts:417` (`updateStatus()`) commentato (non cancellato) come per l'omonima funzione in wm-core — unico segnale diagnostico per il download offline tile/hitmap, area fragile documentata (CLAUDE.md oc:8219).
- `utils/httpRequest.ts:108,123` (`console.log(e)`) verificati riga per riga: entrambi dentro un `catch`, lasciati intatti per regola 1, nonostante il metodo `log`.

## Follow-up

- Nessuno specifico a questo submodule oltre a quanto già segnalato negli overview/notes degli altri 2 repo.

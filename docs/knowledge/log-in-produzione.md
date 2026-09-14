# Log in produzione

## Come funziona oggi

I `console.*` sono passati da un triage manuale: il rumore cancellato, i log diagnostici commentati con `// DEBUG:`, `console.error`/`console.warn` sempre intatti. La regola è più larga del solo `error`/`warn`: **qualunque metodo dentro un `catch` resta visibile** — è il criterio con cui i due `console.log(e)` di `utils/httpRequest.ts` sono stati lasciati dov'erano, dopo aver letto il contesto riga per riga.

## Perché così

- **`utils/localForage.ts` (`updateStatus()`) è commentato, non cancellato** (oc:8369): è l'unico segnale diagnostico per il download offline di tile e hitmap, area già documentata come fragile. Stessa decisione presa per l'omonima funzione in `wm-core`.
- **`utils/performance.ts` è escluso dal triage** (oc:8369) pur essendo codice morto: `performance.spec.ts` lo spia con `spyOn(console, 'warn')`, quindi toccarlo romperebbe il test senza beneficio pratico.
- **Il ticket non taggava questo submodule** (oc:8369): è stato incluso su richiesta esplicita del developer.

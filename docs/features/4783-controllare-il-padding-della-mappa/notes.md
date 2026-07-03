> Ticket: oc:4783

# Notes — Controllare il padding della mappa

## Deviazioni dal piano

- **Step 1 (verifica empirica preliminare) non eseguito come da piano originale.** Il piano prevedeva un repro manuale in browser fatto da me; ho invece tentato prima un test Karma temporaneo (`_temp-padding-race.spec.ts`, poi rimosso) per verificare se `_handleWmMapPaddingChange` (`map.component.ts:332-339`) competesse col fit del geojson. Il test è fallito per un limite noto dell'ambiente sandbox: Chrome (sia headless che non, sia con che senza sandbox disabilitata) va in crash anche su un componente Angular banale senza `wm-map`/OpenLayers — non è quindi lo specifico problema GPU/OlMap già documentato in questo `CLAUDE.md` per i test directive/component, ma un limite più generale dell'ambiente di esecuzione di Claude Code per Chrome/Karma. Ho quindi verificato analiticamente (comportamento di hoisting delle costanti letterali nel compilatore Ivy di Angular, confermato via ricerca su PR ufficiali Angular) che un array literal come `[20, 20, 20, 20]` non cambia reference tra cicli di change detection per la stessa istanza di componente, quindi `_handleWmMapPaddingChange` non si attiva mai per questo binding statico (perché `_view` non esiste ancora al momento dell'unico `ngOnChanges` che riceve il valore). **La conferma definitiva è stata empirica dal developer**: ha riprodotto il bug a mano in `modal-ugc-uploader` e confermato che (a) prima del fix il padding non aveva alcun effetto e non c'era alcun salto/ricentraggio, (b) dopo il fix il padding funziona correttamente. Questo conferma sia la diagnosi originale sia l'assenza della race ipotizzata in Fase: challenge.
- **Test Karma (`geojson.directive.spec.ts`) scritto ma non eseguito da me.** Per lo stesso limite ambientale (Chrome/Karma non avviabile in questo sandbox), non ho potuto lanciare la suite. Il file è stato scritto seguendo lo stile di `base.directive.spec.ts` e copre: padding passato correttamente, padding `undefined` quando non impostato, `maxZoom`/`duration` invariati. **Da eseguire dal developer in locale** con `nvm use 22 && npx ng test map-core --include='**/geojson.directive.spec.ts'` prima del merge, per conferma definitiva.
- **Branch creato dopo la scrittura di `overview.md`/`plan.md`, come da ordine di fase previsto dal workflow** (non è una deviazione, ma lo noto per chiarezza: l'ordine "docs prima del branch" è quello del workflow stesso, non un'eccezione).
- **`superpowers:writing-plans` non disponibile in questo ambiente**: `plan.md` è stato scritto direttamente, seguendo la stessa struttura richiesta (step numerati, convenzione commit, nessun commit automatico).

## Bug trovati
Nessun bug aggiuntivo trovato durante l'implementazione, oltre a quello oggetto del ticket.

## Decisioni

- **Scope esteso a `wm-core` durante l'esecuzione** (dopo l'approvazione dell'overview): il binding `[wmMapPadding]="[20, 20, 20, 20]"` su `modal-ugc-uploader.component.html`, inizialmente previsto solo come verifica temporanea da rimuovere, è stato reso **permanente** su richiesta esplicita del developer una volta confermato che il fix funziona — migliora la leggibilità della traccia caricata nel flusso di upload UGC. `overview.md` è stato aggiornato di conseguenza (Requisiti, Out of scope, Moduli toccati). Vedi anche `wm-core/docs/features/4783-controllare-il-padding-della-mappa/overview.md`.
- Confermato (decisione utente, Fase: challenge) di **non** estendere il fix agli altri directive con lo stesso pattern (`feature-collection`, `pois`, `ugc-pois`, `hit-map`) né di gestire `wmMapDisableFitView` dentro `geojson.directive.ts` — entrambi restano fuori scope.
- Confermato (decisione utente, Fase: challenge) di **non** aggiungere una guardia per l'interazione `wmMapGeojsonFit=true` + `wmMapPadding` grande (rischio di area utile nulla/negativa passata a OL `fit()`) — nessun consumer attuale combina i due.

## Review formale (wm-review-ticket, pre-commit)

Eseguita review con 5 finder paralleli su diff non ancora committato (nessuna PR esistente al momento della review). Verdetto: **APPROVATO CON RISERVE**, nessun blocker.

- Confermato indipendentemente (anche rileggendo `ol/View.js:1400-1401`) che il fix risolve esattamente lo scenario del ticket, nessuna regressione per `modal-success` (altro consumer di `wmMapGeojson`).
- Rilevato da 3 finder su 5: `await directive.mapCmp.isInit$` nel test era un no-op (`isInit$` è un `BehaviorSubject`, non una Promise) — pattern copiato da `pois.directive.spec.ts` esistente nel repo, non un errore nuovo, ma comunque corretto: rimosso. Migliorate anche le asserzioni sostituendo i controlli per-campo con `toHaveBeenCalledWith(extent, {...opzioni complete...})`, coerente con lo stile di `base.directive.spec.ts` e più robusto a regressioni sui campi `maxZoom`/`duration`/`size`.
- Follow-up aggiuntivi emersi dalla review (non applicati in questo ticket, vedi sezione sotto): estrarre `this.wmMapPadding ?? undefined` in un getter condiviso su `WmMapBaseDirective` invece di triplicarlo; nota di attenzione per il futuro refactor di consolidamento (`fitView()` non è un drop-in sostituto di una chiamata diretta a `fit()`, ha side-effect su `wmMapDisableFitView` e query params).
- **Resta da fare dal developer prima del merge**: eseguire realmente `geojson.directive.spec.ts` in locale (`nvm use 22 && npx ng test map-core --include='**/geojson.directive.spec.ts'`) — né io né il finder della review siamo riusciti a farlo girare in sandbox (stesso limite Chrome/GPU già documentato).

## Follow-up
- Estrarre `this.wmMapPadding ?? undefined` (ora triplicato tra `base.directive.ts` ×2 e `geojson.directive.ts`) in un getter condiviso su `WmMapBaseDirective`, es. `protected get resolvedPadding(): number[] | undefined`.
- Ticket separato per consolidare i quattro punti di `fit()` in `map-core` (`base.directive.ts`, `map.component.ts`, `geojson.directive.ts`, e gli altri directive con padding hardcoded) su un'unica implementazione condivisa.
- Ticket separato per estendere il rispetto di `wmMapPadding` agli altri directive (`feature-collection.directive.ts:152`, `pois.directive.ts:152`, `ugc-pois.directive.ts:135`, `hit-map.directive.ts:133`).
- Valutare una guardia contro `wmMapGeojsonFit=true` + `wmMapPadding` con valori grandi (rischio area utile nulla/negativa in OL `fit()`), se in futuro un consumer combina i due.

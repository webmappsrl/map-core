> Ticket: oc:8399

# Fix crash "Cannot read properties of undefined (reading 'ol_key')" in WmMapLayerDirective

## Cosa cambia
`_removeMoveEndListenerIfExists()` in `src/directives/layer.directive.ts` viene guardato con un controllo di esistenza (`if (this._moveEndListener)`) prima di chiamare `this.mapCmp.map.un('moveend', this._moveEndListener)`. In più, il setter di `wmMapLayerEnableFeaturesInViewport` (righe 162-179) viene corretto per evitare di accumulare subscription/listener orfani a ogni sua ri-esecuzione (vedi "Rischi" per il dettaglio del leak). Nessun altro comportamento della directive cambia.

## Perché
`_moveEndListener` (dichiarato a riga 70 come tipo, senza inizializzatore) viene assegnato **solo** dentro il setter dell'`@Input() wmMapLayerEnableFeaturesInViewport` quando `enable === true` (riga 173). Se il layer non abilita mai questa feature — condizione maggioritaria nell'app secondo verifica dell'utente — `_moveEndListener` resta `undefined`.

`_initLayer()` chiama comunque incondizionatamente `_initResolutionChangeListener()` + `_onResolutionChange()` all'inizializzazione del layer (righe 367-369), indipendentemente da `wmMapLayerEnableFeaturesInViewport`. Se lo zoom iniziale è fuori dal range `[minZoom, maxZoom]` (o la feature è disabilitata), `_enableFeaturesInViewportCallback()` chiama `_removeMoveEndListenerIfExists(false)`, che tenta `map.un('moveend', undefined)`.

**Precisazione emersa in Fase: challenge — due path distinti verso lo stesso bug:**
- Il call site di `_enableFeaturesInViewportCallback` (righe 472-488) è **già** avvolto in `try { ... } catch (e) { console.warn(e); }` — lo screenshot dell'errore riportato dall'utente è quindi un **warning catturato e loggato** (triangolo giallo in console, con stack trace preservato dal catch), non un'eccezione realmente non gestita.
- Esiste un secondo call site **non protetto**: riga 176, nell'`else` del setter di `wmMapLayerEnableFeaturesInViewport` (quando l'input passa esplicitamente a `false`), dentro una subscription RxJS senza error handler — lì lo stesso bug produce una vera eccezione non gestita.
- Il fix (guardia in `_removeMoveEndListenerIfExists`) copre **entrambi** i call site, perché condividono lo stesso metodo privato.

Verificato dall'utente: il warning **non si presenta** quando `wmMapLayerEnableFeaturesInViewport` è abilitato (su `localhost:4200/map`), si presenta quando è disabilitato — coerente con la root cause sopra.

## Requisiti
- [ ] `_removeMoveEndListenerIfExists()` non chiama `map.un(...)` se `this._moveEndListener` è `undefined`
- [ ] Nessuna regressione sul path esistente (feature abilitata): il listener continua a essere rimosso correttamente quando era stato registrato
- [ ] Il setter di `wmMapLayerEnableFeaturesInViewport` non accumula subscription/listener orfani se rieseguito più volte con `enable=true` (es. a seguito di re-render NgRx con nuovo riferimento oggetto ma stesso valore logico): la subscription a `_moveEndSubject$` e il listener `map.on('moveend', ...)` precedenti vanno smontati/sostituiti, non semplicemente abbandonati
- [ ] Nuovo test Karma (`layer.directive.spec.ts`, primo file di test per questa directive) copre almeno:
  - path "feature disabilitata (mai abilitata) → cambio zoom iniziale → nessun errore lanciato"
  - path "feature abilitata poi disabilitata esplicitamente (`enable=false`) → nessuna eccezione non gestita" (il call site non protetto da try/catch, riga 176)
  - path "setter rieseguito più volte con `enable=true` → nessun listener/subscription orfano accumulato"
- [ ] Verifica manuale pre/post-fix su `localhost:4200/map` (branch `RDO_ass_cammini_italia_2026_2`) con la feature disabilitata: nessun warning in console
- [ ] Fix applicato sia sul branch standard di `map-core` (`develop`, per la propagazione a tutti gli shard) sia sul branch `RDO_ass_cammini_italia_2026_2` dell'app principale (aggiornamento puntatore submodule)

## Rischi
- [ ] Nessun rischio di regressione sugli altri `map.un(...)` del submodule: verificati `draw-ugc-poi.directive.ts` e `tiles-download.directive.ts` (3 occorrenze) — in tutti i casi il listener è una property class con arrow function assegnata alla dichiarazione (sempre definita), pattern diverso e non vulnerabile allo stesso bug. Nessun audit/fix aggiuntivo necessario.
- [ ] Necessità di sincronizzare il fix su due branch (develop + RDO cliente): rischio di disallineamento se il puntatore submodule viene aggiornato su un branch e dimenticato sull'altro — mitigato trattandolo come due step espliciti nel piano. Il rollback non è atomico: richiede due revert coordinati a mano su due repository indipendenti, nessuna procedura di rollback dedicata viene documentata oltre a questa nota.
- [ ] **[Emerso in Challenge, incluso nello scope]** Listener/subscription leak: prima del fix, ogni ri-esecuzione del setter `wmMapLayerEnableFeaturesInViewport` con `enable=true` aggiunge una nuova subscription a `_moveEndSubject$` mai smontata e orfanizza il riferimento al precedente `map.on('moveend', oldFn)`, che resta agganciato alla mappa per sempre. Su sessioni lunghe (traccia GPS con riconnessioni intermittenti, per note oc:8219 su `loadConf()` ridispatchato a ogni reconnect) questo accumula listener attivi → degrado di performance/batteria silenzioso, senza alcun errore in console. Affrontato in questo ticket (vedi Requisiti).
- [ ] **[Emerso in Challenge, fuori scope — vedi sotto]** Fallimento silenzioso di `map.on('moveend', undefined)` se `wmMapLayerShowFeaturesInViewport` diventa `true` prima che `wmMapLayerEnableFeaturesInViewport` abbia assegnato `_moveEndListener` (due `@Input` alimentati da selettori NgRx indipendenti in `wm-core`, nessuna garanzia d'ordine). OpenLayers rende questa chiamata un no-op silenzioso (`ol/events/Target.js`, guardia `if (!type || !listener) return;`): la feature "features in viewport" resterebbe permanentemente inerte senza errore. Causa radice fuori da `map-core` (ordinamento di due stream NgRx in `wm-core`) — un fix locale mitigherebbe solo il sintomo.
- [ ] Il nuovo test Karma quasi certamente non entra in CI: `angular.json` → `configurations.ci.include` limita l'esecuzione headless ai soli spec "utils" (limite GPU noto, già documentato nel CLAUDE.md di questo submodule) — `layer.directive.spec.ts` monta una vera `OlMap`, quindi la sua esecuzione resta affidata alla disciplina di chi lancia i test in locale (`nvm use 22 && npx ng test map-core`). Limitazione preesistente, non introdotta da questo ticket.

## Out of scope
- Migrazione del warning di deprecazione Sass (`@import` → `@use`, 17+ file `.scss` nel repo principale) — debito tecnico trasversale, non correlato a questo bug. Da trattare in un ticket Task separato se il developer lo richiede.
- Fallimento silenzioso di `map.on()` per disordine tra `wmMapLayerEnableFeaturesInViewport` e `wmMapLayerShowFeaturesInViewport` (vedi Rischi) — root cause in `wm-core`, non in questo submodule.
- Nessuna modifica al repo principale `core/` oltre all'aggiornamento del puntatore submodule su entrambi i branch.

## Moduli toccati
- `map-core/src/directives/layer.directive.ts` (fix guardia `_removeMoveEndListenerIfExists` + fix leak subscription/listener nel setter `wmMapLayerEnableFeaturesInViewport`)
- `map-core/src/directives/layer.directive.spec.ts` (nuovo, test Karma)
- Puntatore submodule `map-core` in `core/` — branch `develop` e branch `RDO_ass_cammini_italia_2026_2`

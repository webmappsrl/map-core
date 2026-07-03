> Ticket: oc:4783

# Controllare il padding della mappa

## Cosa cambia
`WmMapGeojsonDirective._buildGeojson()` (`src/directives/geojson.directive.ts:80-84`) chiamerà `view.fit()` passando `padding: this.wmMapPadding ?? undefined`, così l'input `wmMapPadding` viene rispettato anche quando la mappa viene inquadrata (fit) su un layer GeoJSON — comportamento oggi assente perché la chiamata a `fit()` non passa alcun `padding` e OpenLayers ricade sul default `[0,0,0,0]`, ignorando silenziosamente il valore configurato sulla `View`.

## Perché
Bug trovato durante un test interno (nessuna segnalazione utente diretta): usando `<wm-map [wmMapOnly]="true" [wmMapPadding]="[20,20,20,20]" [wmMapGeojson]="...">`, il padding non ha alcun effetto visibile sulla mappa. La causa è che `geojson.directive.ts` chiama `this.mapCmp.map.getView().fit(extent, {...})` direttamente su OpenLayers invece di passare per gli helper `fitView()`/`fitViewFromLonLat()` di `WmMapBaseDirective` (`base.directive.ts:56-92`), che applicano correttamente `wmMapPadding` come default.

## Requisiti
- [x] **Verifica empirica preliminare**: eseguita dal developer manualmente in `modal-ugc-uploader` (non tramite repro automatizzato — vedi `notes.md` per i dettagli e il limite ambientale che ha impedito il test Karma/browser diretto). Esito: nessun salto verso il bbox di config, confermando l'assenza della race ipotizzata in Fase: challenge
- [x] `geojson.directive.ts:80-85` passa `padding: this.wmMapPadding ?? undefined` nella chiamata `view.fit()` dentro `_buildGeojson()`
- [x] Comportamento invariato per i chiamanti esistenti che non bindano `wmMapPadding` (`modal-success` in repo principale) — nessuna regressione visiva senza il binding
- [x] `wmMapDisableFitView` resta non gestito da questo directive, invariato rispetto ad oggi (fuori scope)
- [ ] Test Karma locale per `geojson.directive.ts` (`geojson.directive.spec.ts`) — **scritto ma non eseguito** (limite ambientale, vedi `notes.md`); il developer deve lanciarlo in locale prima del merge con `nvm use 22 && npx ng test map-core --include='**/geojson.directive.spec.ts'`
- [x] Verifica visiva manuale: binding `[wmMapPadding]="[20, 20, 20, 20]"` su `modal-ugc-uploader.component.html` in locale (`ng serve`), confermato dal developer che il padding ha effetto
- [x] ~~Rimozione del binding prima del commit~~ — **decisione aggiornata**: il binding resta permanente in `modal-ugc-uploader.component.html` (repo `wm-core`), non solo per la verifica. Migliora la leggibilità della traccia caricata rispetto ai bordi della mappa di anteprima nel flusso di upload UGC (vedi Moduli toccati)

## Rischi
- **Competizione tra fit del geojson e fit del bbox di config (rischio critico, da verificare empiricamente prima del fix)**: `_handleWmMapPaddingChange` (`map.component.ts:332-339`) rifitta `_view` su `_centerExtent` (bbox di config) ogni volta che `wmMapPadding` cambia — e un array literal nel template (come nel repro del ticket) cambia reference ad ogni change detection, quindi questo fit può ripetersi e sovrascrivere il fit sul geojson fatto da `geojson.directive.ts`. Mitigazione: verifica empirica come primo requisito, prima di considerare sufficiente il fix minimo.
- **Test Karma non eseguibile in CI**: i test che istanziano una vera `OlMap` (come necessario per `geojson.directive.spec.ts`) crashano Chrome headless in CI (nota già presente in `map-core/CLAUDE.md`) — il test gira solo in locale con `nvm use 22 && npx ng test map-core`. Mitigazione: il test resta come regressione locale/documentazione, non blocca la pipeline (già lo stato attuale per i test directive/component in questo submodule).
- **Pattern ricorrente non risolto**: altri directive (`feature-collection.directive.ts:152`, `pois.directive.ts:152`, `ugc-pois.directive.ts:135`, `hit-map.directive.ts:133`) hanno lo stesso problema strutturale (chiamano `fit()` direttamente ignorando o hardcodando il padding) — esplicitamente fuori scope per questo ticket (decisione utente), da tracciare come follow-up.
- **Quarto punto di `fit()` duplicato**: il fix aggiunge logica di padding in un quarto punto (`geojson.directive.ts`) invece di consolidare su `fitView()`/`fitViewFromLonLat()` — accettato come scope minimo (decisione utente), da considerare in un futuro refactor di consolidamento.
- **Interazione `wmMapGeojsonFit=true` + `wmMapPadding` grande**: quando `this.fit === true`, `_buildGeojson()` passa `size: [50,50]` (fittizia) a `fit()`; un padding ≥25px su un asse renderebbe l'area utile nulla o negativa, rischiando `NaN`/risoluzione assurda in OpenLayers. Nessun consumer attuale combina i due; accettato come rischio noto senza guardia difensiva (decisione utente) — da tracciare come follow-up.
- **Rollback su submodule**: il fix vive in `map-core`, consumato via git submodule pin da `webmapp-app` — un rollback richiede revert nel submodule + bump del pointer nel repo padre; altre istanze con pin diverso non vedrebbero il rollback fino al loro prossimo bump. Nessun feature flag (ritenuto overkill per una one-liner di bugfix) — accettato (decisione utente).
- **Verifica manuale con binding temporaneo**: richiede attenzione a rimuovere il binding di test da `modal-ugc-uploader.component.html` prima del commit per non introdurre un cambiamento di comportamento non richiesto in quel componente.

## Out of scope
- Fix agli altri directive con lo stesso pattern (`feature-collection`, `pois`, `ugc-pois`, `hit-map`)
- Gestione di `wmMapDisableFitView` dentro `geojson.directive.ts`
- Binding di `wmMapPadding` su `modal-success` (repo principale) — non richiesto, resta senza padding

## Moduli toccati
- `core/src/app/shared/map-core/src/directives/geojson.directive.ts` (fix, repo `map-core`)
- `core/src/app/shared/map-core/src/directives/geojson.directive.spec.ts` (nuovo test locale, repo `map-core`)
- `core/src/app/shared/wm-core/projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.html` (binding permanente `wmMapPadding`, repo `wm-core`)

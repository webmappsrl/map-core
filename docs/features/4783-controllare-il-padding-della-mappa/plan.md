> Ticket: oc:4783

# Piano — Controllare il padding della mappa

Repo: `map-core` (submodule di `webmapp-app`, path `core/src/app/shared/map-core`).

## Step 1 — Verifica empirica preliminare (manuale, nessun codice)

Riprodurre in locale il bug esattamente come descritto nel ticket, prima di modificare qualsiasi file.

1. `cd core && npm start` (o l'entry point di sviluppo di `map-core` se testato in isolamento — verificare quale `ng serve` espone un componente che monta `ModalUgcUploaderComponent`, altrimenti creare una pagina/route di test temporanea che monta `<wm-map [wmMapOnly]="true" [wmMapPadding]="[20, 20, 20, 20]" [wmMapGeojson]="...">` con il geojson allegato al ticket).
2. Aprire la mappa e osservare, dopo il fit iniziale sul geojson, se la mappa "salta" verso un'altra inquadratura (bbox di config) nei fotogrammi successivi — sintomo della race con `_handleWmMapPaddingChange` (`map.component.ts:332-339`) identificata in Fase: challenge.
3. Documentare l'esito in `notes.md` (creato in Step 5).

**Decisione biforcazione:**
- **Se NON si osserva alcun salto** (la race non si manifesta con binding statico, es. perché `_view` non esiste ancora quando il primo `ngOnChanges` scatta, o perché Angular non ricrea l'array literal in questo contesto specifico) → procedere con Step 2 così pianificato.
- **Se si osserva il salto** → fermarsi e tornare dall'utente con l'evidenza prima di procedere: l'overview e il fix vanno rivisti (fuori dallo scope minimo concordato), non procedere autonomamente ad un fix più ampio.

## Step 2 — Fix in `geojson.directive.ts`

File: `core/src/app/shared/map-core/src/directives/geojson.directive.ts`

In `_buildGeojson()` (righe 76-87), modificare la chiamata a `fit()` per includere `padding`, seguendo lo stesso pattern già usato in `base.directive.ts:56-61` (`fitView`) e `base.directive.ts:77-92` (`fitViewFromLonLat`):

```ts
this.mapCmp.map.getView().fit(extent, {
  duration: 0,
  maxZoom: 17,
  padding: this.wmMapPadding ?? undefined,
  size: this.fit ? sizeFitted : size,
});
```

Nessun'altra modifica alla logica esistente (`_init`, `wmMapDisableFitView`, gestione di `this.fit`/`sizeFitted` restano invariati, come da Out of scope in overview.md).

## Step 3 — Test Karma locale

File nuovo: `core/src/app/shared/map-core/src/directives/geojson.directive.spec.ts`

Modellare sulla struttura di `base.directive.spec.ts` (TestBed con componente host che monta `<wm-map wmMapGeojson [wmMapConf]="conf">`, injection della direttiva via `By.directive`).

Casi da coprire:
1. `_buildGeojson` chiama `view.fit()` con `padding: this.wmMapPadding` quando `wmMapPadding` è impostato (es. `[20, 20, 20, 20]`).
2. `_buildGeojson` chiama `view.fit()` con `padding: undefined` quando `wmMapPadding` non è impostato (nessuna regressione per i chiamanti esistenti che non bindano l'input).
3. (Regressione) `size` passato a `fit()` resta quello atteso (`sizeFitted` se `wmMapGeojsonFit=true`, altrimenti la size reale) — verifica che il fix non abbia alterato l'esistente.

Eseguire in locale con `nvm use 22 && npx ng test map-core` (non gira in CI, coerente con la nota in `map-core/CLAUDE.md`).

## Step 4 — Verifica visiva manuale

1. Aggiungere temporaneamente `[wmMapPadding]="[20, 20, 20, 20]"` a `core/src/app/shared/wm-core/projects/wm-core/src/modal-ugc-uploader/modal-ugc-uploader.component.html:25-29` (rispettando la convenzione di ordine attributi in `map-core/CLAUDE.md`: `wmMapPadding` va tra `wmMapConf` e `wmMapGeojson`, essendo generico e non specifico di una direttiva).
2. `ng serve`, aprire il flusso di upload traccia UGC, confermare visivamente che il padding ha ora effetto sull'inquadratura del geojson.
3. Rimuovere il binding temporaneo da `modal-ugc-uploader.component.html` — verificare con `git diff` che il file torni identico all'originale prima di procedere al commit.

## Step 5 — Notes e commit

1. Compilare `docs/features/4783-controllare-il-padding-della-mappa/notes.md` con l'esito dello Step 1 e ogni deviazione riscontrata.
2. Attendere approvazione esplicita del developer (review-gate del workflow) prima di qualsiasi commit.
3. Commit (eseguiti dal developer, non automaticamente):
   - `fix(oc:4783): apply wmMapPadding to geojson directive fit()`
   - `test(oc:4783): add karma test for geojson directive padding`

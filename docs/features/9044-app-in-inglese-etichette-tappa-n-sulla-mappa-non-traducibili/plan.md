> Ticket: oc:9044 (doppione oc:9048)

# «Tappa N» tradotto sulla mappa — piano map-core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `buildRefStyle` disegna il `ref` della traccia passato dalla callback di traduzione già presente su `<wm-map>`.

**Architecture:** `WmMapLayerDirective` dichiara `@Input('wmMapTranslationCallback')` (binding condiviso, già passato da `wm-geobox-map`) e lo espone nel contesto delle funzioni di stile; `buildRefStyle` lo applica a `ref`. Nessun input nuovo, nessun ridisegno nuovo.

**Tech Stack:** Angular 20, OpenLayers 7, Karma + Jasmine.

**Spec:** [overview.md](overview.md)

## Global Constraints

- map-core non importa nulla da wm-core.
- Identificatori in inglese; commenti e documentazione in italiano.
- Commit con scope `fix(oc:9044)`; i commit li fa Rubens dopo la review, non l'esecutore.
- Test in CI: da `src/app/shared/map-core/`, `nvm use 22 && CI=true npx ng test map-core --configuration=ci`.

## Review Focus

- `ref` nullo, `undefined` o stringa vuota: testo vuoto, callback mai chiamata (Task 1).
- Callback che restituisce la chiave stessa (traduzione assente): il testo è `ref` così com'è (Task 1).
- Traccia lunga con molti punti di ripetizione del testo: callback chiamata una volta sola (Task 1).
- `ref_on_track_show` falso: testo vuoto anche con callback (Task 1).
- Consumer che non passa la callback: il default `value => value` lascia tutto come oggi (Task 2, verifica manuale nel piano di wm-core).

---

### Task 1: `buildRefStyle` usa la callback

**Files:**
- Modify: `src/utils/styles.ts` (`buildRefStyle`, oggi riga 167; il testo a riga 217)
- Test: `src/utils/styles.spec.ts` (accanto ai test `buildRefStyle:` esistenti, riga 411)

**Interfaces:**
- Consumes: `this.translationCallback?: (value: any) => string` sul contesto `this` con cui `buildRefStyle` è chiamata (`buildRefStyle.bind(this)` in `styleFn`, riga 882).
- Produces: comportamento di `buildRefStyle` invariato nella firma.

- [ ] **Step 1: Scrivere i test che falliscono**, con lo stesso `mockMap`/`mockView` dei test esistenti:
  - `buildRefStyle: should translate ref with translationCallback` — contesto `{conf: {ref_on_track_show: true}, translationCallback: v => v === 'Tappa 1' ? 'Stage 1' : v}`, `ref: 'Tappa 1'` → ogni `Text` vale `'Stage 1'`.
  - `buildRefStyle: should keep ref when translationCallback is missing` — senza callback, `ref: 'Tappa 1'` → `'Tappa 1'`.
  - `buildRefStyle: should not call translationCallback for empty ref` — spy, `ref: ''` e poi `ref` assente → testo `''`, spy mai chiamata.
  - `buildRefStyle: should call translationCallback once per feature` — `LineString` lunga (come nel test esistente, almeno 2 stili generati) → `expect(styles.length).toBeGreaterThan(1)` e spy chiamata 1 volta.
  - `buildRefStyle: should return empty text when ref_on_track_show is false` — `conf.ref_on_track_show: false`, callback spy → testo `''`, spy mai chiamata.

- [ ] **Step 2: Lanciare i test e vederli fallire**
  Run: `nvm use 22 && CI=true npx ng test map-core --configuration=ci`
  Expected: FAIL sui test «translate» e «once per feature».

- [ ] **Step 3: Implementare in `buildRefStyle`**: calcolare il testo una volta, prima di `splitPoints.forEach`: se `this.conf.ref_on_track_show` è vero e `properties.ref` è una stringa non vuota, `text = this.translationCallback ? this.translationCallback(properties.ref) : properties.ref`; altrimenti `''`. Nel `forEach` usare `text`. Aggiornare il JSDoc di `buildRefStyle` (la callback opzionale nel contesto).

- [ ] **Step 4: Lanciare i test e vederli passare**
  Run: `nvm use 22 && CI=true npx ng test map-core --configuration=ci`
  Expected: PASS, compresi i test `buildRefStyle:` esistenti.

- [ ] **Step 5: Commit (lo fa Rubens)**
  `fix(oc:9044): buildRefStyle traduce il ref con la callback della mappa`

### Task 2: la direttiva passa la callback alle funzioni di stile

**Files:**
- Modify: `src/directives/layer.directive.ts` (input accanto agli altri, righe 87-198; getter in `styleFnContext` di `_initializeDataLayers()`, righe 340-366)

**Interfaces:**
- Consumes: il binding `[wmMapTranslationCallback]` già presente sul `<wm-map>` del consumer.
- Produces: `styleFnContext.translationCallback`, letto da `buildRefStyle` (Task 1).

- [ ] **Step 1: Aggiungere l'input** `@Input('wmMapTranslationCallback') translationCallback: (value: any) => string = value => value;` con JSDoc in italiano (stesso nome e default di `draw-ugc-poi.directive.ts:49`). Nessun setter: `ngOnChanges` chiama già `_updateMap()`.

- [ ] **Step 2: Aggiungere il getter** `get translationCallback() { return directiveRef.translationCallback; }` in `styleFnContext`.

- [ ] **Step 3: Compilare**
  Run: da `src/app/shared/map-core/`, `nvm use 22 && CI=true npx ng test map-core --configuration=ci`
  Expected: PASS (nessuna regressione; la direttiva non ha spec in CI).

- [ ] **Step 4: Verifica manuale** nella webapp locale (`localhost:4200`, camminiditalia locale): con le traduzioni del piano di wm-core inserite, in inglese la mappa del layer 56 mostra «Stage 1»; prima dell'inserimento mostra «Tappa 1» come oggi.

- [ ] **Step 5: Commit (lo fa Rubens)**
  `fix(oc:9044): la direttiva dei layer riceve wmMapTranslationCallback`

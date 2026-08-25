> Ticket: oc:8399

# Fix crash "Cannot read properties of undefined (reading 'ol_key')" in WmMapLayerDirective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare il crash/warning `TypeError: Cannot read properties of undefined (reading 'ol_key')` in `WmMapLayerDirective` e il listener/subscription leak collegato, senza introdurre regressioni sul path esistente.

**Architecture:** Fix chirurgico su tre punti di `src/directives/layer.directive.ts`: (1) guardia di esistenza prima di `map.un('moveend', ...)`, (2) tracciamento esplicito dello stato "listener effettivamente registrato sulla mappa" per evitare rimozioni/omissioni scorrette, (3) cleanup della subscription RxJS e del listener precedenti prima di ogni ri-attivazione della feature, per chiudere il leak. Nessuna nuova astrazione, nessun file nuovo salvo lo spec di test.

**Tech Stack:** Angular 20 (standalone: false directive), RxJS 7, OpenLayers 7 (`ol/Observable`), Karma + Jasmine.

**Spec:** `docs/features/8399-fix-crash-ol-key-wmmaplayerdirective/overview.md` (stesso repo)

## Global Constraints

- Nessuna modifica ad altri file del submodule oltre a `layer.directive.ts` (fix) e `layer.directive.spec.ts` (nuovo)
- Nessun commit va eseguito automaticamente durante l'esecuzione di questo piano — i comandi `git commit` mostrati sono istruzioni testuali per l'utente
- Tutti i commit usano lo scope `fix(oc:8399): ...`
- Root cause verificata nel sorgente reale di OpenLayers (`core/node_modules/ol/Observable.js`, metodo `unInternal`): `const key = listener.ol_key;` — se `listener` è `undefined`, questa riga lancia esattamente l'errore riportato (`Cannot read properties of undefined (reading 'ol_key')`). Il fix deve impedire che `map.un(type, listener)` venga mai chiamato con `listener === undefined`.

---

### Task 1: Guardia su `_removeMoveEndListenerIfExists` — elimina la causa diretta del crash

**Files:**
- Modify: `src/directives/layer.directive.ts:71` (nuova property), `:472-488` (`_enableFeaturesInViewportCallback`), `:528-533` (`_removeMoveEndListenerIfExists`)
- Test: `src/directives/layer.directive.spec.ts` (nuovo file)

**Interfaces:**
- Consumes: nessuna dipendenza da altri task
- Produces: `private _moveEndListenerRegistered: boolean` — flag consumato dal Task 2 per decidere se rimuovere il listener precedente prima di riassegnare `_moveEndListener`

- [ ] **Step 1: Scrivi il test che riproduce il crash (RED)**

Crea `src/directives/layer.directive.spec.ts`:

```typescript
import {Component} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {CommonModule} from '@angular/common';
import {By} from '@angular/platform-browser';

import {WmMapComponent, WmMapControls} from '../components';
import {mockMapConf} from 'src/const.spec';
import {WmMapLayerDirective} from './layer.directive';

@Component({
  template: `<wm-map wmMapLayer [wmMapConf]="conf"></wm-map>`,
})
class TestComponent {
  conf = mockMapConf;
}

describe('WmMapLayerDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;
  let wmMapLayerDirective: WmMapLayerDirective;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      declarations: [WmMapLayerDirective, TestComponent, WmMapComponent, WmMapControls],
      imports: [CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    const directiveEl = fixture.debugElement.query(By.directive(WmMapLayerDirective));
    wmMapLayerDirective = directiveEl.injector.get(WmMapLayerDirective);

    await wmMapLayerDirective.mapCmp.isInit$;

    fixture.detectChanges();
  });

  it('_removeMoveEndListenerIfExists: should not call map.un() when _moveEndListener was never assigned', () => {
    const mapUnSpy = spyOn(wmMapLayerDirective.mapCmp.map, 'un');

    expect(() => wmMapLayerDirective['_removeMoveEndListenerIfExists'](false)).not.toThrow();
    expect(mapUnSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Esegui il test e verifica che fallisca**

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: FAIL — `TypeError: Cannot read properties of undefined (reading 'ol_key')` lanciato da dentro `_removeMoveEndListenerIfExists` (chiamata reale a `map.un('moveend', undefined)`, che internamente esegue `unInternal` in `ol/Observable.js`).

- [ ] **Step 3: Applica la guardia minima**

In `src/directives/layer.directive.ts`, aggiungi la nuova property subito dopo `_moveEndListener` (riga 70):

```typescript
  private _moveEndListener: () => void;
  private _moveEndListenerRegistered = false;
```

Sostituisci il corpo di `_removeMoveEndListenerIfExists` (righe 528-533):

```typescript
  private _removeMoveEndListenerIfExists(clearFeatures = true): void {
    if (this._moveEndListener != null && this._moveEndListenerRegistered) {
      this.mapCmp.map.un('moveend', this._moveEndListener);
      this._moveEndListenerRegistered = false;
    }
    if (clearFeatures) {
      this.featuresInViewportEVT.emit([]);
    }
  }
```

In `_enableFeaturesInViewportCallback` (riga 481), aggiorna il flag subito dopo la registrazione:

```typescript
      if (
        this.wmMapLayerShowFeaturesInViewport &&
        zoom >= this._minZoomFeaturesInViewport &&
        zoom <= this._maxZoomFeaturesInViewport
      ) {
        this.mapCmp.map.on('moveend', this._moveEndListener);
        this._moveEndListenerRegistered = true;
      } else {
        this._removeMoveEndListenerIfExists(false);
      }
```

- [ ] **Step 4: Esegui il test e verifica che passi**

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: PASS

- [ ] **Step 5: Aggiungi il test di non-regressione (listener effettivamente registrato continua a essere rimosso)**

Aggiungi in `layer.directive.spec.ts`:

```typescript
  it('_removeMoveEndListenerIfExists: should still call map.un() when the listener was previously registered on the map', () => {
    const dummyListener = () => {};
    wmMapLayerDirective['_moveEndListener'] = dummyListener;
    wmMapLayerDirective['_moveEndListenerRegistered'] = true;
    const mapUnSpy = spyOn(wmMapLayerDirective.mapCmp.map, 'un');

    wmMapLayerDirective['_removeMoveEndListenerIfExists'](false);

    expect(mapUnSpy).toHaveBeenCalledWith('moveend', dummyListener);
    expect(wmMapLayerDirective['_moveEndListenerRegistered']).toBe(false);
  });
```

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: PASS (entrambi i test)

- [ ] **Step 6: Aggiungi il test sul secondo call site non protetto (riga 176, `enable=false` esplicito mai preceduto da `enable=true`)**

Aggiungi in `layer.directive.spec.ts`:

```typescript
  it('wmMapLayerEnableFeaturesInViewport(false): should not throw when the feature was never enabled before', fakeAsync(() => {
    expect(() => {
      wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = false;
      tick();
    }).not.toThrow();
  }));
```

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: PASS — prima del fix (Step 3) questo test sarebbe fallito con lo stesso `TypeError`, perché questo call site (riga 176, dentro la subscription RxJS del setter) non ha alcun try/catch a differenza di `_enableFeaturesInViewportCallback`.

- [ ] **Step 7: Commit**

```bash
git add src/directives/layer.directive.ts src/directives/layer.directive.spec.ts
git commit -m "fix(oc:8399): guard map.un('moveend') against unassigned listener"
```

---

### Task 2: Elimina il listener/subscription leak sul setter `wmMapLayerEnableFeaturesInViewport`

**Files:**
- Modify: `src/directives/layer.directive.ts:18-19` (import), `:69-71` (nuova property), `:162-179` (setter `wmMapLayerEnableFeaturesInViewport`)
- Test: `src/directives/layer.directive.spec.ts`

**Interfaces:**
- Consumes: `private _moveEndListenerRegistered: boolean` (da Task 1), `private _removeMoveEndListenerIfExists(clearFeatures?: boolean): void` (esistente, già guardato da Task 1)
- Produces: `private _featuresInViewportSubscription: Subscription` — non consumato da altri task, ma parte dello stato interno verificabile nei test

- [ ] **Step 1: Scrivi il test che riproduce il leak (RED)**

Aggiungi in `layer.directive.spec.ts`:

```typescript
  it('wmMapLayerEnableFeaturesInViewport(true): should unsubscribe the previous _moveEndSubject$ subscription on repeated activation', fakeAsync(() => {
    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const firstSubscription = wmMapLayerDirective['_featuresInViewportSubscription'];

    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const secondSubscription = wmMapLayerDirective['_featuresInViewportSubscription'];

    expect(firstSubscription).toBeDefined();
    expect(firstSubscription.closed).toBe(true);
    expect(secondSubscription).not.toBe(firstSubscription);
    expect(secondSubscription.closed).toBe(false);
  }));

  it('wmMapLayerEnableFeaturesInViewport(true): should remove a previously registered moveend listener from the map before assigning a new one', fakeAsync(() => {
    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();
    const firstListener = wmMapLayerDirective['_moveEndListener'];
    // Simula la registrazione effettiva sulla mappa, che in produzione avviene
    // dentro _enableFeaturesInViewportCallback al primo cambio di zoom utile.
    wmMapLayerDirective.mapCmp.map.on('moveend', firstListener);
    wmMapLayerDirective['_moveEndListenerRegistered'] = true;
    const mapUnSpy = spyOn(wmMapLayerDirective.mapCmp.map, 'un').and.callThrough();

    wmMapLayerDirective.wmMapLayerEnableFeaturesInViewport = true;
    tick();

    expect(mapUnSpy).toHaveBeenCalledWith('moveend', firstListener);
  }));
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: FAIL su entrambi i nuovi test — `firstSubscription.closed` è `false` (mai smontata) e `mapUnSpy` non viene mai chiamato (il vecchio listener resta orfano).

- [ ] **Step 3: Implementa il cleanup nel setter**

In `src/directives/layer.directive.ts`, aggiorna l'import RxJS (riga 19):

```typescript
import {Subject, Subscription} from 'rxjs';
```

Aggiungi la nuova property subito dopo `_moveEndListenerRegistered` (introdotta in Task 1):

```typescript
  private _moveEndListenerRegistered = false;
  private _featuresInViewportSubscription: Subscription;
```

Sostituisci il corpo del setter `wmMapLayerEnableFeaturesInViewport` (righe 162-179):

```typescript
  @Input() set wmMapLayerEnableFeaturesInViewport(enable: boolean) {
    this.mapCmp.isInit$
      .pipe(
        filter(f => f === true),
        take(1),
      )
      .subscribe(() => {
        if (enable) {
          this._featuresInViewportSubscription?.unsubscribe();
          this._featuresInViewportSubscription = this._moveEndSubject$
            .pipe(debounceTime(100))
            .subscribe(() => {
              this._featuresInViewport();
            });
          // Rimuove l'eventuale listener già registrato sulla mappa prima di
          // sostituire il riferimento, per non lasciarlo agganciato per sempre.
          this._removeMoveEndListenerIfExists(false);
          this._moveEndListener = () => this._moveEndSubject$.next();
          this._initResolutionChangeListener();
        } else {
          this._removeMoveEndListenerIfExists(false);
        }
      });
  }
```

- [ ] **Step 4: Esegui i test e verifica che passino**

Run: `nvm use 22 && npx ng test map-core --include='**/layer.directive.spec.ts'`
Expected: PASS (tutti e 5 i test del file)

- [ ] **Step 5: Esegui l'intera suite del submodule per verificare l'assenza di regressioni**

Run: `nvm use 22 && npx ng test map-core`
Expected: PASS su tutti gli spec esistenti (186+ spec, richiede Chrome con GPU in locale — vedi CLAUDE.md di questo submodule, sezione "Note ambiente")

- [ ] **Step 6: Commit**

```bash
git add src/directives/layer.directive.ts src/directives/layer.directive.spec.ts
git commit -m "fix(oc:8399): unsubscribe previous moveend listener/subscription on repeated activation"
```

---

### Task 3: Verifica manuale pre/post-fix su `localhost:4200/map`

**Files:** nessuno (verifica manuale, nessuna modifica di codice)

**Interfaces:**
- Consumes: build locale dell'app principale (branch `RDO_ass_cammini_italia_2026_2`) con il submodule `map-core` aggiornato ai commit dei Task 1-2
- Produces: conferma osservabile che il warning non si presenta più

- [ ] **Step 1: Riproduci il warning prima del fix (se non già fatto)**

Nel repo principale (`core/`), assicurati che il submodule `map-core` sia ancora al commit precedente al fix. Avvia `npm start`, apri `http://localhost:4200/map` con `wmMapLayerEnableFeaturesInViewport` disabilitato (configurazione di default nella maggior parte dei casi). Apri la console DevTools e conferma la presenza del warning `TypeError: Cannot read properties of undefined (reading 'ol_key')`.

- [ ] **Step 2: Aggiorna il submodule al commit con il fix**

```bash
cd core/src/app/shared/map-core
git log --oneline -3   # verifica che i commit dei Task 1 e 2 siano in cima
cd ../../../../..       # torna in core/
git add src/app/shared/map-core
git commit -m "fix(oc:8399): aggiorna submodule map-core con fix listener ol_key"
```

- [ ] **Step 3: Ripeti la riproduzione e conferma l'assenza del warning**

Riavvia `npm start` (o ricarica la pagina se già in esecuzione), riapri `http://localhost:4200/map` con la stessa configurazione (feature disabilitata). Conferma che il warning non compare più in console durante il cambio di zoom.

---

### Task 4: Propaga il fix su `develop` (map-core) e sincronizza il branch `RDO_ass_cammini_italia_2026_2`

**Files:** nessuna modifica di codice aggiuntiva — solo puntatori submodule e branch/PR

**Interfaces:**
- Consumes: commit dei Task 1-2 in `map-core`
- Produces: il fix disponibile sia su `map-core` `develop` (propagazione a tutti gli shard) sia sul branch cliente `RDO_ass_cammini_italia_2026_2`

- [ ] **Step 1: Branch dedicato in `map-core`**

```bash
cd core/src/app/shared/map-core
git checkout -b feature/oc-8399-fix-crash-ol-key-wmmaplayerdirective
```

Esegui qui i Task 1 e 2 (i commit `fix(oc:8399): ...` di cui sopra vanno su questo branch, non direttamente su `develop` o sul branch cliente).

- [ ] **Step 2: Apri la PR verso `develop` di `map-core`**

```bash
git push -u origin feature/oc-8399-fix-crash-ol-key-wmmaplayerdirective
gh pr create --repo webmappsrl/map-core --base develop \
  --title "fix(oc:8399): fix crash ol_key in WmMapLayerDirective" \
  --body "Vedi docs/features/8399-fix-crash-ol-key-wmmaplayerdirective/ per overview, piano e note."
```

- [ ] **Step 3: Dopo il merge su `develop`, aggiorna il puntatore submodule su entrambi i branch dell'app principale**

Nel repo principale `core/`, su ciascuno dei due branch (`develop` e `RDO_ass_cammini_italia_2026_2`):

```bash
git checkout <develop-o-RDO_ass_cammini_italia_2026_2>
cd src/app/shared/map-core
git fetch origin
git checkout develop
git pull
cd ../../../../..
git add src/app/shared/map-core
git commit -m "fix(oc:8399): aggiorna submodule map-core con fix listener ol_key"
git push
```

Ripeti identico per l'altro branch. Questo è un rollback non-atomico per costruzione (due repository, due branch): se in futuro serve un revert, va eseguito su entrambi i branch separatamente (nessuna procedura automatica prevista, per decisione esplicita in overview.md → Rischi).

---

## Self-Review

**1. Copertura spec:**
- Requisito "guardia su `_removeMoveEndListenerIfExists`" → Task 1 ✅
- Requisito "nessuna regressione sul path esistente" → Task 1 Step 5 ✅
- Requisito "no leak su re-invocazione del setter" → Task 2 ✅
- Requisito "test Karma copre i 3 path" → Task 1 Step 1/6 + Task 2 Step 1 (3 path distinti coperti da 4 test totali, il terzo requisito è coperto da 2 test complementari: subscription + listener) ✅
- Requisito "verifica manuale pre/post-fix" → Task 3 ✅
- Requisito "fix su develop + branch RDO" → Task 4 ✅

**2. Placeholder scan:** nessun placeholder — ogni step ha codice reale, comandi reali, percorsi reali con numeri di riga verificati nel file sorgente attuale.

**3. Coerenza dei tipi:** `_moveEndListenerRegistered: boolean` e `_featuresInViewportSubscription: Subscription` sono introdotti in Task 1/2 e usati con lo stesso nome in tutti gli step successivi e nei test. `_removeMoveEndListenerIfExists(clearFeatures?: boolean): void` mantiene la firma esistente (nessun breaking change).

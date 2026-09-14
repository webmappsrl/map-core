# map-core — CLAUDE.md

## Cos'è questo repo

Libreria Angular per la mappa (`map-core`, v1.2.0), costruita con `ng-packagr` e basata su
**OpenLayers 7**. È un **submodule Git** e non è pubblicata su npm (`private: true`): si distribuisce
solo così. La montano due prodotti — `webmapp-app` (sotto `core/src/app/shared/map-core`) e
`wm-webapp` (sotto `src/app/shared/map-core`) — accanto agli altri due submodule condivisi
`wm-core` e `wm-types`.

Distribuisce il componente `<wm-map>` e le direttive che ci si attaccano sopra — layer, POI,
tracce, hit-test, disegno — più le utility di stile e di cache.

Qui vive il **dominio della mappa**: come funziona un meccanismo e quali vincoli valgono per
chiunque lo monti. Ciò che vale per un prodotto solo — pagine, temi, configurazioni di build —
resta nel repo di quel prodotto.

## Regole del repo

- **`map-core` non dipende mai da `wm-core`.** È una libreria OpenLayers indipendente: se serve una
  risorsa che in `wm-core` esiste già, qui si reimplementa in autonomia. Il caso reale: le icone dei
  controlli mappa hanno una cache propria invece di passare da `<wm-img>`/`getImg()`.
- **Una modifica qui arriva a entrambi i prodotti.** Prima di cambiare il comportamento di una
  direttiva, considera che i consumer la bindano in template che questo repo non vede, e che ognuno
  ha il proprio pin del submodule.

## Comandi

| Cosa | Comando |
|---|---|
| Test in CI | `CI=true npx ng test map-core --configuration=ci` |
| Suite completa in locale (richiede una GPU) | `nvm use 22 && npx ng test map-core` |
| Un solo spec in locale | `nvm use 22 && npx ng test map-core --include='**/<nome>.spec.ts'` |
| Build della libreria | `npm run build` |
| Documentazione (Compodoc) | `npm run compodoc` |

In CI girano solo gli spec elencati in `angular.json` → `configurations.ci.include`: le utils più
`button.controls.map.spec.ts`, che è presentazionale e non monta un `OlMap`. Gli spec che creano una
mappa reale fanno crashare Chrome headless con `--disable-gpu` e restano fuori. Serve `nvm use 22`
prima dei test: con la versione di default di Node la suite non parte.

## Convenzioni

- **Gli ID dei ticket hanno la forma `oc:<numero>`** e vengono da Orchestrator. Ogni documento sotto
  `docs/features/` inizia con `> Ticket: oc:<ID>`, e lo slug della cartella è
  `<ID>-<titolo-in-kebab-case>`. Lo scope dei commit porta il ticket: `fix(oc:<ID>): …`.
- **`docs/` ha tre destinazioni**: `features/` è il cantiere di un lavoro (com'è andato, immutabile),
  `knowledge/` la conoscenza per argomento (perché funziona così), `howto/` le procedure. Le
  trappole non stanno in nessuna delle tre: stanno in `.claude/rules/`.
- **Documentazione, commenti e messaggi di commit sono in italiano**, i termini tecnici in inglese.
- **Un binding raggiunge tutte le direttive** che sullo stesso host element espongono quel nome di
  `@Input()`: non duplicarlo mai. L'ordine in cui si scrivono gli attributi segue una convenzione
  che si carica da sé quando si tocca un template con `<wm-map>` — `.claude/rules/template-wm-map.md`,
  replicata nei repo che montano questa libreria.

## Conoscenza

| Argomento | Cosa copre | Ticket | Pagina |
|---|---|---|---|
| Cache offline | Fogli CARG e icone dei controlli, `withCacheFallback`, accoppiamento col download del consumer | oc:8219 | [docs/knowledge/cache-offline-carg.md](docs/knowledge/cache-offline-carg.md) |
| Grafico altimetrico sulla mappa | Pulizia di pallino e segmento di hover quando il grafico si spegne | oc:8177 | [docs/knowledge/altimetria-su-mappa.md](docs/knowledge/altimetria-su-mappa.md) |
| Inquadratura e padding | `fit()` che ignora il padding della `View`, i quattro punti che lo gestiscono | oc:4783 | [docs/knowledge/fit-view-e-padding.md](docs/knowledge/fit-view-e-padding.md) |
| Listener e ciclo di vita dei layer | Crash `ol_key`, listener creato una volta sola, invalidazione del rendering, filtri Home a layer aperto | oc:8399, oc:8414 | [docs/knowledge/listener-e-lifecycle.md](docs/knowledge/listener-e-lifecycle.md) |
| Log in produzione | Criterio del triage dei `console.*`, cosa resta e perché | oc:8369 | [docs/knowledge/log-in-produzione.md](docs/knowledge/log-in-produzione.md) |
| POI: filtri e rendering | Filtro esteso ai related POI, `show_image_on_map`, flash all'avvio | oc:7646, oc:7988, oc:8114 | [docs/knowledge/filtri-e-rendering-poi.md](docs/knowledge/filtri-e-rendering-poi.md) |

## Trappole

Stanno in `.claude/rules/`, un file per soggetto, con il frontmatter `paths:` che le carica quando
si toccano i file corrispondenti: `directives` (import dal barrel, `map.un()`, invalidazione del
rendering, `distinctUntilChanged`, mappa distrutta, `fit()` e padding), `spec-e-karma` (cosa gira in
CI e cosa no, spec già rotti) e `template-wm-map` (ordine degli attributi). Ogni rule rimanda alla
pagina di conoscenza per il perché.

## Lavori senza una pagina dedicata

| Lavoro | Ticket | In breve |
|---|---|---|
| Rifacimento del setup Karma | oc:7989 | `polyfills` al posto di `src/test.ts`, flag Chrome per la CI, `include` dei soli spec che non montano una mappa. Cosa gira dove sta nei Comandi e in `.claude/rules/spec-e-karma.md`; il dettaglio del cambio in `docs/features/7989-fix-karma-test-config/` |

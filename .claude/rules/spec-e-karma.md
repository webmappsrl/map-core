---
paths:
  - "src/**/*.spec.ts"
  - "angular.json"
  - "src/karma.conf.js"
---

# Trappole: test Karma

- **In CI girano solo gli spec elencati in `angular.json` → `configurations.ci.include`**, e non
  sono «solo utils»: c'è anche `button.controls.map.spec.ts`, che è presentazionale e non monta un
  `OlMap`. Gli spec che creano una mappa reale fanno crashare Chrome headless con `--disable-gpu`.
  Un nuovo spec va aggiunto lì **solo se** non monta una mappa.
- **Un file non incluso in `ci.include` non protegge da nulla in CI.** Scriverlo ha senso come
  regressione locale, ma non dare per scontato che la pipeline intercetti ciò che verifica.
- **Cinque spec di direttive partono già rossi** per l'import dal barrel (vedi
  [directives.md](directives.md)), e `map.component.spec.ts` per un `NG0201` su `ActivatedRoute`
  mai aggiornato. Se ne tocchi uno, non è una regressione tua.
- **Serve `nvm use 22`** prima di lanciare la suite: con la versione di default di Node non parte.
- **Un `TestComponent` dentro uno spec vuole `standalone: false`** su Angular 17+, dove lo
  standalone è il default.

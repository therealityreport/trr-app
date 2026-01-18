# Repository Structure
```markdown
trr-app
├── .firebaserc
├── .github
│   └── workflows
│       ├── firebase-rules.yml
│       ├── repo_map.yml
│       └── web-tests.yml
├── .gitignore
├── Makefile
├── REPO_STRUCTURE.md
├── apps
│   ├── vue-wordle
│   │   ├── index.html
│   │   ├── package-lock.json
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── App.vue
│   │   │   ├── components
│   │   │   │   ├── WordleBoard.vue
│   │   │   │   └── WordleTile.vue
│   │   │   ├── env.d.ts
│   │   │   ├── main.ts
│   │   │   └── styles
│   │   │       └── wordle.css
│   │   ├── tsconfig.json
│   │   ├── tsconfig.node.json
│   │   ├── tsconfig.tsbuildinfo
│   │   └── vite.config.ts
│   └── web
│       ├── .gitignore
│       ├── DEPLOY.md
│       ├── POSTGRES_SETUP.md
│       ├── README.md
│       ├── SURVEYS_TABLE_SETUP.md
│       ├── db
│       │   └── migrations
│       │       ├── 000_create_surveys_table.sql
│       │       ├── 000_seed_surveys.sql
│       │       ├── 001_create_global_profile_responses.sql
│       │       ├── 002_create_rhoslc_s6_responses.sql
│       │       ├── 003_create_survey_x_responses.sql
│       │       ├── 004_add_app_username_column.sql
│       │       ├── 005_make_survey_x_show_fields_nullable.sql
│       │       └── 006_create_rhop_s10_responses.sql
│       ├── eslint.config.mjs
│       ├── next.config.ts
│       ├── package-lock.json
│       ├── package.json
│       ├── pnpm-lock.yaml
│       ├── postcss.config.mjs
│       ├── public
│       │   ├── assets
│       │   │   └── icons
│       │   ├── file.svg
│       │   ├── fonts
│       │   │   ├── Gloucester OS MT Std Regular.otf
│       │   │   ├── Gloucester OS MT Std Regular.woff
│       │   │   ├── Gloucester OS MT Std Regular.woff2
│       │   │   ├── gloucester-bold-font-book
│       │   │   ├── gloucester-condensed-font-book
│       │   │   ├── gloucester-goodall-font-book
│       │   │   ├── monotype
│       │   │   ├── plymouth-serial-font-book
│       │   │   ├── realitease
│       │   │   └── rude-slab-condensed-font-book
│       │   ├── globe.svg
│       │   ├── icons
│       │   │   ├── Bravodle-Icon.svg
│       │   │   ├── Realitease-Icon.svg
│       │   │   └── realations-icon.svg
│       │   ├── images
│       │   │   ├── logos
│       │   │   ├── realitease
│       │   │   └── shows
│       │   ├── next.svg
│       │   ├── vercel.svg
│       │   └── window.svg
│       ├── scripts
│       │   ├── check-survey-x.mjs
│       │   ├── check-surveys.mjs
│       │   └── run-migrations.mjs
│       ├── src
│       │   ├── app
│       │   │   ├── admin
│       │   │   ├── api
│       │   │   ├── auth
│       │   │   ├── bravodle
│       │   │   ├── favicon.ico
│       │   │   ├── globals.css
│       │   │   ├── hub
│       │   │   ├── layout.tsx
│       │   │   ├── login
│       │   │   ├── page.tsx
│       │   │   ├── privacy-policy
│       │   │   ├── profile
│       │   │   ├── realations
│       │   │   ├── realitease
│       │   │   ├── side-menu.css
│       │   │   ├── surveys
│       │   │   ├── terms-of-sale
│       │   │   ├── terms-of-service
│       │   │   └── test-auth
│       │   ├── components
│       │   │   ├── AuthRedirect.tsx
│       │   │   ├── ClientAuthGuard.tsx
│       │   │   ├── ClientOnly.tsx
│       │   │   ├── DebugPanel.tsx
│       │   │   ├── ErrorBoundary.tsx
│       │   │   ├── GameHeader.tsx
│       │   │   ├── GlobalHeader.tsx
│       │   │   ├── SideMenuProvider.tsx
│       │   │   ├── SignOutButton.tsx
│       │   │   ├── ToastHost.tsx
│       │   │   └── flashback-ranker.tsx
│       │   ├── lib
│       │   │   ├── admin
│       │   │   ├── bravodle
│       │   │   ├── data
│       │   │   ├── db
│       │   │   ├── debug.ts
│       │   │   ├── firebase.ts
│       │   │   ├── firebaseAdmin.ts
│       │   │   ├── preferences.ts
│       │   │   ├── realitease
│       │   │   ├── server
│       │   │   ├── surveys
│       │   │   └── validation
│       │   ├── signup
│       │   │   └── page.tsx
│       │   └── styles
│       │       ├── components.css
│       │       └── realitease-fonts.css
│       ├── tests
│       │   ├── finish.flow.test.tsx
│       │   ├── profile.test.ts
│       │   ├── register.flow.test.tsx
│       │   ├── register.validation.test.ts
│       │   ├── ssr.guards.test.ts
│       │   ├── users.integration.test.ts
│       │   └── validation.test.ts
│       ├── tsconfig.json
│       └── vitest.config.ts
├── copy-fonts.sh
├── docs
│   └── Repository
│       ├── README.md
│       ├── WORKFLOW_SETUP.md
│       ├── diagrams
│       │   ├── git_workflow.md
│       │   └── system_maps.md
│       └── generated
│           ├── .gitkeep
│           ├── CODE_IMPORT_GRAPH.md
│           ├── SCRIPTS_FLOW.md
│           └── rendered
│               ├── CODE_IMPORT_GRAPH-1.svg
│               ├── SCRIPTS_FLOW-1.svg
│               ├── git_workflow-1.svg
│               ├── system_maps-1.svg
│               └── system_maps-2.svg
├── firebase.json
├── firestore.rules
├── package-lock.json
├── package.json
├── requirements.txt
├── ruff.toml
└── scripts
    └── generate_repo_mermaid.py
```

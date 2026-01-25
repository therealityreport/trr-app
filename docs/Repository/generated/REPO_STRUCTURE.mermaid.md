# Mermaid Diagram

```mermaid
graph TD
    %% Repository Structure
    subgraph trr-app
        root[trr-app]

        root --> firebase[firebase.json]
        root --> firestore[firestore.rules]
        root --> gitignore[.gitignore]
        root --> makefile[Makefile]
        root --> readme[REPO_STRUCTURE.md]
        root --> requirements[requirements.txt]
        root --> ruff[ruff.toml]
        root --> copy_fonts[copy-fonts.sh]

        subgraph github_workflows [GitHub Workflows]
            direction TB
            workflow1[firebase-rules.yml]
            workflow2[repo_map.yml]
            workflow3[web-tests.yml]
        end
        root --> github[.github]
        github --> github_workflows
        
        subgraph apps
            direction TB
            app_vue[vue-wordle]
            app_web[web]
        end
        root --> apps
        
        %% Substructure of vue-wordle
        subgraph vue_wordle [Vue Wordle App]
            direction TB
            vw_index[index.html]
            vw_package_lock[package-lock.json]
            vw_package[package.json]
            vw_tsconfig[tsconfig.json]
            vw_tsconfig_node[tsconfig.node.json]
            vw_tsbuildinfo[tsconfig.tsbuildinfo]
            vw_vite[vite.config.ts]

            subgraph vw_src [Source]
                direction TB
                vw_app[App.vue]
                vw_env[env.d.ts]
                vw_main[main.ts]

                subgraph vw_components [Components]
                    direction TB
                    vw_board[WordleBoard.vue]
                    vw_tile[WordleTile.vue]
                end
                vw_src --> vw_components
                vw_src --> vw_app
                vw_src --> vw_env
                vw_src --> vw_main
                vw_src --> vw_styles[styles]
                vw_styles --> vw_css[wordle.css]
            end
            vw_index --> vw_src
            vw_index --> vw_package_lock
            vw_index --> vw_package
            vw_index --> vw_tsconfig
            vw_index --> vw_tsconfig_node
            vw_index --> vw_tsbuildinfo
            vw_index --> vw_vite
        end
        apps --> app_vue

        %% Substructure of web
        subgraph web_app [Web App]
            direction TB
            web_gitignore[.gitignore]
            web_dep[DEPLOY.md]
            web_postgres[POSTGRES_SETUP.md]
            web_readme[README.md]
            web_surveys[SURVEYS_TABLE_SETUP.md]
            web_db[db]

            subgraph db_migrations [Database Migrations]
                direction TB
                db_migration1[000_create_surveys_table.sql]
                db_migration2[000_seed_surveys.sql]
                db_migration3[001_create_global_profile_responses.sql]
                db_migration4[002_create_rhoslc_s6_responses.sql]
                db_migration5[003_create_survey_x_responses.sql]
                db_migration6[004_add_app_username_column.sql]
                db_migration7[005_make_survey_x_show_fields_nullable.sql]
                db_migration8[006_create_rhop_s10_responses.sql]
            end
            web_db --> db_migrations

            web_app --> web_gitignore
            web_app --> web_dep
            web_app --> web_postgres
            web_app --> web_readme
            web_app --> web_surveys
            web_app --> web_package_lock[package-lock.json]
            web_app --> web_package[package.json]
            web_app --> web_pnpm_lock[pnpm-lock.yaml]
            web_app --> web_postcss[postcss.config.mjs]
            web_app --> web_next[next.config.ts]
            web_app --> web_styles[src/styles]
            web_styles --> web_style_css[components.css]

            subgraph web_scripts [Scripts]
                direction TB
                script_check[check-survey-x.mjs]
                script_check_surveys[check-surveys.mjs]
                script_run[run-migrations.mjs]
            end
            web_app --> web_scripts
            
            subgraph web_src [Source]
                direction TB
                web_app_dir[app]
                web_components_dir[components]
                web_lib[lib]
                web_tests[tests]
                web_test_tsconfig[tsconfig.json]
                web_vitest[vitest.config.ts]
            end
            web_app --> web_src
            web_src --> web_app_dir
            web_src --> web_components_dir
            web_src --> web_lib
            web_src --> web_tests
            web_src --> web_test_tsconfig
            web_src --> web_vitest
        end
        apps --> app_web
    end
    
    style trr-app fill:#e0f7fa,stroke:#333,stroke-width:2px;
    style github_workflows fill:#ffe0b2,stroke:#333,stroke-width:1.5px;
    style vue_wordle fill:#c8e6c9,stroke:#333,stroke-width:1.5px;
    style web_app fill:#bbdefb,stroke:#333,stroke-width:1.5px;
```
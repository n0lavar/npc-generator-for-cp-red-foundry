# Project Guidance

## Purpose

This repository contains a Foundry Virtual Tabletop module for importing generated Cyberpunk RED non-player characters into the Cyberpunk RED game system on Foundry VTT 12.

The character data originates from [n0lavar/cp_red_npc_generator](https://github.com/n0lavar/cp_red_npc_generator), a generator that creates Cyberpunk RED NPCs from JSON configuration data according to a selected rank and role. The Foundry module is responsible for translating the generator output into Foundry actor and item data and creating the resulting character in the active world.

## Target Environment

- Foundry Virtual Tabletop: version 12
- Game system: Cyberpunk RED
- Module ID: `npc_generator_for_cp_red_foundry`
- Module manifest: `module.json`
- JavaScript entry point: `scripts/main.js`

## Development Guidelines

- Keep all source code comments, documentation, user-facing text, commit messages, and project metadata in English.
- Use the Foundry VTT v12 API and the document schemas exposed by the installed Cyberpunk RED system.
- Keep generator-specific parsing separate from Foundry document creation.
- Validate imported data before creating or updating Foundry documents.
- Do not silently discard unsupported generator fields; report them clearly or preserve them for later handling.
- Avoid relying on private Foundry or game-system APIs when a supported public API is available.
- Keep `module.json` compatible with Foundry VTT 12 and ensure its `id` matches the module directory name.

## Project Structure Guidelines

Use the following structure as the module grows. Create directories only when they contain real functionality; do not add empty placeholder directories.

```text
.
|-- module.json
|-- README.md
|-- AGENTS.md
|-- scripts/
|   |-- main.js
|   |-- applications/
|   |   `-- npc-generator-application.js
|   |-- generator/
|   |   |-- parser.js
|   |   |-- validator.js
|   |   `-- schema.js
|   |-- mapping/
|   |   |-- actor-mapper.js
|   |   `-- item-mapper.js
|   |-- foundry/
|   |   |-- actor-importer.js
|   |   |-- actor-directory.js
|   |   `-- settings.js
|   |-- services/
|   |   `-- npc-import-service.js
|   |-- utils/
|   |   `-- logger.js
|   `-- constants.js
|-- templates/
|   `-- npc-generator-application.hbs
|-- styles/
|   `-- npc-generator.css
|-- lang/
|   `-- en.json
|-- assets/
`-- tests/
    |-- fixtures/
    |-- generator/
    `-- mapping/
```

### Directory Responsibilities

- `scripts/main.js` is the composition root. It registers lifecycle hooks and connects module components, but contains no parsing, mapping, or import business logic.
- `scripts/applications/` contains Foundry applications, dialogs, form handlers, and their view-model preparation.
- `scripts/generator/` owns the external generator contract: parsing raw input, normalizing values, validating required fields, and describing supported generator schemas.
- `scripts/mapping/` contains pure transformations from validated generator models to Cyberpunk RED Actor and Item source objects. Mapping code must not create or update Foundry documents.
- `scripts/foundry/` contains direct Foundry and Cyberpunk RED system integration, including hooks, directory controls, settings registration, permissions, and Document API calls.
- `scripts/services/` coordinates complete use cases such as validating input, mapping it, creating an Actor, creating embedded Items, and reporting the result.
- `scripts/utils/` is reserved for small, reusable, domain-independent helpers. Do not turn it into a collection of unrelated business logic.
- `templates/` contains Handlebars presentation templates, with one primary template per application or dialog.
- `styles/` contains module-scoped styles. Split files by application only when the stylesheet becomes difficult to navigate.
- `lang/` contains Foundry localization dictionaries. English is the source language.
- `assets/` contains module-owned static images, icons, and fonts. Do not store generated character data here.
- `tests/` mirrors the source areas under test. `tests/fixtures/` contains small, sanitized, versioned samples of generator input and expected mappings.

### Dependency Direction

Keep dependencies flowing toward pure domain code:

```text
applications / foundry hooks
            |
            v
         services
        /        \
       v          v
 generator     mapping
                   |
                   v
          Foundry document sources
```

- Generator parsing and mapping must not import Foundry UI classes or access globals such as `game`, `ui`, `canvas`, or `Hooks`.
- UI code calls services; it must not duplicate parsing, mapping, or persistence logic.
- Services may depend on narrow Foundry adapters, but Foundry adapters must not depend on applications.
- Avoid circular imports. If two modules require each other, extract their shared contract or helper into a lower-level module.
- Pass dependencies explicitly where practical, especially the logger, notifier, document creator, and system-schema adapter. This keeps core behavior testable.

### File and Module Conventions

- Use lowercase kebab-case filenames, for example `actor-importer.js` and `npc-generator-application.hbs`.
- Prefer one primary responsibility and one main export per file. Keep closely related small helpers private to that file.
- Use named exports for reusable functions and classes. Reserve default exports only for framework conventions that materially benefit from them.
- Keep module constants in `scripts/constants.js` only when they are shared. Keep feature-specific constants beside their feature.
- Do not create barrel `index.js` files unless they simplify a stable public boundary without introducing circular dependencies.
- Import files using explicit relative paths and file extensions. Do not depend on bundler-only aliases unless a build system is intentionally introduced.
- Keep Foundry-relative asset and template paths centralized so renaming the package or moving assets does not require scattered string changes.

### Feature Placement Workflow

When adding a feature, place each part according to its responsibility:

1. Define or update the external data contract in `scripts/generator/`.
2. Add validation and normalization before any Foundry-specific work.
3. Add pure Actor and Item transformations in `scripts/mapping/`.
4. Coordinate the use case in `scripts/services/`.
5. Add document persistence or Foundry hooks in `scripts/foundry/`.
6. Add the user interaction in `scripts/applications/`, `templates/`, and `styles/`.
7. Add localization keys in `lang/en.json` and tests with representative fixtures.

Do not organize the project only by technical file type once a feature becomes large. If a feature grows beyond a few cohesive files, create a feature directory while preserving the same separation between UI, domain logic, and Foundry integration.

## Language and Front-End Best Practices

### JavaScript

- Use native ES modules with explicit `import` and `export` statements. Register entry points through the `esmodules` field in `module.json`.
- Prefer `const`; use `let` only when reassignment is required. Do not use `var`.
- Use `async`/`await` for Foundry document operations and template loading. Always await create, update, delete, and render operations when later work depends on their completion.
- Keep functions small and focused. Separate generator parsing, validation, Cyberpunk RED mapping, Foundry document persistence, and UI behavior.
- Use descriptive names and JSDoc for public functions, complex data shapes, and integration boundaries.
- Do not mutate generator input objects or Foundry document source data directly. Build new plain objects and use the supported Document methods.
- Use optional chaining and nullish coalescing when reading external or system-owned data, but validate required fields explicitly.
- Handle errors at user-triggered boundaries. Log actionable technical context with a stable module prefix and show a localized notification when the user must act.
- Never use `eval`, `Function`, inline script strings, or dynamically generated executable code.
- Do not expose secrets, filesystem paths, access tokens, or private generator data in logs or chat messages.
- Add automated tests for pure parsing, normalization, validation, and mapping code. Keep Foundry-dependent code behind narrow adapters so most logic can be tested without a running world.

### HTML and Handlebars

- Store reusable UI templates in `templates/`; do not build substantial interfaces by concatenating HTML strings in JavaScript.
- Use semantic HTML, associated labels, correct button types, and keyboard-accessible controls.
- Use Foundry localization helpers for every user-visible string, including labels, titles, validation messages, notifications, and tooltips.
- Pass prepared plain view models to templates. Do not put business logic, document mutations, or complex calculations in Handlebars.
- Treat imported generator content as untrusted input. Rely on escaped Handlebars output by default and sanitize any content that must be rendered as HTML.
- Use module-scoped element classes and `data-*` attributes for behavior hooks. Do not use translated text or fragile DOM position selectors to identify controls.

### CSS

- Scope every selector beneath a unique module root class such as `.npc-generator-for-cp-red-foundry` to avoid affecting Foundry or other modules.
- Prefer Foundry CSS variables and existing application patterns so the UI works with supported themes.
- Use classes instead of inline styles and avoid `!important` unless overriding an unavoidable upstream rule.
- Keep layouts responsive to narrow application windows and browser zoom. Do not rely on fixed viewport dimensions.
- Preserve visible focus indicators, sufficient contrast, readable text sizes, and reduced-motion preferences.

### JSON and Data Contracts

- Keep all JSON strictly valid: double-quoted keys and strings, no comments, and no trailing commas.
- Treat the generator output format and the Cyberpunk RED system schema as separate versioned contracts.
- Validate external data before mapping it. Reject or report malformed required fields and preserve unknown fields when practical.
- Keep migrations explicit whenever stored flags, settings, or cached import data change shape.

## Foundry VTT Best Practices

### Package Structure and Manifest

- Keep `module.json` at the module root and maintain accurate `minimum`, `verified`, and, when necessary, `maximum` compatibility values.
- The manifest `id` must exactly match the module directory name. For a distributable package, use a unique lowercase, hyphen-separated ID without underscores or other special characters.
- Declare the supported Cyberpunk RED system in the manifest before distribution so the module cannot be enabled in unrelated game systems.
- Use conventional directories: `scripts/`, `templates/`, `styles/`, `lang/`, `packs/`, and `assets/` as applicable.
- Update the module version for releases and keep manifest, release archive, and compatibility metadata synchronized.

### Lifecycle and Hooks

- Use `Hooks.once("init", ...)` for registrations that must exist during initialization, such as settings, keybindings, custom sheets, or configuration entries.
- Use `Hooks.once("ready", ...)` only when world documents and the active user are required.
- Use focused render and document hooks instead of monkey-patching core prototypes. If patching is unavoidable, isolate it, document why, and fail safely when the target API changes.
- Use `Hooks.once` for one-time setup and `Hooks.on` only for repeatable events. Retain hook IDs and call `Hooks.off` when listeners have a shorter lifetime than the module.
- Make render-hook code idempotent so repeated application renders do not duplicate buttons, listeners, or markup.

### Documents and Cyberpunk RED Integration

- Create and update Actors and embedded Items through supported Foundry Document APIs. Never write directly to the world database or mutate `_source`.
- Inspect the installed Cyberpunk RED system's current Actor and Item schemas before implementing mappings; do not infer paths solely from sheet markup or old examples.
- Prefer batch embedded-document operations when importing multiple items, while preserving useful validation errors for individual records.
- Build the complete actor source in memory, validate it, and only then persist it. Avoid leaving partially imported actors after a failed operation; clean up safely or mark the actor as incomplete.
- Store module-owned metadata under namespaced flags, for example `flags.npc_generator_for_cp_red_foundry`, and do not overwrite flags owned by Foundry, the system, or other modules.
- Make imports reproducible where possible by recording the generator version, source options, seed, import schema version, and stable external identifiers in module flags.
- Define duplicate-import behavior explicitly: create a new actor, update a previously imported actor, or ask the user. Never overwrite an existing actor silently.

### Permissions, Security, and Sockets

- Check `game.user` permissions before displaying privileged controls and again before executing privileged operations. Hiding a button is not authorization.
- Default actor creation and world-changing import actions to GM users unless a documented workflow safely supports players.
- Treat socket payloads as untrusted. Validate message type, sender authority, data shape, and target document before performing any action.
- Do not assume that a socket sender is authorized merely because the message uses the module namespace.
- Avoid global mutable state. If cross-client coordination is required, designate a single responsible GM and make operations idempotent to prevent duplicate actors.

### Settings, Localization, and UI

- Register settings during `init`. Choose `world` scope for shared import behavior and `client` scope for per-user presentation preferences.
- Namespace localization keys with the module ID and provide at least `lang/en.json`. Do not hard-code user-visible English strings in JavaScript or templates.
- Put the primary `Generate NPC` action in the Actor Directory because the operation creates an Actor. Restrict it to authorized users and prevent duplicate insertion on rerender.
- Use Foundry applications, dialogs, notifications, and form-handling conventions instead of browser-native prompts or alerts.
- Disable submit controls while an import is running, show validation failures clearly, and provide a useful success message that identifies the created actor.

### Compatibility, Performance, and Diagnostics

- Target the public Foundry VTT v12 API. Feature-detect optional system behavior and produce a clear compatibility error instead of failing later with an undefined-property exception.
- Minimize work in global and render hooks. Cache immutable lookup data where appropriate, but invalidate caches when the system or source contract changes.
- Avoid rerendering entire directories or sheets when a targeted document update is sufficient.
- Prefix diagnostic messages consistently, for example `NPC Generator |`, and keep routine production logging quiet.
- Test with a clean Foundry VTT 12 world, the supported Cyberpunk RED system, GM and player users, empty and populated Actor Directories, malformed generator input, and common module combinations.
- Before release, verify activation, deactivation, world reload, import failure recovery, localization, permissions, and absence of console errors.

## External Project

Generator repository: <https://github.com/n0lavar/cp_red_npc_generator>

The generator can produce NPC data including statistics, skills, cyberware, armor, weapons, ammunition, equipment, drugs, money, and flavor items. Future import code should map these concepts to their corresponding Cyberpunk RED Foundry actor and item documents.

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

## External Project

Generator repository: <https://github.com/n0lavar/cp_red_npc_generator>

The generator can produce NPC data including statistics, skills, cyberware, armor, weapons, ammunition, equipment, drugs, money, and flavor items. Future import code should map these concepts to their corresponding Cyberpunk RED Foundry actor and item documents.

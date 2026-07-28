# NPC Generator for Cyberpunk RED - Foundry Module

A Foundry Virtual Tabletop module that generates and imports ready-to-use
non-player characters for the Cyberpunk RED game system.

[![Patreon](https://img.shields.io/badge/Patreon-F96854?logo=patreon&logoColor=white)](https://www.patreon.com/cw/n0lavar)
[![BuyMeACoffee](https://raw.githubusercontent.com/pachadotdev/buymeacoffee-badges/main/bmc-donate-yellow.svg)](https://buymeacoffee.com/n0lavar)

The module runs the
[NPC generator](https://github.com/n0lavar/cp_red_npc_generator)
from inside Foundry, translates its output into Cyberpunk RED Actor and Item
documents, and creates the NPC in the active world.

> This project is a Foundry integration for the generator. Generator rules,
> character generation logic, and generator configuration are maintained in
> the main generator repository linked above.

## What the Module Does

- Adds a **Generate NPC** button to the Actor Directory for GMs.  
![alt text](images/generate-npc-button.png)
- Provides a dialog for selecting the NPC rank, role, and generation options.  
![alt text](images/generate-npc-dialog.png)
- Runs the Python generator in the browser through Pyodide.
- Creates a Cyberpunk RED character Actor from the generated data.
- Imports generated stats, skills, role data, cyberware, armor, weapons,
  ammunition, equipment, junk, and money.
- Resolves supported equipment from every available Item compendium, including
  content provided by other installed modules.
- Clones complete compendium Items so system icons, effects, metadata, and
  schema defaults are retained.
- Equips imported armor and weapons and updates tracked armor locations.
- Checks the current world for generator compatibility and excludes skills
  that are unavailable in the installed system and compendiums.
- Reports generated entries that cannot be matched instead of silently
  discarding them.

## Usage

1. Open the **Actors** directory as a GM.
2. Select **Generate NPC**.
3. Choose the rank, role, and other generation settings.
4. Select **Create Actor**.
5. Wait for generation and import to complete.

Generation settings are initialized from `settings.example.json`. Changes made
in the dialog are stored as browser-private data for the current Foundry
origin; the installed module directory is not modified at runtime.

## Generator Modes

The module provides two GM-only execution modes.

### Bundled

Uses the generator wheel packaged in `vendor/wheels/`. This is the normal mode
for module users.

### Developer

Prompts for a local checkout of the main generator project and imports its
current Python source directly through the browser File System Access API. Use
this mode when developing both projects together.

The current Developer mode source and its representative output define the
supported generator contract.

## Compatibility Check

When a GM's world becomes ready, the module compares the generator's supported
skills and equipment with the Cyberpunk RED system and all available Item
compendiums. Missing skills are saved as generation defaults and excluded from
later NPC generation.

Run **Check compatibility** from the module settings whenever the system,
generator, or installed content modules change.

## Optional AI Descriptions with LM Studio

The generator can request descriptions from an OpenAI-compatible LM Studio
server. Because generation runs in the browser, LM Studio must accept
cross-origin requests from Foundry.

In LM Studio, open **Developer > Server Settings**, enable **Enable CORS**, and
restart the server. Alternatively:

```powershell
lms server stop
lms server start --cors
```

Foundry commonly runs at `http://localhost:30000`, while LM Studio commonly
runs at `http://localhost:1234/v1`. Without CORS, the browser blocks the
request. Leaving the Model ID, API key, or base URL empty disables AI-generated
descriptions.

## Updating the Bundled Generator

To package a published generator tag:

```console
python tools/update-bundled-generator.py <tag>
```

The update script verifies the tag, builds and validates the wheel, updates the
worker reference, and removes the previous wheel only after the replacement is
ready.

## Troubleshooting

- If the generator appears slow on first use, allow time for Pyodide and Python
  dependencies to download.
- If an Item is reported as unmatched, verify that an Item with the expected
  name and type exists in an enabled compendium.
- If available content has changed, run **Check compatibility** again.
- If Developer mode cannot load the project, select the current
  `cp_red_npc_generator` project directory again.
- If LM Studio requests fail, verify its server URL and CORS setting.

Technical errors are written to the browser console with the `NPC Generator |`
prefix.

## Related Project

- [Cyberpunk RED NPC Generator](https://github.com/n0lavar/cp_red_npc_generator)

## License

No license has been declared in this repository yet.

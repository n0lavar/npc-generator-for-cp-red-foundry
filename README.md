# NPC Generator for Cyberpunk RED

A Foundry Virtual Tabletop 12 module for generating Cyberpunk RED NPCs.

The module is intended to import characters produced by
[n0lavar/cp_red_npc_generator](https://github.com/n0lavar/cp_red_npc_generator)
into the Cyberpunk RED game system.

The current scaffold adds a **Generate NPC** button to the Actor Directory,
between the **Create Actor** and **Create Folder** controls. The button opens an
NPC customization and generation settings dialog.

The generator runs in a Web Worker through Pyodide. The module provides two
GM-only execution modes:

- **Bundled** installs the packaged generator wheel from `vendor/wheels/`.
- **Developer** asks for a local generator project through the browser File
  System Access API and imports its Python sources directly.

The first generation in a Foundry session downloads Pyodide and Python
dependencies, so it requires an internet connection and can take noticeably
longer than subsequent generations. For now, **Create Actor** generates an NPC
and writes the resulting object to the browser console; Foundry Actor creation
is not yet implemented.

## LM Studio and CORS

AI-generated descriptions can use an OpenAI-compatible LM Studio server. Since
the generator runs in the browser, LM Studio must allow cross-origin requests
from Foundry. Open **Developer > Server Settings** in LM Studio, enable
**Enable CORS**, and restart the server.

Alternatively, start the server with CORS enabled from the command line:

```powershell
lms server stop
lms server start --cors
```

Without CORS, the browser blocks requests from Foundry (normally
`http://localhost:30000`) to LM Studio (normally
`http://localhost:1234/v1`). Do not use `no-cors`: it produces an opaque
response that the generator cannot read. To generate an NPC without an AI
description, leave Model ID, Model API key, or Model base URL empty.

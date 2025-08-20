# Scenarios

Scenarios extend the Echo Platoon Intelligence Network with training exercises.
Files in this folder are served statically so avoid sensitive information.

## Sample scenarios
- `scenario-patrol.json` - single-node briefing (easy)
- `scenario-camp.json` - abandoned camp with encoded printouts (medium)
- `scenario-border.json` - multi-node frontier sweep (hard)
- `scenario-one.json` - training example with base64 and ROT13.

## JSON schema
A JSON scenario describes nodes, files and hints.

```json
{
  "id": "obsidian-vigil",
  "title": "OP OBSIDIAN VIGIL",
  "objective": "Find two 4-digit codes to unlock the trophy box.",
  "codes": { "alpha": "1847", "bravo": "9302" },
  "nodes": {
    "alpha": {
      "name": "raven-relay (alpha)",
      "banner": "Connected to ALPHA relay. Authorised users only.",
      "files": {
        "ops/encoded.msg": "Q09ERTogMTg0Nw==",
        "docs/notice.txt": "If intercepted: sensitive strings should be base64 in transit."
      }
    }
  },
  "hints": {
    "global": ["Use `scan`, then `connect alpha`."]
  }
}
```

## JS plugin
JavaScript scenarios export a default object with `id`, `title`, `objective` and `init(engine)`.
Use the engine API:

```js
engine.registerNode(id,{name,banner,files});
engine.onCommand(name, fn);
engine.setCodes({alpha,bravo});
engine.log(text[,class]);
engine.success();
engine.setHintContext(id);
engine.setHints(hints);
```

## Adding scenarios
1. Drop your `*.json` or `*.js` file here.
2. The landing page will attempt to list all files and read their metadata.
3. Ensure `id` is unique.

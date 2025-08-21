# Scenario Files

Scenario files define missions for the training terminal. Place each file in this directory and load it from the terminal using the `run` or `load` commands.

## JSON format

A scenario expressed in JSON should follow this structure:

```json
{
  "id": "sample-id",
  "title": "OP SAMPLE",
  "objective": "Find both codes.",
  "completeMessage": "Good work, team.",
  "codes": {"alpha": "1234", "bravo": "5678"},
  "nodes": {
    "alpha": {
      "name": "alpha node",
      "banner": "Connected to ALPHA node.",
      "grid": "31U DQ 48251 11932",
      "ip": "10.2.3.112",
      "visible": true,
      "files": {
        "path/to/file.txt": "File contents",
        "images/map.svg": {"image": "img/bg-topo-map.svg", "caption": "Area map"}
      }
    },
    "bravo": {
      "name": "bravo node",
      "banner": "Connected to BRAVO node.",
      "grid": "31U DQ 48800 11800",
      "visible": true,
      "files": {
        "path/to/file.txt": "File contents"
      }
    }
  }
}
```

`ip` lets players connect using a fictitious IPv4 address. If `visible` is not set to `true` the node's name and identifier remain hidden in the interface.

## Text format

Scenarios can also be written as simple `key=value` text files using dot notation for nested keys:

```
id=sample-text
title=OP TEXT SAMPLE
objective=Demonstrate text scenarios
codes.alpha=1234
codes.bravo=5678
nodes.alpha.name=alpha node
nodes.alpha.banner=Connected to ALPHA
nodes.alpha.grid=31U DQ 48251 11932
nodes.alpha.ip=10.2.3.112
nodes.alpha.files.ops/encoded.msg=Q09ERTogMTIzNA==
nodes.alpha.files.images/map.svg.image=img/bg-topo-map.svg
nodes.bravo.name=bravo node
nodes.bravo.banner=Connected to BRAVO
nodes.bravo.grid=31U DQ 48800 11800
nodes.bravo.files.intel/msg.enc=PBQR: 5678
nodes.alpha.visible=true
nodes.bravo.visible=true
```

## Running

From the terminal:

```
run scenario-two.json
load scenario-four.txt
```

The terminal loads files from this directory, so only the file name is required.

#!/usr/bin/env python3
"""Builds AnimeDraft.rbxlx (a Roblox place file) straight from src/, no Rojo needed.

Usage (from animedraft-roblox/):  python3 scripts/build-place.py
Mapping matches default.project.json:
  src/shared  -> ReplicatedStorage.Shared               (ModuleScripts)
  src/server  -> ServerScriptService.Server              (*.server.luau = Script, others ModuleScript)
  src/client  -> StarterPlayer.StarterPlayerScripts.Client (*.client.luau = LocalScript)
"""
from pathlib import Path
from xml.sax.saxutils import escape
import itertools

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build" / "AnimeDraft.rbxlx"
ids = itertools.count(1)


def ref() -> str:
    return f"RBX{next(ids):08X}"


def cdata(src: str) -> str:
    return "<![CDATA[" + src.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def item(cls: str, name: str, children: str = "", source: str | None = None) -> str:
    props = f'<string name="Name">{escape(name)}</string>'
    if source is not None:
        props += f'<ProtectedString name="Source">{cdata(source)}</ProtectedString>'
    return f'<Item class="{cls}" referent="{ref()}"><Properties>{props}</Properties>{children}</Item>\n'


def script_for(path: Path) -> str:
    name = path.name
    for suffix, cls in ((".server.luau", "Script"), (".client.luau", "LocalScript"), (".luau", "ModuleScript")):
        if name.endswith(suffix):
            return item(cls, name[: -len(suffix)], source=path.read_text(encoding="utf-8"))
    return ""


def folder(name: str, directory: Path) -> str:
    kids = "".join(script_for(p) for p in sorted(directory.glob("*.luau")))
    return item("Folder", name, kids)


place = (
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" version="4">\n'
    + item("ReplicatedStorage", "ReplicatedStorage", folder("Shared", ROOT / "src/shared"))
    + item("ServerScriptService", "ServerScriptService", folder("Server", ROOT / "src/server"))
    + item("StarterPlayer", "StarterPlayer", item("StarterPlayerScripts", "StarterPlayerScripts", folder("Client", ROOT / "src/client")))
    + "</roblox>\n"
)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(place, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")

"""Call the actual local Ouroboros MCP server; this does not implement a loop."""
import asyncio
import json
from pathlib import Path
import sys
from mcp import Client

sys.stdout.reconfigure(encoding="utf-8")

async def main():
    name, input_path, output_path = sys.argv[1:4]
    arguments = json.loads(Path(input_path).read_text(encoding="utf-8-sig"))
    async with Client("http://127.0.0.1:8765/mcp", read_timeout_seconds=7200) as client:
        registry = await client.list_tools()
        if name not in {tool.name for tool in registry.tools}:
            raise RuntimeError(f"Tool not registered: {name}")
        response = await client.call_tool(name, arguments, read_timeout_seconds=7200)
        payload = response.model_dump(mode="json", by_alias=True)
        Path(output_path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        meta = payload.get("_meta", {})
        compact = {k: v for k, v in meta.items() if "advisory" not in k and k not in ("_subagents", "orchestrate_subagents")}
        print(json.dumps({"isError": payload.get("isError"), "meta": compact}, ensure_ascii=False)[:16000])
        for part in payload.get("content", []):
            if part.get("type") == "text":
                value = part.get("text", "")
                print(value.split("<!--")[0][:10000])

asyncio.run(main())

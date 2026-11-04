#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")" && pwd)}"
cd "$PROJECT_DIR"
PORT="${PORT:-3000}"
STATIC_DIR="$PROJECT_DIR/dist"

/usr/bin/time -p npm install --ignore-scripts --no-audit --no-fund
/usr/bin/time -p npm run build
/usr/bin/time -p mkdir -p "${OPENCODE_WEB_DIR:?OPENCODE_WEB_DIR must be set}"
/usr/bin/time -p node -e 'const fs=require("node:fs"); const path=require("node:path"); const project=path.resolve(process.argv[1]); const directory=path.resolve(process.argv[2]); if (!directory.startsWith(project + path.sep)) throw new Error("Built directory must be inside project"); fs.writeFileSync(process.env.OPENCODE_WEB_DIR + "/deployment-output.json", JSON.stringify({project, directory}) + "\n");' "$PROJECT_DIR" "$STATIC_DIR"
/usr/bin/time -p python3 -m http.server "$PORT" --directory "$STATIC_DIR" --bind 0.0.0.0

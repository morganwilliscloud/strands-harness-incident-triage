set -eu

mkdir -p .build
npm run check
npm run build
package_dir=$(mktemp -d .build/package.XXXXXX)
cp package.json package-lock.json "$package_dir/"
npm ci --prefix "$package_dir" --omit=dev --ignore-scripts --os=linux --cpu=arm64 --libc=glibc --no-fund --no-audit
cp dist/agent.js "$package_dir/agent.js"
cp -R .agent "$package_dir/.agent"
package_path=$(cd "$package_dir" && pwd)
archive_path="$(pwd)/.build/agent-$(date -u +%Y%m%dT%H%M%SZ).zip"
python3 -I -S - "$package_path" "$archive_path" <<'PY'
import pathlib
import sys
import zipfile

root = pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            archive.write(path, path.relative_to(root))
PY
printf '%s\n' "$archive_path" > .build/archive-path
printf '%s\n' "$archive_path"

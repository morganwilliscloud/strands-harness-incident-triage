set -eu

mkdir -p .build
package_dir=$(mktemp -d .build/package.XXXXXX)
uv pip install \
  --python-version 3.12 \
  --python-platform aarch64-manylinux_2_28 \
  --only-binary :all: \
  --target "$package_dir" \
  -r requirements.txt
cp agent.py "$package_dir/agent.py"
cp -R .agent "$package_dir/.agent"
package_path=$(cd "$package_dir" && pwd)
archive_path="$(pwd)/.build/agent-$(date -u +%Y%m%dT%H%M%SZ).zip"
uv run --no-project --python 3.12 python - "$package_path" "$archive_path" <<'PY'
import pathlib
import sys
import zipfile

root = pathlib.Path(sys.argv[1])
aws = root / "bin" / "aws"
aws.write_bytes(b"#!/usr/bin/env python3\n" + aws.read_bytes().split(b"\n", 1)[1])
aws.chmod(0o755)
with zipfile.ZipFile(sys.argv[2], "w", zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            archive.write(path, path.relative_to(root))
PY
printf '%s\n' "$archive_path" > .build/archive-path
printf '%s\n' "$archive_path"

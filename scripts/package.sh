set -eu

mkdir -p .build
npm run check
npm run build
package_dir=$(mktemp -d .build/package.XXXXXX)
cp package.json package-lock.json "$package_dir/"
npm ci --prefix "$package_dir" --omit=dev --ignore-scripts --os=linux --cpu=arm64 --libc=glibc --no-fund --no-audit
cp dist/agent.js "$package_dir/agent.js"
cp observability.cjs "$package_dir/observability.cjs"
cp -R .agent "$package_dir/.agent"
package_path=$(cd "$package_dir" && pwd)
archive_path="$(pwd)/.build/agent-$(date -u +%Y%m%dT%H%M%SZ).zip"
(cd "$package_path" && zip -q -r "$archive_path" .)
printf '%s\n' "$archive_path" > .build/archive-path
printf '%s\n' "$archive_path"

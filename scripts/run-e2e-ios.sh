#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$PATH:$HOME/.maestro/bin"

DEV_MODE=false
if [ "${1:-}" = "--dev" ]; then
  DEV_MODE=true
  shift
fi

SIMULATOR_NAME="${1:-iPhone 17}"
DERIVED_DATA="$ROOT_DIR/ios/build/e2e"

if [ "$DEV_MODE" = true ]; then
  CONFIGURATION="Debug"
  APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/ScoreBoard.app"
else
  CONFIGURATION="Release"
  APP_PATH="$DERIVED_DATA/Build/Products/Release-iphonesimulator/ScoreBoard.app"
fi

echo "=== ScoreBoard Mobile iOS E2E Automation (Maestro) ==="

# 1. Check if xcrun is available
if ! command -v xcrun &> /dev/null; then
  echo "Error: xcrun not found. Please install Xcode Command Line Tools."
  exit 1
fi

# 2. Check if maestro is available
if ! command -v maestro &> /dev/null; then
  echo "Error: maestro not found. Run: curl -fsSL 'https://get.maestro.mobile.dev' | bash"
  exit 1
fi

# 3. Find or boot an iOS Simulator
UDID=$(xcrun simctl list devices booted | grep -E -o '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -n 1 || true)

if [ -z "$UDID" ]; then
  UDID=$(xcrun simctl list devices available | grep -F "    $SIMULATOR_NAME (" | grep -E -o '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -n 1 || true)
  if [ -z "$UDID" ]; then
    UDID=$(xcrun simctl list devices available | grep -E "    iPhone " | grep -E -o '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}' | head -n 1 || true)
  fi
  if [ -z "$UDID" ]; then
    echo "Error: No available iOS iPhone Simulator found."
    exit 1
  fi
  echo "Booting iOS Simulator ($UDID)..."
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
else
  echo "iOS Simulator is already booted ($UDID)."
fi

open -a Simulator || true

# 4. Build and install .app
METRO_PID=""
if [ "$DEV_MODE" = true ]; then
  echo "Building Debug iOS Simulator app (__DEV__=true, local Supabase)..."
  (
    cd "$ROOT_DIR/ios" && \
    xcodebuild -workspace ScoreBoard.xcworkspace \
      -scheme ScoreBoard \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "id=$UDID" \
      -derivedDataPath "$DERIVED_DATA" \
      CODE_SIGNING_ALLOWED=NO \
      -quiet \
      build
  )
else
  echo "Building Release iOS Simulator app with local Supabase configuration..."
  rm -f "$APP_PATH/main.jsbundle"
  (
    cd "$ROOT_DIR/ios" && \
    EXPO_PUBLIC_E2E_LOCAL="true" \
    EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
    EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}" \
    xcodebuild -workspace ScoreBoard.xcworkspace \
      -scheme ScoreBoard \
      -configuration Release \
      -sdk iphonesimulator \
      -destination "id=$UDID" \
      -derivedDataPath "$DERIVED_DATA" \
      CODE_SIGNING_ALLOWED=NO \
      -quiet \
      build
  )
fi

echo "Installing app: $APP_PATH"
xcrun simctl install "$UDID" "$APP_PATH"

# 5. Cleanup trap ensuring test data & background Metro are purged even on failure/interrupt
cleanup() {
  if [ -n "$METRO_PID" ]; then
    kill "$METRO_PID" 2>/dev/null || true
  fi
  echo "Running E2E cleanup..."
  node "$SCRIPT_DIR/cleanup-e2e.js" || true
}
trap cleanup EXIT

if [ "$DEV_MODE" = true ]; then
  echo "Starting Metro bundler targeting local Supabase (http://127.0.0.1:54321)..."
  (
    cd "$ROOT_DIR" && \
    EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
    EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}" \
    npx expo start --port 8081 --non-interactive > /tmp/scoreboard-metro-ios-e2e.log 2>&1
  ) &
  METRO_PID=$!

  echo "Waiting for Metro bundler on port 8081..."
  for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8081/status | grep -q "packager-status:running"; then
      break
    fi
    sleep 1
  done

  echo "Warming up iOS JS bundle in Metro..."
  curl -sf "http://127.0.0.1:8081/index.bundle?platform=ios&dev=true&minify=false" -o /dev/null || true
fi

# 6. Run Maestro flows against the booted iOS Simulator
echo "Running Maestro E2E test flows on iOS Simulator ($UDID)..."
cd "$ROOT_DIR"
maestro --device "$UDID" test .maestro/

echo "=== iOS E2E Tests Completed Successfully ==="

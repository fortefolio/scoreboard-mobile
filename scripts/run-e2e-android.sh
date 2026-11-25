#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$PATH:$HOME/.maestro/bin:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"

DEV_MODE=false
if [ "${1:-}" = "--dev" ]; then
  DEV_MODE=true
  shift
fi

EMULATOR_NAME="${1:-Medium_Phone_API_36.1}"
if [ "$DEV_MODE" = true ]; then
  APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
else
  APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
fi

echo "=== ScoreBoard Mobile E2E Automation (Maestro) ==="

# 1. Check if adb is available
if ! command -v adb &> /dev/null; then
  echo "Error: adb not found. Please ensure Android SDK platform-tools is installed."
  exit 1
fi

# 2. Check if maestro is available
if ! command -v maestro &> /dev/null; then
  echo "Error: maestro not found. Run: curl -fsSL 'https://get.maestro.mobile.dev' | bash"
  exit 1
fi

# 3. Check for running devices
DEVICE_COUNT=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')

if [ "$DEVICE_COUNT" -eq "0" ]; then
  echo "No active Android device found. Booting emulator '$EMULATOR_NAME'..."
  EMULATOR_BIN="$HOME/Library/Android/sdk/emulator/emulator"
  if [ ! -f "$EMULATOR_BIN" ]; then
    EMULATOR_BIN="emulator"
  fi
  
  nohup "$EMULATOR_BIN" -avd "$EMULATOR_NAME" -no-snapshot-load -no-audio > /dev/null 2>&1 &
  echo "Waiting for emulator to connect to adb..."
  adb wait-for-device
  
  echo "Waiting for device to complete boot..."
  while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
    sleep 2
  done
  echo "Emulator booted successfully!"
else
  echo "Android device/emulator is already active."
fi

# 4. Bring emulator window to front on macOS so you can see it
osascript -e 'tell application "System Events" to set frontmost of first process whose name contains "qemu" to true' 2>/dev/null || true

# 5. Build and install APK
METRO_PID=""
if [ "$DEV_MODE" = true ]; then
  echo "Building debug APK (__DEV__=true, local Supabase)..."
  (cd "$ROOT_DIR/android" && ./gradlew assembleDebug)
else
  echo "Building release APK with local Supabase configuration (-Pe2eLocal=true)..."
  rm -f "$ROOT_DIR/android/app/build/generated/assets/react/release/index.android.bundle"
  (
    cd "$ROOT_DIR/android" && \
    EXPO_PUBLIC_E2E_LOCAL="true" \
    EXPO_PUBLIC_SUPABASE_URL="http://10.0.2.2:54321" \
    EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}" \
    ./gradlew assembleRelease -Pe2eLocal=true
  )
fi

echo "Installing APK: $APK_PATH"
adb install -r "$APK_PATH"

# 6. Cleanup trap ensuring test data & background Metro are purged even on failure/interrupt
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
  adb reverse tcp:8081 tcp:8081
  (
    cd "$ROOT_DIR" && \
    EXPO_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321" \
    EXPO_PUBLIC_SUPABASE_ANON_KEY="${EXPO_PUBLIC_SUPABASE_ANON_KEY:-sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH}" \
    npx expo start --port 8081 --non-interactive > /tmp/scoreboard-metro-e2e.log 2>&1
  ) &
  METRO_PID=$!

  echo "Waiting for Metro bundler on port 8081..."
  for i in $(seq 1 30); do
    if curl -sf http://127.0.0.1:8081/status | grep -q "packager-status:running"; then
      break
    fi
    sleep 1
  done

  echo "Warming up Android JS bundle in Metro..."
  curl -sf "http://127.0.0.1:8081/index.bundle?platform=android&dev=true&minify=false" -o /dev/null || true
fi

# 7. Run Maestro flows
echo "Running Maestro E2E test flows..."
cd "$ROOT_DIR"
maestro test .maestro/

echo "=== E2E Tests Completed Successfully ==="

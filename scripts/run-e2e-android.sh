#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$PATH:$HOME/.maestro/bin:$HOME/Library/Android/sdk/platform-tools:$HOME/Library/Android/sdk/emulator"

EMULATOR_NAME="${1:-Medium_Phone_API_36.1}"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

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
  
  "$EMULATOR_BIN" -avd "$EMULATOR_NAME" -no-snapshot-load -no-audio &
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
echo "Building release APK with local Supabase configuration..."
(cd "$ROOT_DIR/android" && ./gradlew assembleRelease)

echo "Installing APK: $APK_PATH"
adb install -r "$APK_PATH"

# 6. Run Maestro flows
echo "Running Maestro E2E test flows..."
cd "$ROOT_DIR"
maestro test .maestro/

echo "=== E2E Tests Completed Successfully ==="

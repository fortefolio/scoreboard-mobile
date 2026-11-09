/**
 * Patches expo-modules-jsi for Swift 6 / Xcode 26.3 concurrency compatibility.
 * Replaces nonisolated(unsafe) pointer cross-actor sending with Sendable rawAddress.
 */
const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(
  __dirname,
  '../node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptObject.swift'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  const targetSnippet = `    // The isolated closure below runs synchronously on this thread.
    nonisolated(unsafe) let slot = buffer.baseAddress!
    expo.emplaceUndefined(slot)
    defer {
      expo.destroyValues(slot, 1)
    }
    // The runtime can't be deallocated during a call on its JavaScript thread, so it's borrowed without
    // a retain.
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        try encode(JavaScriptValue.Slot(slot), runtime)
      }
    }
    body(slot.pointee)`;

  const replacementSnippet = `    let rawAddress = Int(bitPattern: buffer.baseAddress!)
    let slot = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: rawAddress)!
    expo.emplaceUndefined(slot)
    defer {
      expo.destroyValues(slot, 1)
    }
    // The runtime can't be deallocated during a call on its JavaScript thread, so it's borrowed without
    // a retain.
    try runtime._withUnsafeGuaranteedRef { runtime in
      try JavaScriptActor.assumeIsolated {
        let isolatedSlot = UnsafeMutablePointer<facebook.jsi.Value>(bitPattern: rawAddress)!
        try encode(JavaScriptValue.Slot(isolatedSlot), runtime)
      }
    }
    body(slot.pointee)`;

  if (content.includes(targetSnippet)) {
    content = content.replace(targetSnippet, replacementSnippet);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[patch] Successfully patched expo-modules-jsi for Swift 6 concurrency.');
  } else {
    console.log('[patch] expo-modules-jsi already patched or snippet not found.');
  }
}

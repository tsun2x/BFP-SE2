const { withMainApplication, withAndroidManifest } = require("expo/config-plugins");

/**
 * Expo config plugin for @twilio/voice-react-native-sdk
 *
 * The SDK's native Android code expects:
 * 1. VoiceApplicationProxy.onCreate(this) called in Application.onCreate()
 * 2. VoiceApplicationProxy.onTerminate() called in Application.onTerminate()
 * 3. The import for com.twiliovoicereactnative.VoiceApplicationProxy
 *
 * NOTE: Expo SDK 54+ generates MainApplication.kt (Kotlin), not .java
 */

function withTwilioVoiceApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    // 1. Add Kotlin import if not present
    const importLine =
      "import com.twiliovoicereactnative.VoiceApplicationProxy";
    if (!contents.includes(importLine)) {
      const lines = contents.split("\n");
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trimStart().startsWith("import ")) {
          lastImportIdx = i;
        }
      }
      if (lastImportIdx >= 0) {
        lines.splice(lastImportIdx + 1, 0, importLine);
      } else {
        const pkgIdx = lines.findIndex((l) => l.startsWith("package "));
        lines.splice(pkgIdx >= 0 ? pkgIdx + 1 : 0, 0, "", importLine);
      }
      contents = lines.join("\n");
    }

    // 2. Add voiceApplicationProxy instance property in the class body
    //    VoiceApplicationProxy is NOT static — needs to be instantiated
    if (!contents.includes("voiceApplicationProxy")) {
      contents = contents.replace(
        "class MainApplication : Application(), ReactApplication {",
        "class MainApplication : Application(), ReactApplication {\n\n  private lateinit var voiceApplicationProxy: VoiceApplicationProxy"
      );
    }

    // 3. Initialize the proxy and call onCreate in Application.onCreate()
    if (!contents.includes("voiceApplicationProxy = VoiceApplicationProxy")) {
      contents = contents.replace(
        "super.onCreate()",
        "super.onCreate()\n    voiceApplicationProxy = VoiceApplicationProxy(this)\n    voiceApplicationProxy.onCreate()"
      );
    }

    // 4. Add onTerminate override if not present (Kotlin syntax)
    if (!contents.includes("voiceApplicationProxy.onTerminate")) {
      const lastBrace = contents.lastIndexOf("}");
      const onTerminateMethod = `
  override fun onTerminate() {
    voiceApplicationProxy.onTerminate()
    super.onTerminate()
  }

`;
      contents =
        contents.slice(0, lastBrace) +
        onTerminateMethod +
        contents.slice(lastBrace);
    }

    config.modResults.contents = contents;
    return config;
  });
}

function withTwilioVoiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // Ensure RECORD_AUDIO and MODIFY_AUDIO_SETTINGS permissions are present
    const permissions = [
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.BLUETOOTH",
      "android.permission.BLUETOOTH_CONNECT",
    ];

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    for (const perm of permissions) {
      const exists = manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === perm
      );
      if (!exists) {
        manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    return config;
  });
}

module.exports = function withTwilioVoice(config) {
  config = withTwilioVoiceApplication(config);
  config = withTwilioVoiceManifest(config);
  return config;
};

const { withMainApplication, withAndroidManifest } = require("expo/config-plugins");

function withTwilioVoiceApplication(config) {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;

    const importLine = "import com.twiliovoicereactnative.VoiceApplicationProxy";
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

    if (!contents.includes("voiceApplicationProxy")) {
      contents = contents.replace(
        "class MainApplication : Application(), ReactApplication {",
        "class MainApplication : Application(), ReactApplication {\n\n  private lateinit var voiceApplicationProxy: VoiceApplicationProxy",
      );
    }

    if (!contents.includes("voiceApplicationProxy = VoiceApplicationProxy")) {
      contents = contents.replace(
        "super.onCreate()",
        "super.onCreate()\n    voiceApplicationProxy = VoiceApplicationProxy(this)\n    voiceApplicationProxy.onCreate()",
      );
    }

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
        (p) => p.$?.["android:name"] === perm,
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

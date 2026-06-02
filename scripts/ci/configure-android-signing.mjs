import { readFileSync, writeFileSync } from "node:fs";

const paths = {
  manifest: "apps/desktop/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
  gradle: "apps/desktop/src-tauri/gen/android/app/build.gradle.kts",
};

function enableCleartextTraffic() {
  let manifest = readFileSync(paths.manifest, "utf8");
  if (manifest.includes("android:usesCleartextTraffic")) {
    return;
  }

  manifest = manifest.replace(
    /<application\b/,
    '<application android:usesCleartextTraffic="true"',
  );
  writeFileSync(paths.manifest, manifest);
}

function ensureGradleImports(gradle) {
  const imports = [];
  if (!gradle.includes("import java.io.FileInputStream")) {
    imports.push("import java.io.FileInputStream");
  }
  if (!gradle.includes("import java.util.Properties")) {
    imports.push("import java.util.Properties");
  }

  return imports.length > 0 ? `${imports.join("\n")}\n${gradle}` : gradle;
}

function ensureSigningConfig(gradle) {
  if (gradle.includes("signingConfigs")) {
    return gradle;
  }

  const signingConfig = `    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }

`;

  return gradle.replace(/android\s*\{\s*/, (match) => `${match}\n${signingConfig}`);
}

function attachReleaseSigning(gradle) {
  const releaseSigningPattern =
    /signingConfig\s*=\s*signingConfigs\.getByName\("release"\)/;
  if (releaseSigningPattern.test(gradle)) {
    return gradle;
  }

  const next = gradle.replace(
    /getByName\("release"\)\s*\{\s*/,
    (match) => `${match}\n            signingConfig = signingConfigs.getByName("release")\n`,
  );
  if (next === gradle) {
    throw new Error("Could not find Gradle release buildType to attach Android signing config.");
  }

  return next;
}

function configureGradleSigning() {
  let gradle = readFileSync(paths.gradle, "utf8");
  gradle = ensureGradleImports(gradle);
  gradle = ensureSigningConfig(gradle);
  gradle = attachReleaseSigning(gradle);
  writeFileSync(paths.gradle, gradle);
}

enableCleartextTraffic();
configureGradleSigning();

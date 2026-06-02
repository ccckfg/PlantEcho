import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const paths = {
  manifest: "apps/desktop/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
  gradle: "apps/desktop/src-tauri/gen/android/app/build.gradle.kts",
  sourceIcons: "apps/desktop/src-tauri/icons/android",
  targetRes: "apps/desktop/src-tauri/gen/android/app/src/main/res",
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

function syncAndroidIcons() {
  if (!existsSync(paths.sourceIcons)) {
    throw new Error("Android icon resources are missing. Run `tauri icon` first.");
  }

  cpSync(paths.sourceIcons, paths.targetRes, {
    recursive: true,
    force: true,
  });
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

function ensureAbiSplits(gradle) {
  if (gradle.includes("isUniversalApk = true")) {
    return gradle;
  }

  const abiSplits = `    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a", "x86_64")
            isUniversalApk = true
        }
    }

`;

  return gradle.replace(/android\s*\{\s*/, (match) => `${match}\n${abiSplits}`);
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
  gradle = ensureAbiSplits(gradle);
  gradle = attachReleaseSigning(gradle);
  writeFileSync(paths.gradle, gradle);
}

enableCleartextTraffic();
syncAndroidIcons();
configureGradleSigning();

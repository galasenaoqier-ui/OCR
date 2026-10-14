# 殷契拾文 Android App

React Native + Expo Development Build mobile shell for the existing Web research platform.

## Run

```bash
npm install
npx expo install
npm run typecheck
npm start
npm run android
```

The first mobile slice contains the home screen, dark AI recognition workbench, recognition result screen, glyph library and glyph detail. The recognition adapter intentionally reports an explicit auxiliary-matching state until the native ONNX compatibility probe is verified in a Development Build.

Android minimum SDK is API 29. Camera and media permissions are requested only when the user chooses an input source.

`adapters/nativeModelProbe.ts` is the Development Build boundary for `onnxruntime-react-native`. It reports input/output node names and only returns `ready` after the bundled model can be opened. Until that probe is wired to the packaged model asset, the UI intentionally labels recognition as auxiliary matching.

Metro is configured to watch `packages/core` and resolve the `@yinqi/core` alias during local development and Android builds.

## Build an Android package

For an installable APK, run:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npm run build:android:preview
```

Open the build URL printed by EAS on the phone and install the downloaded `.apk`.

For Google Play submission, build an AAB instead:

```bash
npm run build:android:production
```

Local builds require Android Studio, Android SDK API 29+, Java and Gradle. With those installed, use `npm run android` for a debug Development Build.

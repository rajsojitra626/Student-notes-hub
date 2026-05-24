# Student Notes Hub — mobile app

Android-focused Expo app. Web is not required for distribution.

## Setup

```bash
cd mobile-app
npm install
```

## Run on a device or emulator

```bash
npx expo start --android
```

## EAS builds (APK / Play AAB)

1. Install EAS CLI and log in: `npm i -g eas-cli` then `eas login`.
2. From `mobile-app/`, run `eas build:configure` once if `eas.json` is new to your Expo project.
3. Builds:
   - **Internal APK (side load / download link):** `eas build -p android --profile preview-apk`
   - **Play Store bundle:** `eas build -p android --profile production`

After a successful build, download the artifact from Expo and (optionally) place the APK at `../backend/releases/student-notes-hub.apk` for the API routes in `backend/routes/app_release.py`.

## Version alignment

Match `expo.android.versionCode` / `version` in `app.json` with backend env `ANDROID_VERSION_CODE` / `ANDROID_VERSION_NAME` in `backend/.env` when you publish a new APK through the API.

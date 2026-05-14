import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.justinwallet.app',
    appName: 'Justin',
    webDir: 'dist',
    // Bundle the web app inside the iOS app for true offline launch.
    // No remote URL — the WebView loads the built assets from disk.
    server: {
        // 'capacitor://localhost' on iOS is the default; keep it explicit
        // so any future Cleartext-style sub-resources are obvious.
        iosScheme: 'capacitor',
    },
    ios: {
        // iOS 13+ is required by Capacitor 8.
        contentInset: 'always',
        // Allow camera permission prompts to be re-requested after the user
        // initially denies them (until they navigate to system Settings).
        limitsNavigationsToAppBoundDomains: false,
    },
};

export default config;

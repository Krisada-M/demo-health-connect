const { withAndroidManifest, withMainActivity, withPlugins } = require('@expo/config-plugins');

const withHealthConnectManifest = (config) => {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const mainApplication = manifest.manifest.application[0];

        // Add Permissions
        if (!manifest.manifest['uses-permission']) {
            manifest.manifest['uses-permission'] = [];
        }

        const permissions = [
            'android.permission.health.READ_STEPS',
            'android.permission.health.WRITE_STEPS', // Optional, but good for completeness in demo
            'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND', // Often needed
        ];

        permissions.forEach(permission => {
            if (!manifest.manifest['uses-permission'].some(p => p.$['android:name'] === permission)) {
                manifest.manifest['uses-permission'].push({ $: { 'android:name': permission } });
            }
        });

        // Add Activity Alias for Health Connect Rationale (Android 14+)
        // This is required to show the system UI for permissions
        if (!mainApplication['activity-alias']) {
            mainApplication['activity-alias'] = [];
        }

        // Check if alias already exists to avoid dupes
        const aliasName = 'UIPermissionActivityAlias'; // Arbitrary name
        const existing = mainApplication['activity-alias'].find(a => a.$['android:name'].includes(aliasName));

        if (!existing) {
            mainApplication['activity-alias'].push({
                $: {
                    'android:name': 'ViewPermissionUsageActivity',
                    'android:exported': 'true',
                    'android:targetActivity': '.MainActivity', // Assuming standard MainActivity
                    'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
                },
                'intent-filter': [
                    {
                        'action': [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
                        'category': [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
                    },
                ],
            });
        }

        return config;
    });
};

const withHealthConnectMainActivity = (config) => {
    return withMainActivity(config, async (config) => {
        const src = config.modResults.contents;

        // Add imports
        const imports = [
            'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate',
            'import android.os.Bundle' // likely needed if not present
        ];

        let newSrc = src;

        // Naive import injection
        if (!newSrc.includes('HealthConnectPermissionDelegate')) {
            const packageMatch = newSrc.match(/package\s+[\w.]+;/);
            if (packageMatch) {
                newSrc = newSrc.replace(packageMatch[0], `${packageMatch[0]}\n\n${imports.join('\n')}`);
            }
        }

        // Modify onCreate
        // Needed: HealthConnectPermissionDelegate.setPermissionDelegate(this)
        if (!newSrc.includes('HealthConnectPermissionDelegate.setPermissionDelegate(this)')) {
            // Look for super.onCreate(...)
            // We might need to ensure onCreate exists if it's a bare template, but Expo managed usually has it.
            // Actually, Expo managed MainActivity (via template) usually inherits from ReactActivity and has onCreate.
            // Detailed regex might be needed, but for a demo, simple replacement often works.

            const onCreateMatch = newSrc.match(/super\.onCreate\((.*)\);/);
            if (onCreateMatch) {
                newSrc = newSrc.replace(onCreateMatch[0], `${onCreateMatch[0]}\n    HealthConnectPermissionDelegate.setPermissionDelegate(this);`);
            }
        }

        config.modResults.contents = newSrc;
        return config;
    });
};

const withHealthConnect = (config) => {
    return withPlugins(config, [
        withHealthConnectManifest,
        withHealthConnectMainActivity,
    ]);
};

module.exports = withHealthConnect;

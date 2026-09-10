import { AppState, Linking, Permission, PermissionsAndroid, Platform } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PermissionResult = 'granted' | 'denied' | 'never_ask_again';

// ─── Permission list (mirrors legacy SplashActivity.checkAndRequestPermissions) ─

/**
 * Returns the runtime permissions required for this API level.
 *
 * API ≥ 33 (Tiramisu): READ_EXTERNAL_STORAGE + WRITE_EXTERNAL_STORAGE are
 *   replaced by READ_MEDIA_IMAGES and POST_NOTIFICATIONS is newly required.
 * API ≤ 32: classic READ/WRITE_EXTERNAL_STORAGE.
 *
 * READ_CONTACTS: needed for account auto-complete / patient matching.
 * CAMERA: patient photo capture, ward verification.
 */
function buildRequiredPermissions(): Permission[] {
  const perms: Permission[] = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  ];

  // Platform.Version is `number` on Android at runtime; cast needed because
  // the TS type is `string | number` to cover both Android (number) and iOS (string).
  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;

  if (apiLevel >= 33) {
    // Android 13+ — granular media + notifications
    perms.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
    perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } else {
    // Android 12 and below — legacy storage permissions
    perms.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
    perms.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  }

  return perms;
}

// ─── Core request ─────────────────────────────────────────────────────────────

/**
 * Requests all required permissions as a single batch.
 * Returns:
 *   'granted'         — every permission is granted
 *   'never_ask_again' — at least one is permanently denied (open Settings required)
 *   'denied'          — at least one is denied but can be re-requested
 */
export async function requestAppPermissions(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') {
    // iOS permissions are requested lazily by each feature (camera, contacts, etc.)
    return 'granted';
  }

  const permissions = buildRequiredPermissions();
  const results = await PermissionsAndroid.requestMultiple(permissions);

  let hasNeverAskAgain = false;
  let hasDenied = false;

  for (const status of Object.values(results)) {
    if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      hasNeverAskAgain = true;
    } else if (status === PermissionsAndroid.RESULTS.DENIED) {
      hasDenied = true;
    }
  }

  if (!hasNeverAskAgain && !hasDenied) return 'granted';
  if (hasNeverAskAgain) return 'never_ask_again';
  return 'denied';
}

/**
 * Checks current permission status without showing any system dialog.
 * Used when returning from the Settings app to see if the user granted manually.
 */
export async function checkAppPermissions(): Promise<PermissionResult> {
  if (Platform.OS !== 'android') return 'granted';

  const permissions = buildRequiredPermissions();

  for (const perm of permissions) {
    const granted = await PermissionsAndroid.check(perm);
    if (!granted) {
      // After returning from Settings, any un-granted permission is treated as
      // permanently denied since the system won't show the dialog again.
      return 'never_ask_again';
    }
  }

  return 'granted';
}

// ─── Settings deep-link ───────────────────────────────────────────────────────

/** Opens the app's Settings page so the user can grant permanently-denied permissions. */
export function openAppSettings(): void {
  Linking.openSettings();
}

// ─── AppState helper ──────────────────────────────────────────────────────────

/**
 * Subscribes to AppState changes and calls `onForeground` each time the app
 * comes back to the foreground. Returns an unsubscribe function.
 */
export function onAppForeground(onForeground: () => void): () => void {
  const subscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') onForeground();
  });
  return () => subscription.remove();
}

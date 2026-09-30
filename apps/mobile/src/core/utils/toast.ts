import { Platform, ToastAndroid } from 'react-native';

/** Android-only short toast — mirrors the Android app's Toast.makeText(...).show() calls. */
export function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

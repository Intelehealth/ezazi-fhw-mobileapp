import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BrandAppBar } from '@/core/ui/BrandAppBar';

/**
 * The only two header presets. A navigator group picks the default its screens
 * mostly need; an exception overrides it with one `options={…}` on the screen.
 */
export const brandAppBar: NativeStackNavigationOptions = {
  headerShown: true,
  header: () => <BrandAppBar />,
};

export const noHeader: NativeStackNavigationOptions = {
  headerShown: false,
};

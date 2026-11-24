import React from 'react';
import { Image, StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, dimens } from '@/core/config/theme';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * The registration avatar — a circle, a camera badge and "Add a picture".
 * One touch target: the frame has no remove control and neither does the
 * legacy, so tapping anywhere just reopens the chooser and replaces.
 * The empty state is the registry's own `person` glyph, not a new icon.
 */
interface ProfilePhotoFieldProps {
  /** A file uri. Absent until a capture resolves; null is the empty state. */
  photoPath?: string | null;
  onPress: () => void;
  /** Placement only (margins) — never colors or sizing. */
  containerStyle?: StyleProp<ViewStyle>;
}

/** Figma draws the glyph at roughly 40% of the circle. */
const EMPTY_GLYPH_RATIO = 0.4;

export const ProfilePhotoField: React.FC<ProfilePhotoFieldProps> = ({
  photoPath,
  onPress,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const { fs, isTablet, scale } = useResponsive();

  const size = isTablet ? scale(dimens.registrationAvatar.tablet) : dimens.registrationAvatar.phone;
  const badge = isTablet
    ? scale(dimens.registrationPhotoBadge.tablet)
    : dimens.registrationPhotoBadge.phone;
  const captionGap = isTablet
    ? scale(dimens.registrationPhotoCaptionGap.tablet)
    : dimens.registrationPhotoCaptionGap.phone;

  const circle = { width: size, height: size, borderRadius: size / 2 };
  const caption = t('patient.personal.addPicture');

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={caption}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, circle]}>
          {photoPath ? (
            <Image source={{ uri: photoPath }} style={circle} resizeMode="cover" />
          ) : (
            <AppIcon
              name="person"
              size={Math.round(size * EMPTY_GLYPH_RATIO)}
              color={colors.icon}
            />
          )}
        </View>

        <View
          style={[
            styles.badge,
            { width: badge, height: badge, borderRadius: badge / 2 },
          ]}
        >
          <AppIcon name="camera" size={Math.round(badge / 2)} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <Text
        style={[styles.caption, { fontSize: fs('registrationSubtitle'), marginTop: captionGap }]}
      >
        {caption}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },

  // overflow clips a landscape photo to the circle; the empty glyph centres.
  avatar: {
    backgroundColor: colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // Figma: 36.5 circle on #EFE8FF, overlapping the avatar's bottom-right edge.
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: colors.registrationBadgeBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  caption: {
    color: colors.darkGray,
  },
});

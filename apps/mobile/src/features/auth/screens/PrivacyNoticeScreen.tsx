import React, { useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ScreenLayout } from '@/core/ui/ScreenLayout';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

// config.json → privacyNoticeText
const PRIVACY_URL = 'https://www.intelehealth.org/privacy-policy';

type Section = { heading?: string; body: string; bullets?: string[]; link?: string; linkSuffix?: string };

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyNotice'>;

export const PrivacyNoticeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isTablet, scale } = useResponsive();
  const [checked, setChecked] = useState(false);
  const consent = t('privacy.consent');

  const sections: Section[] = [
    {
      heading: t('privacy.sections.personalInfoHeading'),
      body: t('privacy.sections.personalInfoBody'),
    },
    {
      heading: t('privacy.sections.useHeading'),
      body: t('privacy.sections.useBody'),
      bullets: [t('privacy.sections.useBulletTreat'), t('privacy.sections.useBulletReminders')],
    },
    {
      body: t('privacy.sections.disclosureBody'),
      link: PRIVACY_URL,
      linkSuffix: t('privacy.sections.disclosureLinkSuffix'),
    },
    {
      heading: t('privacy.sections.protectionHeading'),
      body: t('privacy.sections.protectionBody'),
    },
    {
      heading: t('privacy.sections.accessHeading'),
      body: t('privacy.sections.accessBody'),
    },
  ];

  const toast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  // Accept stays disabled until the consent box is ticked (design) —
  // Reject keeps PrivacyNoticeActivity.java's read-first toast.
  const handleAccept = () => {
    // TODO: POST /audit + navigate to AddNewPatient once that screen exists.
    navigation.goBack();
  };

  const handleReject = () => {
    if (!checked) { toast(t('privacy.toastReadFirst')); return; }
    toast(t('privacy.toastReject'));
    navigation.goBack();
  };

  // ── Responsive values — tablet = design (600dp reference), phone scaled down ──
  const TEXT_INSET  = isTablet ? scale(40) : 24; // sections stop short of the card's right edge
  const BACK_SZ     = isTablet ? scale(40) : 36;
  const BACK_ICON   = isTablet ? scale(20) : 18;
  const TITLE_SZ    = isTablet ? scale(25) : 21;
  const HEAD_SZ     = isTablet ? scale(15) : 13;
  const BODY_SZ     = isTablet ? scale(14) : 12;
  const BODY_LH     = isTablet ? scale(20) : 18;
  const SEC_PAD     = isTablet ? scale(15) : 12;
  const CHECK_SZ    = isTablet ? scale(24) : 20;
  const CONSENT_SZ  = isTablet ? scale(15) : 13;
  const BLOCK_GAP   = isTablet ? scale(26) : 20;
  const BTN_GAP     = isTablet ? scale(24) : 16;

  const bodyText = { fontSize: BODY_SZ, lineHeight: BODY_LH };

  return (
    <ScreenLayout>
      {/* ── Back button + title ── */}
      <View style={styles.titleRow}>
        <TouchableOpacity
          style={[styles.backBtn, { width: BACK_SZ, height: BACK_SZ, borderRadius: isTablet ? scale(10) : 8 }]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common.a11y.goBack')}
          activeOpacity={0.7}
        >
          <AppIcon name="chevronLeft" size={BACK_ICON} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.title, { fontSize: TITLE_SZ, lineHeight: Math.round(TITLE_SZ * 1.3) }]}>
          {t('privacy.title')}
        </Text>
      </View>

      {/* ── Notice sections, hairline-separated ── */}
      <View style={{ marginTop: BLOCK_GAP - SEC_PAD, marginRight: TEXT_INSET }}>
        {sections.map((sec, i) => (
          <View
            key={sec.body}
            style={[
              { paddingVertical: SEC_PAD },
              i < sections.length - 1 && styles.sectionDivider,
            ]}
          >
            {sec.heading != null && (
              <Text style={[styles.heading, { fontSize: HEAD_SZ, lineHeight: BODY_LH, marginBottom: 2 }]}>
                {sec.heading}
              </Text>
            )}

            <Text style={[styles.body, bodyText]}>
              {sec.body}
              {sec.link != null && (
                <>
                  <Text
                    style={styles.link}
                    onPress={() => Linking.openURL(sec.link!)}
                    accessibilityRole="link"
                  >
                    {sec.link}
                  </Text>
                  {sec.linkSuffix}
                </>
              )}
            </Text>

            {sec.bullets?.map(b => (
              <View key={b} style={[styles.bulletRow, { marginTop: 4 }]}>
                <Text style={[styles.bulletDot, bodyText]}>{'•'}</Text>
                <Text style={[styles.body, bodyText, styles.flex1]}>{b}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* ── Consent card ── */}
      <TouchableOpacity
        style={[
          styles.consentCard,
          {
            marginTop: BLOCK_GAP - SEC_PAD,
            padding: isTablet ? scale(16) : 12,
            borderRadius: isTablet ? scale(12) : 10,
          },
        ]}
        onPress={() => setChecked(v => !v)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={t('privacy.consent')}
      >
        <View style={[
          styles.checkbox,
          { width: CHECK_SZ, height: CHECK_SZ, borderRadius: isTablet ? scale(5) : 4 },
          checked && styles.checkboxChecked,
        ]}>
          {checked && (
            <AppIcon name="check" size={isTablet ? scale(16) : 14} color={colors.white} />
          )}
        </View>

        {/* Android string verbatim; its leading "*" required marker is drawn red */}
        <Text style={[styles.consentTxt, styles.flex1, { fontSize: CONSENT_SZ, lineHeight: Math.round(CONSENT_SZ * 1.4) }]}>
          {consent.startsWith('*') && <Text style={styles.required}>*</Text>}
          {consent.replace(/^\*/, '')}
        </Text>
      </TouchableOpacity>

      {/* ── Accept + Reject ── */}
      <AppButton
        label={t('privacy.accept')}
        onPress={handleAccept}
        disabled={!checked}
        disabledTone="brand"
        style={{ marginTop: BLOCK_GAP }}
      />

      <AppButton
        label={t('privacy.reject')}
        onPress={handleReject}
        variant="secondary"
        style={{ marginTop: BTN_GAP }}
      />
    </ScreenLayout>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  flex1: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },

  backBtn: {
    borderWidth:     1,
    borderColor:     colors.borderFigma,
    backgroundColor: colors.white,
    alignItems:      'center',
    justifyContent:  'center',
  },

  title: {
    flex:       1,
    color:      colors.primaryTextFigma,
    fontWeight: '700',
  },

  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.colorContainer,
  },

  heading: {
    color:      colors.primary,
    fontWeight: '700',
  },

  body: {
    color: colors.secondaryTextFigma,
  },

  bulletRow: {
    flexDirection: 'row',
    gap:           8,
  },

  bulletDot: {
    color: colors.primary,
  },

  link: {
    color:              colors.primary,
    fontWeight:         '700',
    textDecorationLine: 'underline',
  },

  consentCard: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             12,
    borderWidth:     1,
    borderColor:     colors.borderFigma,
    backgroundColor: colors.white,
  },

  checkbox: {
    borderWidth:     1.5,
    borderColor:     colors.borderFigma,
    backgroundColor: colors.white,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       2,
    flexShrink:      0,
  },

  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor:     colors.primary,
  },

  consentTxt: {
    color:      colors.primaryTextFigma,
    fontWeight: '700',
  },

  required: {
    color: colors.error,
  },
});

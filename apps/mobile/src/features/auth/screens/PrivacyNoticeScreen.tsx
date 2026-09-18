import React, { useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { ScreenHeader } from '@/core/ui/ScreenHeader';
import { commonStyles } from '@/core/ui/commonStyles';
import { AppButton } from '@/core/ui/AppButton';
import { AppIcon } from '@/core/ui/icons';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { useAuthStore } from '@/core/session/auth.store';

// config.json → privacyNoticeText
const PRIVACY_URL = 'https://www.intelehealth.org/privacy-policy';

const TABLET_MAX_W = 680;

type Section = { heading?: string; body: string; link?: string; linkSuffix?: string };

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyNotice'>;

export const PrivacyNoticeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { isTablet, cornerRadius } = useResponsive();
  const setAuthenticated = useAuthStore(s => s.setAuthenticated);
  const [checked, setChecked] = useState(false);

  const sections: Section[] = [
    {
      heading: t('privacy.sections.personalInfoHeading'),
      body: t('privacy.sections.personalInfoBody'),
    },
    {
      heading: t('privacy.sections.useHeading'),
      body: t('privacy.sections.useBody'),
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

  // Mirrors PrivacyNoticeActivity.java onClick() exactly
  const handleAccept = () => {
    if (!checked) { toast(t('privacy.toastReadFirst')); return; }
    setAuthenticated('mock', 'fhw'); // TODO: real POST /audit + navigate to AddNewPatient
  };

  const handleReject = () => {
    if (!checked) { toast(t('privacy.toastReadFirst')); return; }
    toast(t('privacy.toastReject'));
    navigation.goBack();
  };

  // ── Responsive values ──────────────────────────────────────────────────────
  const WRAP_PAD = isTablet ? 16 : 12;
  const CARD_PAD = isTablet ? 20 : 16;
  const TEXT_SZ  = isTablet ? 16 : 12;
  const LINE_H   = isTablet ? 26 : 19;
  const SEC_GAP  = isTablet ? 20 : 16;
  const CHECK_SZ = isTablet ? 24 : 22;
  const BTN_GAP  = isTablet ? 14 : 12;
  const BOT_PAD  = isTablet ? 32 : 24;

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={t('privacy.title')}
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.contentWrap, { padding: WRAP_PAD }]}>

        {/* ── White scrollable card ── */}
        <View style={[styles.card, { borderRadius: cornerRadius }, isTablet && styles.cardTablet]}>
          <ScrollView
            contentContainerStyle={{ padding: CARD_PAD }}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((sec, i) => (
              <View key={i} style={i > 0 ? { marginTop: SEC_GAP } : undefined}>

                {sec.heading != null && (
                  <Text style={[styles.captionTxt, { fontSize: TEXT_SZ, lineHeight: LINE_H }]}>
                    {'• '}{sec.heading}
                  </Text>
                )}

                {sec.link != null ? (
                  <Text style={[styles.captionTxt, { fontSize: TEXT_SZ, lineHeight: LINE_H }]}>
                    {sec.body}
                    <Text style={commonStyles.link} onPress={() => Linking.openURL(sec.link!)}>
                      {sec.link}
                    </Text>
                    {sec.linkSuffix}
                  </Text>
                ) : (
                  <Text style={[styles.captionTxt, { fontSize: TEXT_SZ, lineHeight: LINE_H }]}>
                    {sec.body}
                  </Text>
                )}

              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Fixed bottom: checkbox + Accept + Reject ── */}
        <View style={[styles.bottomArea, { paddingBottom: BOT_PAD }, isTablet && styles.bottomTablet]}>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setChecked(v => !v)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={t('privacy.consent')}
          >
            <View style={[
              styles.checkbox,
              { width: CHECK_SZ, height: CHECK_SZ },
              checked && styles.checkboxChecked,
            ]}>
              {checked && (
                <AppIcon name="check" size={isTablet ? 15 : 13} color={colors.white} />
              )}
            </View>
            <Text style={[styles.captionTxt, { fontSize: TEXT_SZ, lineHeight: LINE_H, flex: 1 }]}>
              {t('privacy.consent')}
            </Text>
          </TouchableOpacity>

          <AppButton
            label={t('privacy.accept')}
            onPress={handleAccept}
          />

          <AppButton
            label={t('privacy.reject')}
            onPress={handleReject}
            variant="outline"
            style={{ marginTop: BTN_GAP }}
          />

        </View>
      </View>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  root: {
    flex:            1,
    backgroundColor: colors.containerBg,
  },

  contentWrap: {
    flex: 1,
  },

  // White rounded card — Android ScrollView + white_child_container_bg drawable
  card: {
    flex:            1,
    backgroundColor: colors.white,
    elevation:       2,
    shadowColor:     colors.black,
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.1,
    shadowRadius:    3,
  },

  cardTablet: {
    alignSelf: 'center',
    width:     '100%',
    maxWidth:  TABLET_MAX_W,
  },

  // Theme.EZazi.Caption — gray_4, inter-word justification
  captionTxt: {
    color:     colors.gray_4,
    textAlign: 'justify',
  },

  bottomArea: {
    paddingTop: 12,
  },

  bottomTablet: {
    alignSelf: 'center',
    width:     '100%',
    maxWidth:  TABLET_MAX_W,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
    marginBottom:  14,
  },

  checkbox: {
    borderRadius:    4,
    borderWidth:     1.5,
    borderColor:     colors.gray_2,
    backgroundColor: colors.white,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       2,
    flexShrink:      0,
  },

  // colorAccent — MaterialCheckBox checked fill
  checkboxChecked: {
    backgroundColor: colors.colorAccent,
    borderColor:     colors.colorAccent,
  },
});

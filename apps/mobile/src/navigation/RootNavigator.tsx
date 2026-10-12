import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuthStore } from '@/core/session/auth.store';
import { ApiProgressOverlay } from '@/core/ui/ApiProgressOverlay';
import { LowBatteryDialog } from '@/core/ui/LowBatteryDialog';

import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { SetupScreen } from '@/features/auth/screens/SetupScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { PrivacyNoticeScreen } from '@/features/auth/screens/PrivacyNoticeScreen';
import { ForgotPasswordRequestOtpScreen } from '@/features/auth/screens/ForgotPasswordRequestOtpScreen';
import { ForgotPasswordVerifyOtpScreen } from '@/features/auth/screens/ForgotPasswordVerifyOtpScreen';
import { ForgotPasswordResetScreen } from '@/features/auth/screens/ForgotPasswordResetScreen';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { TimelineScreen } from '@/features/labour-care-guide/screens/TimelineScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const status = useAuthStore((s) => s.status);

  const needsAuthStack = status === 'needsSetup' || status === 'needsLogin';

  return (
    <>
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        // Setup vs Login is app logic (first-run vs returning-with-expired-
        // session), not screen order — both are always registered below so
        // in-stack navigation between them still works either way.
        initialRouteName={needsAuthStack ? (status === 'needsSetup' ? 'Setup' : 'Login') : undefined}
      >
        {status === 'unknown' && <Stack.Screen name="Splash" component={SplashScreen} />}

        {needsAuthStack && (
          <>
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="PrivacyNotice" component={PrivacyNoticeScreen} />
            <Stack.Screen
              name="ForgotPasswordRequest"
              component={ForgotPasswordRequestOtpScreen}
            />
            <Stack.Screen
              name="ForgotPasswordVerify"
              component={ForgotPasswordVerifyOtpScreen}
            />
            <Stack.Screen
              name="ForgotPasswordReset"
              component={ForgotPasswordResetScreen}
            />
            {/* TEMPORARY — registered here (not just under `authenticated`)
                so SetupScreen's dev/QA shortcut can reach it pre-login.
                Remove this duplicate registration once a real, authenticated
                entry point (a patient-list screen) exists. */}
            <Stack.Screen name="Timeline" component={TimelineScreen} />
          </>
        )}

        {status === 'authenticated' && (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Timeline" component={TimelineScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    <ApiProgressOverlay />
    <LowBatteryDialog />
    </>
  );
};

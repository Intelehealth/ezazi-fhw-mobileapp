import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuthStore } from '@/stores/auth.store';

import { SplashScreen } from '@/screens/auth/SplashScreen';
import { SetupScreen } from '@/screens/auth/SetupScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PrivacyNoticeScreen } from '@/screens/auth/PrivacyNoticeScreen';
import { ForgotPasswordRequestOtpScreen } from '@/screens/auth/ForgotPasswordRequestOtpScreen';
import { ForgotPasswordVerifyOtpScreen } from '@/screens/auth/ForgotPasswordVerifyOtpScreen';
import { ForgotPasswordResetScreen } from '@/screens/auth/ForgotPasswordResetScreen';
import { HomeScreen } from '@/screens/home/HomeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const status = useAuthStore((s) => s.status);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {status === 'unknown' && <Stack.Screen name="Splash" component={SplashScreen} />}

        {status === 'unauthenticated' && (
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
          </>
        )}

        {status === 'authenticated' && <Stack.Screen name="Home" component={HomeScreen} />}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

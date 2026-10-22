import { Comfortaa_400Regular, Comfortaa_600SemiBold, Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FontDisplay, loadAsync } from 'expo-font';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useTheme } from '@/theme/use-theme';

// Фонтыг hydration-ий дараа ачаална (PROGRESS D50, D65):
// - `useFonts` нь статик HTML-д TTF preload оруулж анхны дүрслэлийг хаадаг байсан (Lighthouse FCP 4.2с).
// - `swap`: эхлээд систем фонт, Nunito/Comfortaa ирмэгц солигдоно. `optional` үед анхны айлчлалд
//   фонт бараг харагддаггүй байсан. Мөрийн өндөр бүгд `lineHeight`-ээр тогтсон тул шилжилт бага.
const swap = (uri: number) => ({ uri, display: FontDisplay.SWAP });
const FONTS = {
  Nunito_400Regular: swap(Nunito_400Regular),
  Nunito_600SemiBold: swap(Nunito_600SemiBold),
  Nunito_700Bold: swap(Nunito_700Bold),
  Nunito_800ExtraBold: swap(Nunito_800ExtraBold),
  Comfortaa_400Regular: swap(Comfortaa_400Regular),
  Comfortaa_600SemiBold: swap(Comfortaa_600SemiBold),
  Comfortaa_700Bold: swap(Comfortaa_700Bold),
};

export default function RootLayout() {
  useEffect(() => {
    loadAsync(FONTS).catch(() => {});
  }, []);
  const [queryClient] = useState(() => new QueryClient());
  const { c } = useTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, minHeight: '100%', backgroundColor: c.bg }}>
        <Header />
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <Footer />
      </View>
    </QueryClientProvider>
  );
}

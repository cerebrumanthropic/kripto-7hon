import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FontDisplay, loadAsync } from 'expo-font';
import { Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useTheme } from '@/theme/use-theme';

// Фонтыг hydration-ий дараа ачаална (PROGRESS D50):
// - `useFonts` нь статик HTML-д 4 TTF-ийн preload (≈630 KB) оруулж, Chrome preload + `optional` фонтыг
//   хүлээж анхны дүрслэлийг хаадаг байсан (Lighthouse FCP 4.2с).
// - `optional`: тухайн ачаалалд фонт бэлэн биш бол fallback stack (tokens.fonts) үлдэнэ — текст дахин
//   урсахгүй (CLS); дараагийн хуудсанд кэшээс Inter.
const optional = (uri: number) => ({ uri, display: FontDisplay.OPTIONAL });
const INTER = {
  Inter_400Regular: optional(Inter_400Regular),
  Inter_500Medium: optional(Inter_500Medium),
  Inter_600SemiBold: optional(Inter_600SemiBold),
  Inter_700Bold: optional(Inter_700Bold),
};

export default function RootLayout() {
  useEffect(() => {
    loadAsync(INTER).catch(() => {});
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

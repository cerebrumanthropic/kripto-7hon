import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useTheme } from '@/theme/use-theme';

export default function RootLayout() {
  // Вэбд фонт ачаалагдтал fallback stack-аар зурна (tokens.fonts) — хүлээлгэхгүй.
  useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
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

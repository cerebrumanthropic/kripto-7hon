import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Footer } from '@/components/layout/footer';
import { Header } from '@/components/layout/header';
import { useTheme } from '@/theme/use-theme';

// Фонт: төхөөрөмжийн Helvetica/Arial (tokens.ts, PROGRESS D69) — вэб фонт ачаалахгүй.

export default function RootLayout() {
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

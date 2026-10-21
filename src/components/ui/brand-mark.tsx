import { View } from 'react-native';

/**
 * Брэнд тэмдэг: хөх дөрвөлжин дотор өсөх 3 багана (сүүлчийнх нь алтан) — тоонд суурилсан 7 хоногийн мэдээ.
 * Толгой, хөл, инфографикт; favicon/og нь `scripts/dev/make-brand-images.ps1`-д ижил хэлбэрээр.
 */
export function BrandMark({ size = 40 }: { size?: number }) {
  const bar = (h: number, color: string) => (
    <View style={{ width: Math.round(size * 0.14), height: Math.round(size * h), borderRadius: 2, backgroundColor: color }} />
  );
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        backgroundColor: '#2457C5',
        backgroundImage: 'linear-gradient(145deg, #4C7DF0 0%, #1D47A3 100%)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.18)',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: Math.round(size * 0.08),
        paddingBottom: Math.round(size * 0.22),
      }}>
      {bar(0.26, '#FFFFFF')}
      {bar(0.4, '#FFFFFF')}
      {bar(0.56, '#F2C46B')}
    </View>
  );
}

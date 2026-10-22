// Өөрсдийн зурсан шугаман дүрсүүд (24×24, react-native-svg). Мэдээний сайтын зураг, гуравдагч этгээдийн
// лого ашиглахгүй (CLAUDE.md дүрэм 4, SPEC §13) — ангилал ба хэсгийг энэ дүрсээр илэрхийлнэ (PROGRESS D68).
import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { NewsTag } from '@/types/schemas';
import { useTheme } from '@/theme/use-theme';

export type IconName =
  | NewsTag
  | 'news'
  | 'mongolia'
  | 'report'
  | 'summary'
  | 'examples'
  | 'regulators'
  | 'additional'
  | 'matrix'
  | 'design'
  | 'sources'
  | 'glossary'
  | 'bibliography';

function Shapes({ name }: { name: IconName }) {
  switch (name) {
    case 'regulation': // жин
      return (
        <>
          <Path d="M12 4v16M8 20h8M5 7h14" />
          <Path d="M5 7 2 13a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />
        </>
      );
    case 'etf': // өсөх шугам
      return <Path d="M4 19h16M5 15l4-4 4 2 6-6M15 7h4v4" />;
    case 'security': // бамбай
      return <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4" />;
    case 'macro':
    case 'examples': // бөмбөрцөг
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </>
      );
    case 'stablecoin': // зоос $
      return (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6.5V8M12 16v1.5" />
        </>
      );
    case 'defi': // холбосон зангилаа
      return (
        <>
          <Circle cx={6} cy={6} r={2.5} />
          <Circle cx={18} cy={6} r={2.5} />
          <Circle cx={12} cy={18} r={2.5} />
          <Path d="M8.5 6h7M7.2 8.2l3.6 7.4M16.8 8.2l-3.6 7.4" />
        </>
      );
    case 'mining': // шоо (блок)
      return <Path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9" />;
    case 'market': // лааны график
      return (
        <>
          <Path d="M7 3v4M7 15v4M17 5v5M17 16v3" />
          <Rect x={5} y={7} width={4} height={8} rx={1} />
          <Rect x={15} y={10} width={4} height={6} rx={1} />
        </>
      );
    case 'mongolia': // туг
      return <Path d="M5 21V4M5 4h12l-2.5 4L17 12H5" />;
    case 'report': // баримт + график
      return (
        <>
          <Path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5" />
          <Path d="M9 17v-3M12 17v-5M15 17v-2" />
        </>
      );
    case 'summary': // чийдэн
      return (
        <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
      );
    case 'regulators': // барилга (байгууллага)
      return <Path d="M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M3 10l9-6 9 6z" />;
    case 'additional': // хавчуурга
      return <Path d="M7 4h10a1 1 0 0 1 1 1v16l-6-4-6 4V5a1 1 0 0 1 1-1z" />;
    case 'matrix': // тор
      return (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={1.5} />
          <Rect x={13} y={4} width={7} height={7} rx={1.5} />
          <Rect x={4} y={13} width={7} height={7} rx={1.5} />
          <Rect x={13} y={13} width={7} height={7} rx={1.5} />
        </>
      );
    case 'design': // загвар (layout)
      return (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2} />
          <Path d="M3 9h18M9 9v11" />
        </>
      );
    case 'sources': // мэдээллийн сан
      return (
        <>
          <Ellipse cx={12} cy={6} rx={7} ry={3} />
          <Path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
        </>
      );
    case 'glossary': // нээлттэй ном
      return (
        <Path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2zM12 6.5v14" />
      );
    case 'bibliography': // холбоос
      return (
        <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      );
    case 'news':
    default: // сонин
      return (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2} />
          <Path d="M7 8h10M7 12h10M7 16h6" />
        </>
      );
  }
}

// Цайвар / бараан горимын өнгө (дүрс нь чимэг — текстийн тодрол шаардахгүй, гэхдээ ≥3:1)
const HUES: Partial<Record<IconName, [string, string]>> = {
  regulation: ['#4F46E5', '#A5B4FC'],
  etf: ['#2457C5', '#93B4FF'],
  security: ['#B91C1C', '#FCA5A5'],
  macro: ['#0F766E', '#5EEAD4'],
  stablecoin: ['#15803D', '#86EFAC'],
  defi: ['#7C3AED', '#C4B5FD'],
  mining: ['#B45309', '#FCD34D'],
  market: ['#C2410C', '#FDBA74'],
  mongolia: ['#C8102E', '#FCA5A5'],
  news: ['#475569', '#CBD5E1'],
};

/** Ангилал/хэсгийн өнгө: дээрх жагсаалтад байхгүй бол брэнд өнгө. */
export function useIconColor(name: IconName): string {
  const { c, scheme } = useTheme();
  const hue = HUES[name];
  return hue ? hue[scheme === 'dark' ? 1 : 0] : c.brandText;
}

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const auto = useIconColor(name);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? auto}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Shapes name={name} />
    </Svg>
  );
}

/** Өнгөт дэвсгэртэй дөрвөлжин дүрс (мэдээ, хэсгийн гарчиг, карт). Чимэг тул aria-hidden. */
export function IconTile({ name, size = 40 }: { name: IconName; size?: number }) {
  const color = useIconColor(name);
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: `${color}1F`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={Math.round(size * 0.55)} color={color} />
    </View>
  );
}

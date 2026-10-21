import { View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { linePoints } from './scale';
import { useWidth } from './use-width';

/** Жижиг шугам (KPI карт, түүх). Өнгө нь чиглэлээс эсвэл заасан өнгө. */
export function Sparkline({
  values,
  color,
  height = 36,
  label,
}: {
  values: number[];
  color: string;
  height?: number;
  label?: string;
}) {
  const [width, onLayout] = useWidth();
  return (
    <View onLayout={onLayout} style={{ height, width: '100%' }} role="img" aria-label={label}>
      {width > 0 && values.length > 1 ? (
        <Svg width={width} height={height}>
          <Polyline
            points={linePoints(values, width, height)}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

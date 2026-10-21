import { describe, expect, it } from 'vitest';

import { changePct, extent, gaugeAngle, heatIntensity, linePoints } from './scale';

describe('chart scale', () => {
  it('extent', () => {
    expect(extent([3, 1, 2])).toEqual([1, 3]);
    expect(extent([5, 5])).toEqual([4, 6]);
    expect(extent([])).toEqual([0, 1]);
  });
  it('linePoints', () => {
    expect(linePoints([0, 10], 100, 50, 0)).toBe('0.0,50.0 100.0,0.0');
    expect(linePoints([], 100, 50)).toBe('');
  });
  it('changePct', () => {
    expect(changePct([100, 110])).toBeCloseTo(10);
    expect(changePct([1])).toBeNull();
  });
  it('gaugeAngle', () => {
    expect(gaugeAngle(0)).toBeCloseTo(Math.PI);
    expect(gaugeAngle(100)).toBeCloseTo(0);
    expect(gaugeAngle(150)).toBeCloseTo(0);
  });
  it('heatIntensity', () => {
    expect(heatIntensity(-10)).toBe(0.5);
    expect(heatIntensity(40)).toBe(1);
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import { iconPaths, type IconName } from '../iconPaths';
import {
  AppIcon,
  ChatRoundIcon,
  DangerTriangleIcon,
  LockKeyholeBadgeIcon,
  NetworkErrorIcon,
  PillIcon,
  VideoCameraIcon,
} from '../index';

// The rendered <Svg>'s size and fill colours, read off the host tree.
const svg = () => screen.toJSON() as ReactTestRendererJSON;
const fills = (): unknown[] => {
  const found: unknown[] = [];
  const walk = (node: ReactTestRendererJSON) => {
    if (node.type === 'RNSVGPath') found.push(node.props.fill);
    for (const child of node.children ?? []) if (typeof child !== 'string') walk(child);
  };
  walk(svg());
  return found;
};

const FIGMA_ICONS: [string, React.FC<{ size?: number; color?: string }>][] = [
  ['DangerTriangleIcon', DangerTriangleIcon],
  ['NetworkErrorIcon', NetworkErrorIcon],
  ['VideoCameraIcon', VideoCameraIcon],
  ['PillIcon', PillIcon],
  ['ChatRoundIcon', ChatRoundIcon],
];

/** Every icon component draws an <Svg> at its default size and at a given one. */
describe('icons', () => {
  it.each(FIGMA_ICONS)('%s renders with its defaults and with a size and colour', (_name, Icon) => {
    const { rerender } = render(<Icon />);
    expect(svg().type).toBe('RNSVGSvgView');
    expect(fills().length).toBeGreaterThan(0);

    rerender(<Icon size={20} color="#123456" />);
    expect(Math.max(Number(svg().props.width), Number(svg().props.height))).toBeCloseTo(20);
    expect(fills().length).toBeGreaterThan(0);
  });

  it('LockKeyholeBadgeIcon renders at its default 40 and at a given size', () => {
    const { rerender } = render(<LockKeyholeBadgeIcon />);
    expect(svg().props).toMatchObject({ width: 40, height: 40 });

    rerender(<LockKeyholeBadgeIcon size={24} />);
    expect(svg().props).toMatchObject({ width: 24, height: 24 });
  });

  it('AppIcon draws every registry entry, 24 by default', () => {
    for (const name of Object.keys(iconPaths) as IconName[]) {
      render(<AppIcon name={name} color="#2E1E91" />);
      expect(svg().props).toMatchObject({ width: 24, height: 24 });
      expect(fills()).toHaveLength(1);
    }

    render(<AppIcon name="close" color="#2E1E91" size={16} />);
    expect(svg().props).toMatchObject({ width: 16, height: 16 });
  });
});

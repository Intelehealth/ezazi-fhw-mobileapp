import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LcgViewportComponent } from '../../../components/elcg/lcg-viewport.component';

/*
 * jsdom implements neither pointer capture nor PointerEvent's clientX/Y, has
 * no layout, and drops the CSS `zoom` property — elcg.component.test.tsx
 * checks the zoom factor handed to this component instead.
 */
HTMLElement.prototype.setPointerCapture = vi.fn();

function pointer(
  type: string,
  init: { x: number; y: number; button?: number; pointerType?: string }
) {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.x,
    clientY: init.y,
    button: init.button ?? 0,
  });
  Object.assign(event, {
    pointerId: 1,
    pointerType: init.pointerType ?? 'mouse',
  });
  return event;
}

/* The viewport inside a page pane that scrolls, as in the dashboard shell. */
function renderInScrollingPage() {
  render(
    <div data-testid="page" style={{ overflowY: 'auto' }}>
      <LcgViewportComponent zoom={1}>
        <p>guide</p>
      </LcgViewportComponent>
    </div>
  );
  const page = screen.getByTestId('page');
  Object.defineProperty(page, 'scrollHeight', { value: 3000 });
  Object.defineProperty(page, 'clientHeight', { value: 800 });
  page.scrollTop = 50;
  return { page, frame: screen.getByTestId('lcg-viewport') };
}

function drag(
  frame: HTMLElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
  pointerType = 'mouse'
) {
  fireEvent(frame, pointer('pointerdown', { ...from, pointerType }));
  fireEvent(frame, pointer('pointermove', { ...to, pointerType }));
  fireEvent(frame, pointer('pointerup', { ...to, pointerType }));
}

function panX(): string {
  return screen.getByTestId('lcg-pan').style.transform;
}

describe('LcgViewportComponent', () => {
  it('pans the guide sideways and scrolls the page up and down on a mouse drag', () => {
    const { page, frame } = renderInScrollingPage();

    fireEvent(frame, pointer('pointerdown', { x: 200, y: 200 }));
    expect(frame.className).toContain('cursor-grabbing');
    fireEvent(frame, pointer('pointermove', { x: 170, y: 190 }));
    fireEvent(frame, pointer('pointerup', { x: 170, y: 190 }));

    expect(panX()).toBe('translateX(-30px)');
    expect(page.scrollTop).toBe(60);
    expect(frame.className).not.toContain('cursor-grabbing');
  });

  it('carries on from where the last drag left the guide', () => {
    const { frame } = renderInScrollingPage();

    drag(frame, { x: 200, y: 200 }, { x: 170, y: 200 });
    drag(frame, { x: 100, y: 200 }, { x: 140, y: 200 });

    expect(panX()).toBe('translateX(10px)');
  });

  it('pans sideways only on touch, leaving vertical swipes to the page', () => {
    const { page, frame } = renderInScrollingPage();

    drag(frame, { x: 200, y: 200 }, { x: 150, y: 100 }, 'touch');

    expect(panX()).toBe('translateX(-50px)');
    expect(page.scrollTop).toBe(50);
  });

  it('re-centres the guide horizontally when the zoom changes', () => {
    const { rerender } = render(
      <LcgViewportComponent zoom={1}>
        <p>guide</p>
      </LcgViewportComponent>
    );
    const frame = screen.getByTestId('lcg-viewport');
    Object.defineProperty(frame, 'clientWidth', { value: 1000 });
    const content = screen.getByText('guide').parentElement as HTMLElement;
    content.getBoundingClientRect = () => ({ width: 1600 }) as DOMRect;

    rerender(
      <LcgViewportComponent zoom={1.5}>
        <p>guide</p>
      </LcgViewportComponent>
    );

    expect(panX()).toBe('translateX(-300px)');
  });

  it("lays the guide out to the frame's width, like pan-zoom", () => {
    const clientWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'clientWidth'
    );
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset.testid === 'lcg-viewport' ? 1200 : 0;
      },
    });
    try {
      render(
        <LcgViewportComponent zoom={1.5}>
          <p>guide</p>
        </LcgViewportComponent>
      );

      const content = screen.getByText('guide').parentElement as HTMLElement;
      /* Zooming scales that layout rather than re-laying it out. */
      expect(content.style.width).toBe('1200px');
      expect(content.className).toContain('max-w-max');
    } finally {
      if (clientWidth) {
        Object.defineProperty(
          HTMLElement.prototype,
          'clientWidth',
          clientWidth
        );
      }
    }
  });

  it('clips the guide instead of scrolling it, leaving scrolling to the page', () => {
    render(
      <LcgViewportComponent zoom={1}>
        <p>guide</p>
      </LcgViewportComponent>
    );
    const frame = screen.getByTestId('lcg-viewport');

    expect(frame.className).toContain('overflow-hidden');
    expect(frame.className).not.toMatch(/\bh-\[|overflow-(x-|y-)?auto/);
  });

  it('leaves a press on a button to the button', () => {
    render(
      <LcgViewportComponent zoom={1}>
        <button type="button">open</button>
      </LcgViewportComponent>
    );
    const frame = screen.getByTestId('lcg-viewport');

    fireEvent(
      screen.getByRole('button', { name: 'open' }),
      pointer('pointerdown', { x: 0, y: 0 })
    );

    expect(frame.className).not.toContain('cursor-grabbing');
  });
});

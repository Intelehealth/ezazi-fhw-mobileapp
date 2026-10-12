import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecaptchaComponent } from '../../../components/common/recaptcha.component';

afterEach(() => {
  delete (window as { grecaptcha?: unknown }).grecaptcha;
  delete (window as { __onGrecaptchaLoad?: unknown }).__onGrecaptchaLoad;
  document.getElementById('grecaptcha-script')?.remove();
});

describe('RecaptchaComponent', () => {
  it('renders the widget immediately when window.grecaptcha is already loaded', () => {
    const render_ = vi.fn().mockReturnValue(1);
    window.grecaptcha = { render: render_ };

    render(<RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />);

    expect(render_).toHaveBeenCalledTimes(1);
    expect(render_.mock.calls[0][1]).toMatchObject({
      sitekey: 'test-site-key',
    });
  });

  it('calls onChange with the token when the widget callback fires', () => {
    const onChange = vi.fn();
    window.grecaptcha = {
      render: (_container, params: Record<string, unknown>) => {
        (params.callback as (token: string) => void)('solved-token');
        return 1;
      },
    };

    render(<RecaptchaComponent siteKey="test-site-key" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith('solved-token');
  });

  it('injects the grecaptcha script with the onload callback param when not yet loaded', () => {
    render(<RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />);

    const script = document.getElementById('grecaptcha-script');
    expect(script).not.toBeNull();
    expect(script).toHaveAttribute(
      'src',
      'https://www.google.com/recaptcha/api.js?onload=__onGrecaptchaLoad&render=explicit'
    );
  });

  it('waits for the onload callback rather than rendering against an incomplete grecaptcha stub', () => {
    // Regression test: api.js can define `window.grecaptcha` as a stub
    // (no `.render` yet) before its own async init finishes — this must
    // NOT be treated as "already loaded".
    window.grecaptcha = {} as Window['grecaptcha'];
    const render_ = vi.fn().mockReturnValue(1);
    const onChange = vi.fn();

    render(<RecaptchaComponent siteKey="test-site-key" onChange={onChange} />);

    expect(render_).not.toHaveBeenCalled();

    // Simulate Google's real completion signal.
    window.grecaptcha = { render: render_ };
    window.__onGrecaptchaLoad?.();

    expect(render_).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with null when the widget reports the token expired', () => {
    const onChange = vi.fn();
    window.grecaptcha = {
      render: (_container, params: Record<string, unknown>) => {
        (params['expired-callback'] as () => void)();
        return 1;
      },
    };

    render(<RecaptchaComponent siteKey="test-site-key" onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not render a second widget if the onload callback ever fires again', () => {
    // grecaptcha is NOT pre-loaded here (unlike the other tests), so the
    // effect registers this instance's own renderWidget as
    // window.__onGrecaptchaLoad — calling it twice must only render once.
    const render_ = vi.fn().mockReturnValue(1);

    render(<RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />);

    window.grecaptcha = { render: render_ };
    window.__onGrecaptchaLoad?.();
    expect(render_).toHaveBeenCalledTimes(1);

    window.__onGrecaptchaLoad?.();
    expect(render_).toHaveBeenCalledTimes(1);
  });

  it('removes its onload callback on unmount so it cannot fire against an unmounted instance', () => {
    const { unmount } = render(
      <RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />
    );

    expect(window.__onGrecaptchaLoad).toBeTypeOf('function');

    unmount();

    expect(window.__onGrecaptchaLoad).toBeUndefined();
  });

  it('leaves a newer onload callback alone when an older instance unmounts after being superseded', () => {
    // Both mount before grecaptcha loads: the second instance's effect
    // overwrites window.__onGrecaptchaLoad with its own renderWidget. The
    // first instance's cleanup must then see it no longer owns that
    // callback and leave the second instance's callback in place.
    const first = render(
      <RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />
    );
    render(<RecaptchaComponent siteKey="test-site-key" onChange={vi.fn()} />);
    const secondCallback = window.__onGrecaptchaLoad;

    first.unmount();

    expect(window.__onGrecaptchaLoad).toBe(secondCallback);
  });
});

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, params: Record<string, unknown>) => number;
    };
    __onGrecaptchaLoad?: () => void;
  }
}

interface RecaptchaComponentProps {
  siteKey: string;
  onChange: (token: string | null) => void;
}

const SCRIPT_ID = 'grecaptcha-script';
const CALLBACK_NAME = '__onGrecaptchaLoad';
const SCRIPT_SRC = `https://www.google.com/recaptcha/api.js?onload=${CALLBACK_NAME}&render=explicit`;

/**
 * Zero-dependency Google reCAPTCHA v2 checkbox widget — apps/web has no
 * recaptcha library yet (Angular used ngx-captcha, a thin wrapper over this
 * same `window.grecaptcha` script), and adding one just for this single
 * widget seemed like more than this task needs. Loads the official script
 * once and renders explicitly into `containerRef`, matching how ngx-captcha
 * itself works under the hood.
 *
 * Uses the `onload` URL callback, not the <script> tag's own `load` event:
 * api.js's `load` event fires once the file is *downloaded*, but
 * `grecaptcha.render` isn't actually ready until Google's own async init
 * finishes slightly after that — `window.grecaptcha` exists as an
 * incomplete stub in between, so `renderWidget` would otherwise sometimes
 * run before `.render` exists. The `onload` param is what Google itself
 * calls exactly when it's truly ready.
 */
export function RecaptchaComponent({ siteKey, onChange }: RecaptchaComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  useEffect(() => {
    function renderWidget() {
      if (!containerRef.current || !window.grecaptcha?.render || widgetIdRef.current !== null) {
        return;
      }
      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onChange(token),
        'expired-callback': () => onChange(null),
      });
    }

    if (window.grecaptcha?.render) {
      renderWidget();
      return;
    }

    window[CALLBACK_NAME] = renderWidget;

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    return () => {
      if (window[CALLBACK_NAME] === renderWidget) {
        delete window[CALLBACK_NAME];
      }
    };
  }, [siteKey, onChange]);

  return <div ref={containerRef} />;
}

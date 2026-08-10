import { DEFAULT_CLIENT_CONFIG } from '../default';

describe('DEFAULT_CLIENT_CONFIG', () => {

  // ── Identity ─────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('has id "default"', () => {
      expect(DEFAULT_CLIENT_CONFIG.id).toBe('default');
    });

    it('targets India (countryCode IN)', () => {
      expect(DEFAULT_CLIENT_CONFIG.countryCode).toBe('IN');
    });

    it('uses AD (Gregorian) calendar', () => {
      expect(DEFAULT_CLIENT_CONFIG.calendar).toBe('AD');
    });

    it('uses English locale', () => {
      expect(DEFAULT_CLIENT_CONFIG.locale).toBe('en');
    });
  });

  // ── Phone ────────────────────────────────────────────────────────────────

  describe('phone', () => {
    it('dial code is +91', () => {
      expect(DEFAULT_CLIENT_CONFIG.phone.dialCode).toBe('+91');
    });

    it('dial code starts with +', () => {
      expect(DEFAULT_CLIENT_CONFIG.phone.dialCode).toMatch(/^\+/);
    });

    it('flag is Indian flag emoji', () => {
      expect(DEFAULT_CLIENT_CONFIG.phone.flag).toBe('🇮🇳');
    });

    it('national number length is 10 digits', () => {
      expect(DEFAULT_CLIENT_CONFIG.phone.numberLength).toBe(10);
    });

    it('number length is a positive integer', () => {
      expect(DEFAULT_CLIENT_CONFIG.phone.numberLength).toBeGreaterThan(0);
      expect(Number.isInteger(DEFAULT_CLIENT_CONFIG.phone.numberLength)).toBe(true);
    });
  });

  // ── Theme ─────────────────────────────────────────────────────────────────

  describe('theme', () => {
    const HEX = /^#[0-9A-Fa-f]{6}$/;

    it('primary color is a valid 6-digit hex', () => {
      expect(DEFAULT_CLIENT_CONFIG.theme.primary).toMatch(HEX);
    });

    it('primaryDark color is a valid 6-digit hex', () => {
      expect(DEFAULT_CLIENT_CONFIG.theme.primaryDark).toMatch(HEX);
    });

    it('secondary color is a valid 6-digit hex', () => {
      expect(DEFAULT_CLIENT_CONFIG.theme.secondary).toMatch(HEX);
    });

    it('primary color is the eZAZI purple', () => {
      expect(DEFAULT_CLIENT_CONFIG.theme.primary).toBe('#2E1E91');
    });

    it('primaryDark is darker than primary (lower numeric value)', () => {
      const primary = parseInt(DEFAULT_CLIENT_CONFIG.theme.primary.slice(1), 16);
      const dark    = parseInt(DEFAULT_CLIENT_CONFIG.theme.primaryDark.slice(1), 16);
      expect(dark).toBeLessThan(primary);
    });
  });

  // ── Assets ────────────────────────────────────────────────────────────────

  describe('assets', () => {
    it('logo asset is defined', () => {
      expect(DEFAULT_CLIENT_CONFIG.assets.logo).toBeDefined();
    });

    it('splashLogo asset is defined (used on app launcher screen)', () => {
      expect(DEFAULT_CLIENT_CONFIG.assets.splashLogo).toBeDefined();
    });

    it('loginIcon asset is defined', () => {
      expect(DEFAULT_CLIENT_CONFIG.assets.loginIcon).toBeDefined();
    });

    it('logoSize config is defined', () => {
      expect(DEFAULT_CLIENT_CONFIG.assets.logoSize).toBeDefined();
    });

    describe('logoSize — splash', () => {
      const splash = () => DEFAULT_CLIENT_CONFIG.assets.logoSize!.splash;

      it('phone dimensions are positive', () => {
        expect(splash().phone.width).toBeGreaterThan(0);
        expect(splash().phone.height).toBeGreaterThan(0);
      });

      it('tablet dimensions are positive', () => {
        expect(splash().tablet.width).toBeGreaterThan(0);
        expect(splash().tablet.height).toBeGreaterThan(0);
      });

      it('tablet size is larger than phone size', () => {
        expect(splash().tablet.width).toBeGreaterThan(splash().phone.width);
        expect(splash().tablet.height).toBeGreaterThan(splash().phone.height);
      });
    });

    describe('logoSize — login', () => {
      const login = () => DEFAULT_CLIENT_CONFIG.assets.logoSize!.login;

      it('phone dimensions are positive', () => {
        expect(login().phone.width).toBeGreaterThan(0);
        expect(login().phone.height).toBeGreaterThan(0);
      });

      it('tablet dimensions are positive', () => {
        expect(login().tablet.width).toBeGreaterThan(0);
        expect(login().tablet.height).toBeGreaterThan(0);
      });

      it('tablet size is larger than phone size', () => {
        expect(login().tablet.width).toBeGreaterThan(login().phone.width);
        expect(login().tablet.height).toBeGreaterThan(login().phone.height);
      });

      it('phone marginTop is non-negative when defined', () => {
        const mt = login().phone.marginTop;
        if (mt !== undefined) expect(mt).toBeGreaterThanOrEqual(0);
      });

      it('phone gapBelowIcon is non-negative when defined', () => {
        const gap = login().phone.gapBelowIcon;
        if (gap !== undefined) expect(gap).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ── Servers ───────────────────────────────────────────────────────────────

  describe('servers', () => {
    const URL_PATTERN = /^https?:\/\/.+/;
    const ENVS = ['development', 'preview', 'production'] as const;
    const URL_KEYS = ['authGatewayUrl', 'portalUrl', 'webrtcUrl', 'configUrl'] as const;

    it('all three environment tiers are present', () => {
      ENVS.forEach(env => {
        expect(DEFAULT_CLIENT_CONFIG.servers[env]).toBeDefined();
      });
    });

    it('every environment has all four URL keys', () => {
      ENVS.forEach(env => {
        URL_KEYS.forEach(key => {
          expect(DEFAULT_CLIENT_CONFIG.servers[env][key]).toBeDefined();
        });
      });
    });

    it('every URL follows the http(s)://... pattern', () => {
      ENVS.forEach(env => {
        URL_KEYS.forEach(key => {
          expect(DEFAULT_CLIENT_CONFIG.servers[env][key]).toMatch(URL_PATTERN);
        });
      });
    });

    it('development URLs point to localhost', () => {
      URL_KEYS.forEach(key => {
        expect(DEFAULT_CLIENT_CONFIG.servers.development[key]).toMatch(/^http:\/\/localhost/);
      });
    });

    it('preview and production URLs use HTTPS', () => {
      (['preview', 'production'] as const).forEach(env => {
        URL_KEYS.forEach(key => {
          expect(DEFAULT_CLIENT_CONFIG.servers[env][key]).toMatch(/^https:/);
        });
      });
    });
  });

});

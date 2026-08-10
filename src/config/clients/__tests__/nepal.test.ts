import { NEPAL_CLIENT_CONFIG } from '../nepal';

describe('NEPAL_CLIENT_CONFIG', () => {

  // ── Identity ─────────────────────────────────────────────────────────────

  describe('identity', () => {
    it('has id "nepal"', () => {
      expect(NEPAL_CLIENT_CONFIG.id).toBe('nepal');
    });

    it('targets Nepal (countryCode NP)', () => {
      expect(NEPAL_CLIENT_CONFIG.countryCode).toBe('NP');
    });

    it('uses BS (Bikram Sambat) calendar', () => {
      expect(NEPAL_CLIENT_CONFIG.calendar).toBe('BS');
    });

    it('uses English locale', () => {
      expect(NEPAL_CLIENT_CONFIG.locale).toBe('en');
    });
  });

  // ── Phone ────────────────────────────────────────────────────────────────

  describe('phone', () => {
    it('dial code is +977', () => {
      expect(NEPAL_CLIENT_CONFIG.phone.dialCode).toBe('+977');
    });

    it('dial code starts with +', () => {
      expect(NEPAL_CLIENT_CONFIG.phone.dialCode).toMatch(/^\+/);
    });

    it('flag is Nepali flag emoji', () => {
      expect(NEPAL_CLIENT_CONFIG.phone.flag).toBe('🇳🇵');
    });

    it('national number length is 10 digits', () => {
      expect(NEPAL_CLIENT_CONFIG.phone.numberLength).toBe(10);
    });

    it('number length is a positive integer', () => {
      expect(NEPAL_CLIENT_CONFIG.phone.numberLength).toBeGreaterThan(0);
      expect(Number.isInteger(NEPAL_CLIENT_CONFIG.phone.numberLength)).toBe(true);
    });
  });

  // ── Theme ─────────────────────────────────────────────────────────────────

  describe('theme', () => {
    const HEX = /^#[0-9A-Fa-f]{6}$/;

    it('primary color is a valid 6-digit hex', () => {
      expect(NEPAL_CLIENT_CONFIG.theme.primary).toMatch(HEX);
    });

    it('primaryDark color is a valid 6-digit hex', () => {
      expect(NEPAL_CLIENT_CONFIG.theme.primaryDark).toMatch(HEX);
    });

    it('secondary color is a valid 6-digit hex', () => {
      expect(NEPAL_CLIENT_CONFIG.theme.secondary).toMatch(HEX);
    });

    it('primary color is the eLCG teal', () => {
      expect(NEPAL_CLIENT_CONFIG.theme.primary).toBe('#1F6F78');
    });

    it('primaryDark is darker than primary (lower numeric value)', () => {
      const primary = parseInt(NEPAL_CLIENT_CONFIG.theme.primary.slice(1), 16);
      const dark    = parseInt(NEPAL_CLIENT_CONFIG.theme.primaryDark.slice(1), 16);
      expect(dark).toBeLessThan(primary);
    });

    it('primary colors differ from eZAZI default (distinct brand)', () => {
      expect(NEPAL_CLIENT_CONFIG.theme.primary).not.toBe('#2E1E91');
    });
  });

  // ── Assets ────────────────────────────────────────────────────────────────

  describe('assets', () => {
    it('logo asset is defined', () => {
      expect(NEPAL_CLIENT_CONFIG.assets.logo).toBeDefined();
    });

    it('logoSize config is defined', () => {
      expect(NEPAL_CLIENT_CONFIG.assets.logoSize).toBeDefined();
    });

    describe('logoSize — splash', () => {
      const splash = () => NEPAL_CLIENT_CONFIG.assets.logoSize!.splash;

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
      const login = () => NEPAL_CLIENT_CONFIG.assets.logoSize!.login;

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
        expect(NEPAL_CLIENT_CONFIG.servers[env]).toBeDefined();
      });
    });

    it('every environment has all four URL keys', () => {
      ENVS.forEach(env => {
        URL_KEYS.forEach(key => {
          expect(NEPAL_CLIENT_CONFIG.servers[env][key]).toBeDefined();
        });
      });
    });

    it('every URL follows the http(s)://... pattern', () => {
      ENVS.forEach(env => {
        URL_KEYS.forEach(key => {
          expect(NEPAL_CLIENT_CONFIG.servers[env][key]).toMatch(URL_PATTERN);
        });
      });
    });

    it('development URLs point to localhost', () => {
      URL_KEYS.forEach(key => {
        expect(NEPAL_CLIENT_CONFIG.servers.development[key]).toMatch(/^http:\/\/localhost/);
      });
    });

    it('preview and production URLs use HTTPS', () => {
      (['preview', 'production'] as const).forEach(env => {
        URL_KEYS.forEach(key => {
          expect(NEPAL_CLIENT_CONFIG.servers[env][key]).toMatch(/^https:/);
        });
      });
    });
  });

});

import { trackApiActivity } from '../trackApiActivity';
import { useApiActivityStore } from '../apiActivity.store';

type Handler = (arg: unknown) => unknown;

function fakeInstance() {
  const handlers: Record<string, { ok?: Handler; fail?: Handler }> = {};
  const register = (kind: string) => ({
    use: (ok?: Handler, fail?: Handler) => {
      handlers[kind] = { ok, fail };
    },
  });
  const instance = { interceptors: { request: register('request'), response: register('response') } };
  return { instance, handlers };
}

describe('trackApiActivity', () => {
  beforeEach(() => useApiActivityStore.setState({ pending: 0 }));

  it('counts a request as pending until its response arrives', () => {
    const { instance, handlers } = fakeInstance();
    trackApiActivity(instance as never);

    handlers.request.ok!({});
    expect(useApiActivityStore.getState().pending).toBe(1);

    handlers.response.ok!({});
    expect(useApiActivityStore.getState().pending).toBe(0);
  });

  it('releases the request when the response is an error, and rethrows it', async () => {
    const { instance, handlers } = fakeInstance();
    trackApiActivity(instance as never);

    handlers.request.ok!({});
    await expect(handlers.response.fail!(new Error('boom'))).rejects.toThrow('boom');
    expect(useApiActivityStore.getState().pending).toBe(0);
  });

  it('stays pending while overlapping requests are still in flight, and never goes negative', () => {
    const { instance, handlers } = fakeInstance();
    trackApiActivity(instance as never);

    handlers.request.ok!({});
    handlers.request.ok!({});
    handlers.response.ok!({});
    expect(useApiActivityStore.getState().pending).toBe(1);

    handlers.response.ok!({});
    handlers.response.ok!({});
    expect(useApiActivityStore.getState().pending).toBe(0);
  });
});

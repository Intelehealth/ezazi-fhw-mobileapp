import type { AxiosInstance } from 'axios';
import { createRequestMethods, request } from '../responseHandler';
import { NetworkError } from '@ezazi/api-client';

function createFakeInstance(handler: (config: unknown) => Promise<{ data: unknown }>) {
  return { request: jest.fn(handler) } as unknown as AxiosInstance;
}

describe('request', () => {

  it('wraps a successful response in Success', async () => {
    const instance = createFakeInstance(async () => ({ data: { id: 1 } }));
    const result = await request<{ id: number }>(instance, { url: '/thing', method: 'GET' });

    expect(result).toEqual({ ok: true, data: { id: 1 } });
  });

  it('wraps a thrown error in Failure via mapAxiosError', async () => {
    const instance = createFakeInstance(async () => {
      throw new Error('boom');
    });
    const result = await request(instance, { url: '/thing', method: 'GET' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('boom');
    }
  });

  it('maps a response-less axios error to NetworkError', async () => {
    const instance = createFakeInstance(async () => {
      throw { isAxiosError: true, message: 'Network Error' };
    });
    const result = await request(instance, { url: '/thing', method: 'GET' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NetworkError);
    }
  });

});

describe('createRequestMethods', () => {

  it('builds a GET request with the right method and url', async () => {
    const instance = createFakeInstance(async () => ({ data: 'ok' }));
    const http = createRequestMethods(instance);

    await http.get('/foo');

    expect(instance.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'GET', url: '/foo' }));
  });

  it('builds a POST request carrying the body', async () => {
    const instance = createFakeInstance(async () => ({ data: 'ok' }));
    const http = createRequestMethods(instance);

    await http.post('/foo', { name: 'x' });

    expect(instance.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', url: '/foo', data: { name: 'x' } }),
    );
  });

  it('builds a DELETE request with no body', async () => {
    const instance = createFakeInstance(async () => ({ data: 'ok' }));
    const http = createRequestMethods(instance);

    await http.delete('/foo/1');

    expect(instance.request).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', url: '/foo/1' }));
  });

});

import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function makeContext(url = '/test'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
    }),
  } as unknown as ExecutionContext;
}

function makeHandler(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('wraps an object response in the success envelope', (done) => {
    const data = { id: 'abc', name: 'Test' };

    interceptor
      .intercept(makeContext('/vehicles/abc'), makeHandler(data))
      .subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data,
          meta: {
            path: '/vehicles/abc',
          },
        });
        expect((result as Record<string, unknown>).meta).toHaveProperty(
          'timestamp',
        );
        expect((result as Record<string, unknown>).meta).not.toHaveProperty(
          'count',
        );
        done();
      });
  });

  it('wraps an array response and includes count in meta', (done) => {
    const data = [{ id: '1' }, { id: '2' }, { id: '3' }];

    interceptor
      .intercept(makeContext('/vehicles'), makeHandler(data))
      .subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data,
          meta: {
            path: '/vehicles',
            count: 3,
          },
        });
        done();
      });
  });

  it('passes null through without wrapping (204 No Content)', (done) => {
    interceptor
      .intercept(makeContext('/users/abc'), makeHandler(null))
      .subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
  });

  it('passes undefined through without wrapping (204 No Content)', (done) => {
    interceptor
      .intercept(makeContext('/users/abc'), makeHandler(undefined))
      .subscribe((result) => {
        expect(result).toBeUndefined();
        done();
      });
  });

  it('wraps an empty array and sets count to 0', (done) => {
    interceptor
      .intercept(makeContext('/drivers'), makeHandler([]))
      .subscribe((result) => {
        expect(result).toMatchObject({
          success: true,
          data: [],
          meta: { count: 0 },
        });
        done();
      });
  });

  it('includes a valid ISO timestamp in meta', (done) => {
    const before = Date.now();
    interceptor
      .intercept(makeContext('/test'), makeHandler({ id: 'x' }))
      .subscribe((result) => {
        const ts = (result as { meta: { timestamp: string } }).meta.timestamp;
        expect(new Date(ts).getTime()).toBeGreaterThanOrEqual(before);
        done();
      });
  });
});

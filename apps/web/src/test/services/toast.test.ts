import { toast } from 'react-toastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '../../services/toast';

vi.mock('react-toastify', () => ({ toast: vi.fn() }));
vi.mock('../../components/toast', () => ({
  ToastContent: vi.fn(),
  default: vi.fn(),
}));

const mockedToast = vi.mocked(toast);

describe('showToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to bottom-right and a type+title toastId', () => {
    showToast(
      'Login Successful',
      'You have successfully logged in.',
      'success'
    );

    expect(mockedToast).toHaveBeenCalledWith(expect.any(Object), {
      type: 'success',
      position: 'bottom-right',
      toastId: 'success-Login Successful',
    });
  });

  it('defaults to the "default" type when none is given', () => {
    showToast('Test Title');

    expect(mockedToast).toHaveBeenCalledWith(expect.any(Object), {
      type: 'default',
      position: 'bottom-right',
      toastId: 'default-Test Title',
    });
  });

  it('lets caller-supplied options override the defaults, including toastId', () => {
    showToast('Test', 'Description', 'error', {
      autoClose: 5000,
      toastId: 'custom-id',
    });

    expect(mockedToast).toHaveBeenCalledWith(expect.any(Object), {
      type: 'error',
      position: 'bottom-right',
      toastId: 'custom-id',
      autoClose: 5000,
    });
  });

  it('derives distinct default toastIds for the same title across types', () => {
    showToast('Login Failed!', 'a', 'error');
    showToast('Login Failed!', 'b', 'warning');

    expect(mockedToast).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.objectContaining({ toastId: 'error-Login Failed!' })
    );
    expect(mockedToast).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.objectContaining({ toastId: 'warning-Login Failed!' })
    );
  });

  it('passes title and description through to ToastContent', () => {
    showToast('Test Title', 'Test Description');

    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        props: { title: 'Test Title', description: 'Test Description' },
      }),
      expect.any(Object)
    );
  });
});

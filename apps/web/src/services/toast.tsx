import { toast } from 'react-toastify';
import { ToastContent } from '../components/toast';

/**
 * Ported from intelehealth-hw-webapp-react's src/services/toast.tsx (dev
 * branch), same showToast(title, description?, type, options) signature so
 * call sites written against that convention work unchanged here.
 *
 * `toastId` is new versus the reference repo: it replicates the Angular
 * app's `ToastrModule.forRoot({ preventDuplicates: true })` (see
 * app.module.ts on intelehealth-doctor-webapp's ezazi_dev_master), which
 * react-toastify has no equivalent container flag for. showToast() defaults
 * it to a deterministic id derived from (type + title) so a repeat call
 * with the same title/type while that toast is still showing updates it
 * in place instead of stacking a duplicate.
 */
export interface ToastOptions {
  autoClose?: number;
  hideProgressBar?: boolean;
  closeOnClick?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  progress?: number | undefined;
  toastId?: string;
  position?:
    | 'top-right'
    | 'top-center'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-center'
    | 'bottom-left';
}

export const showToast = (
  title: string,
  description?: string,
  type: 'success' | 'error' | 'info' | 'warning' | 'default' = 'default',
  options?: ToastOptions
) => {
  const defaultOptions: ToastOptions = {
    position: 'bottom-right',
    toastId: `${type}-${title}`,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return toast(<ToastContent title={title} description={description} />, {
    type,
    ...mergedOptions,
  });
};

export default showToast;

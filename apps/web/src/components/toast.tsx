/**
 * Custom content rendered inside every react-toastify toast — ported from
 * intelehealth-hw-webapp-react's src/components/toast.tsx (dev branch),
 * unchanged: title (bold) + optional description (muted, smaller).
 */
interface ToastContentProps {
  title: string;
  description?: string;
}

export function ToastContent({ title, description }: ToastContentProps) {
  return (
    <div>
      <strong className="block text-sm font-semibold">{title}</strong>
      {description && (
        <span className="text-xs text-gray-600">{description}</span>
      )}
    </div>
  );
}

export default ToastContent;

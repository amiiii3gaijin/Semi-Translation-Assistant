import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'surface' | 'primary' | 'quiet';
  shape?: 'pill' | 'round' | 'rounded';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'surface', shape = 'pill', className, type = 'button', title, ...props }, ref,
) {
  // A title becomes a styled hover hint; the native tooltip is the OS's square box.
  return <button {...props} ref={ref} type={type} data-tip={title}
    className={clsx('ui-button', `ui-button--${variant}`, `ui-button--${shape}`, className)} />;
});

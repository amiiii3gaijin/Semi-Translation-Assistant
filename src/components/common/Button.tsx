import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'surface' | 'primary' | 'quiet' | 'ink' | 'danger';
  shape?: 'pill' | 'round' | 'rounded';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'surface', shape = 'pill', className, type = 'button', ...props }, ref,
) {
  return <button {...props} ref={ref} type={type}
    className={clsx('ui-button', `ui-button--${variant}`, `ui-button--${shape}`, className)} />;
});

import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { navigate } from './browser';

export function Link({ to, onClick, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || props.target === '_blank' || props.download != null) return;
    event.preventDefault();
    navigate(to);
  };
  return <a {...props} href={to} onClick={follow} />;
}

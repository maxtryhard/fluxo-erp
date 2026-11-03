// Domain restrictions are deliberately disabled until the organization defines them.
export const allowedEmailDomains: readonly string[] = [];
export const invalidEmailMessage = 'Informe um e-mail válido, como nome@empresa.com.';

export function normalizeAuthEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function emailValidationError(input: string): string | undefined {
  const email = normalizeAuthEmail(input);
  if (email.length > 254 || /\s/.test(email)) return invalidEmailMessage;
  const parts = email.split('@');
  if (parts.length !== 2) return invalidEmailMessage;
  const [local, domain] = parts;
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')
    || !/^[a-z0-9.!#$%&'*+/=?^_\x60{|}~-]+$/i.test(local)) return invalidEmailMessage;
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
    || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/i.test(labels.at(-1)!)) return invalidEmailMessage;
  if (allowedEmailDomains.length && !allowedEmailDomains.includes(domain)) return 'Use um e-mail do domínio autorizado pela organização.';
  return undefined;
}

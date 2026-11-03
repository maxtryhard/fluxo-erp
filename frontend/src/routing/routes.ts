import type { Role, User } from '../types';

export const roles: readonly Role[] = ['ADMIN', 'COMERCIAL', 'FINANCEIRO', 'RH', 'GERENCIA'];
export type Page = 'overview' | 'demands' | 'chat' | 'commercial' | 'finance' | 'people' | 'registrations' | 'profile';
export type PublicPage = 'home' | 'login' | 'register';
type ModuleDefinition = { path: string; label: string; title: string; roles: readonly Role[]; keywords?: string[] };

// These are the existing menu permissions. Department text never grants access.
export const modules: Record<Page, ModuleDefinition> = {
  overview: { path: '/dashboard', label: 'Visão geral', title: 'Visão geral', roles },
  demands: { path: '/demandas', label: 'Demandas', title: 'Todas as demandas', roles },
  chat: { path: '/mensagens', label: 'Conversas', title: 'Conversas', roles, keywords: ['chat', 'mensagens', 'setores'] },
  commercial: { path: '/comercial', label: 'Comercial', title: 'Comercial', roles: ['ADMIN', 'COMERCIAL'] },
  finance: { path: '/financeiro', label: 'Financeiro', title: 'Financeiro', roles: ['ADMIN', 'FINANCEIRO', 'GERENCIA'] },
  people: { path: '/pessoas', label: 'Pessoas & RH', title: 'Pessoas & RH', roles: ['ADMIN', 'RH', 'GERENCIA'] },
  registrations: { path: '/cadastros-pendentes', label: 'Cadastros pendentes', title: 'Cadastros pendentes', roles: ['ADMIN'] },
  profile: { path: '/perfil', label: 'Meu perfil', title: 'Meu perfil', roles, keywords: ['perfil', 'conta', 'usuário', 'usuario', 'account'] },
};
export const publicPaths: Record<PublicPage, string> = { home: '/', login: '/entrar', register: '/cadastro' };
export function isRole(value: unknown): value is Role { return typeof value === 'string' && roles.includes(value as Role); }
export function canAccess(user: User | null, page: Page): boolean {
  return !!user?.id && user.active === true && isRole(user.role) && modules[page].roles.includes(user.role);
}
export function pageForPath(pathname: string): Page | undefined {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(modules) as Page[]).find((page) => modules[page].path === path);
}
export function safeReturnPath(value: string | null): string | undefined {
  const page = value ? pageForPath(value) : undefined;
  return page ? modules[page].path : undefined;
}
export type RouteDecision =
  | { kind: 'public'; page: PublicPage }
  | { kind: 'protected'; page: Page }
  | { kind: 'forbidden'; page: Page }
  | { kind: 'not-found' }
  | { kind: 'redirect'; to: string };

export function resolveRoute(pathname: string, search: string, user: User | null): RouteDecision {
  const path = pathname.replace(/\/+$/, '') || '/';
  const publicPage = (Object.keys(publicPaths) as PublicPage[]).find((page) => publicPaths[page] === path);
  const authenticated = canAccess(user, 'overview');
  if (publicPage) {
    if (!authenticated) return { kind: 'public', page: publicPage };
    return { kind: 'redirect', to: safeReturnPath(new URLSearchParams(search).get('retorno')) ?? modules.overview.path };
  }
  const page = pageForPath(path);
  if (!authenticated) return { kind: 'redirect', to: publicPaths.login + (page ? `?retorno=${encodeURIComponent(modules[page].path)}` : '') };
  if (!page) return { kind: 'not-found' };
  return canAccess(user, page) ? { kind: 'protected', page } : { kind: 'forbidden', page };
}

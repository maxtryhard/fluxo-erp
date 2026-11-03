import { BriefcaseBusiness, CircleDollarSign, ClipboardList, LayoutDashboard, MessageSquare, ShieldCheck, UserRound, Users } from 'lucide-react';
import type { User } from '../types';
import { canAccess, modules, type Page } from './routes';

const icons = { overview: LayoutDashboard, demands: ClipboardList, chat: MessageSquare, commercial: BriefcaseBusiness, finance: CircleDollarSign, people: Users, registrations: ShieldCheck, profile: UserRound };
const groups: { label: string; pages: Page[] }[] = [
  { label: 'Workspace', pages: ['overview'] },
  { label: 'Operação', pages: ['demands', 'chat', 'commercial', 'finance', 'people'] },
  { label: 'Administração', pages: ['registrations'] },
  { label: 'Conta', pages: ['profile'] },
];
export function getNavigation(user: User) {
  return groups.map((group) => ({ label: group.label, items: group.pages.filter((page) => canAccess(user, page)).map((page) => ({ ...modules[page], page, icon: icons[page] })) })).filter((group) => group.items.length > 0);
}

import type { DirectMessage } from '../types';
export function mergeDirectMessages(previous: DirectMessage[],incoming: DirectMessage[]): DirectMessage[] {
 const merged=new Map(previous.map(message=>[message.id,message]));
 incoming.forEach(message=>merged.set(message.id,message));
 return [...merged.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
}
export function personInitials(name: string): string {
 return name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
}

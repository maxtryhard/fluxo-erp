import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Activity, BriefcaseBusiness, Camera, ShieldCheck, X } from 'lucide-react';
import type { User } from '../types';
import { uploadAvatar } from '../services/avatar';

interface ProfileProps {
  user: User;
  roleLabel: string;
  onAvatarChange: (url: string) => void;
}

export function UserAvatar({ user, className }: { user: User; className: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <span className={className} aria-hidden="true">
      {user.avatarUrl && failedUrl !== user.avatarUrl
        ? <img src={user.avatarUrl} alt="" onError={() => setFailedUrl(user.avatarUrl)} />
        : user.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function PhotoControl({ user, onAvatarChange }: Pick<ProfileProps, 'user' | 'onAvatarChange'>) {
  const input = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      onAvatarChange(await uploadAvatar(file));
      setMessage('Foto de perfil atualizada.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível atualizar sua foto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="profile-photo-row">
        <UserAvatar user={user} className="profile-large-avatar" />
        <button className="secondary-button profile-photo-button" type="button" disabled={saving} onClick={() => input.current?.click()}>
          <Camera size={15} aria-hidden="true" />{saving ? 'Salvando...' : 'Alterar foto'}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Escolher foto de perfil" hidden disabled={saving} onChange={(event) => void selectPhoto(event)} />
      </div>
      <p className="profile-photo-hint">JPG, PNG ou WebP · até 5 MB · recorte central automático</p>
      {error && <p className="profile-photo-error" role="alert">{error}</p>}
      <span className="profile-photo-status" role="status">{message}</span>
    </>
  );
}

export function ProfileCard({ user, roleLabel, onAvatarChange }: ProfileProps) {
  return (
    <article className="profile-card">
      <div className="profile-cover" aria-hidden="true"><span>fluxo.</span><Activity size={100} strokeWidth={1} /></div>
      <div className="profile-body">
        <PhotoControl user={user} onAvatarChange={onAvatarChange} />
        <div className="profile-card-heading"><h2>{user.name}</h2><span><BriefcaseBusiness size={14} aria-hidden="true" />{roleLabel}</span></div>
        <div className="profile-fields">
          <div><span>Endereço de e-mail</span><strong>{user.email}</strong></div>
          <div><span>Área</span><strong>{user.department}</strong></div>
          <div><span>Nível de acesso</span><strong>{roleLabel}</strong></div>
          <div><span>Conta</span><strong className="account-active"><i />{user.active ? 'Ativa' : 'Inativa'}</strong></div>
        </div>
        <div className="profile-security"><ShieldCheck size={21} aria-hidden="true" /><span><strong>Conta protegida</strong><small>Seu acesso respeita as permissões da sua área.</small></span></div>
      </div>
    </article>
  );
}

export function ProfileDialog({ onClose, ...props }: ProfileProps & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  return (
    <dialog ref={dialog} id="account-profile-dialog" className="profile-dialog" aria-label="Meu perfil"
      onClose={() => {
        // StrictMode reopens the dialog after effect cleanup. Ignore the queued
        // close event from that cleanup when the dialog is already open again.
        if (!dialog.current?.open) onClose();
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="profile-dialog-content">
        <button type="button" className="profile-dialog-close" aria-label="Fechar perfil" onClick={onClose} autoFocus><X size={18} /></button>
        <ProfileCard {...props} />
      </div>
    </dialog>
  );
}

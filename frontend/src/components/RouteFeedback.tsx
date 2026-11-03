import { Link } from '../routing/Link';

export function RouteFeedback({ denied }: { denied: boolean }) {
  return <section className="empty-state" role="status"><h1>{denied ? 'Acesso restrito' : 'Página não encontrada'}</h1><p>{denied ? 'Seu perfil não tem permissão para acessar esta área.' : 'Confira o endereço ou escolha uma área no menu.'}</p><Link to="/dashboard" className="secondary-button">Ir para visão geral</Link></section>;
}

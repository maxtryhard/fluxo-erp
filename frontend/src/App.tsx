import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { api } from './services/api';
import { ProfileCard, ProfileDialog, UserAvatar } from './components/ProfileCard';
import { Communication } from './components/Communication';
import { ThemeToggle } from './components/ThemeToggle';
import { PeoplePage } from './components/PeoplePage';
import { FinancePage } from './components/FinancePage';
import { DemandReview } from './components/DemandReview';
import type { CreateDemandInput, Demand, DemandHistory, DemandStatus, Overview, RegistrationRequest, Role, User } from './types';

const DataVisualization = lazy(() => import('./components/DataVisualization'));

type Page = 'overview' | 'demands' | 'commercial' | 'finance' | 'people' | 'registrations' | 'profile' | 'chat';

const pageLabels: Record<Page, string> = {
  overview: 'Visão geral',
  chat: 'Conversas',
  demands: 'Todas as demandas',
  commercial: 'Comercial',
  finance: 'Financeiro',
  people: 'Pessoas & RH',
  registrations: 'Cadastros pendentes',
  profile: 'Meu perfil',
};

const statusLabels: Record<string, string> = {
  ORCAMENTO: 'Em orçamento',
  APROVADO_COMERCIAL: 'Aprovado pelo comercial',
  EM_ANALISE_FINANCEIRA: 'Análise financeira',
  FATURADO: 'Faturado',
  ALOCACAO_RH: 'Alocação de equipe',
  EM_EXECUCAO: 'Em execução',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const date = (value: string): string =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

const todayLabel = (): string =>
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());

const stageChartColors = ['var(--stage-commercial)', '#ff4c20', '#777a74', '#a8aaa4', '#d1d2cc'];

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  FINANCEIRO: 'Financeiro',
  RH: 'Recursos Humanos',
  GERENCIA: 'Gerência',
};

const navGroups: { label: string; items: { page: Page; label: string; icon: typeof LayoutDashboard; roles?: Role[]; keywords?: string[] }[] }[] = [
  {
    label: 'Workspace',
    items: [{ page: 'overview', label: 'Visão geral', icon: LayoutDashboard }],
  },
  {
    label: 'Operação',
    items: [
      { page: 'demands', label: 'Demandas', icon: ClipboardList },
      { page: 'chat', label: 'Conversas', icon: MessageSquare, keywords: ['chat', 'mensagens', 'setores'] },
      { page: 'commercial', label: 'Comercial', icon: BriefcaseBusiness, roles: ['ADMIN', 'COMERCIAL'] },
      { page: 'finance', label: 'Financeiro', icon: CircleDollarSign, roles: ['ADMIN', 'FINANCEIRO', 'GERENCIA'] },
      { page: 'people', label: 'Pessoas & RH', icon: Users, roles: ['ADMIN', 'RH', 'GERENCIA'] },
    ],
  },
  {
    label: 'Administração',
    items: [{ page: 'registrations', label: 'Cadastros pendentes', icon: ShieldCheck, roles: ['ADMIN'] }],
  },
  {
    label: 'Conta',
    items: [{ page: 'profile', label: 'Meu perfil', icon: UserRound, keywords: ['perfil', 'conta', 'usuário', 'usuario', 'account'] }],
  },
];

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('overview');
  const [demands, setDemands] = useState<Demand[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [historyDemand, setHistoryDemand] = useState<Demand | null>(null);
  const [history, setHistory] = useState<DemandHistory[]>([]);
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const updateAvatar = (url: string) => setUser((current) => current ? { ...current, avatarUrl: url } : current);
  const [navSearch, setNavSearch] = useState('');

  const refresh = useCallback(async () => {
    const data = await api.demands();
    setDemands(data);
    setOverview(await api.overview());
  }, []);

  const refreshRegistrationRequests = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    setRegistrationRequests(await api.registrationRequests());
  }, [user]);

  useEffect(() => {
    void refreshRegistrationRequests().catch((refreshError: unknown) => {
      setError(refreshError instanceof Error ? refreshError.message : 'Não foi possível carregar os cadastros pendentes.');
    });
  }, [refreshRegistrationRequests]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profile = await api.currentUser();
        if (!active) return;
        if (!profile) return;
        setUser(profile);
        await refresh();
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar sua sessão.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [refresh]);

  const filteredDemands = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const byPage = demands.filter((item) => {
      if (page === 'finance') return item.status === 'APROVADO_COMERCIAL';
      if (page === 'people') return item.status === 'ALOCACAO_RH' && !item.rhApproved;
      if (page === 'commercial') return item.status === 'ORCAMENTO' || item.status === 'APROVADO_COMERCIAL';
      return true;
    });
    return byPage.filter((item) =>
      [item.code, item.title, item.clientName, statusLabels[item.status]]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(query),
    );
  }, [demands, page, search]);

  const handleLogin = async (email: string, password: string) => {
    setError('');
    try {
      const loggedInUser = await api.login(email, password);
      setUser(loggedInUser);
      setPage('overview');
      await refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.');
      throw loginError;
    }
  };

  const handleRegister = async (name: string, email: string, password: string): Promise<boolean> => {
    setError('');
    try {
      await api.register(name, email, password);
      return true;
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Não foi possível enviar seu cadastro.');
      return false;
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setDemands([]);
    setOverview(null);
    setPage('overview');
  };

  const showHistory = async (item: Demand) => {
    try {
      setHistory(await api.demandHistory(item.id));
      setHistoryDemand(item);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : 'Não foi possível carregar o histórico.');
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
      await refresh();
      await refreshRegistrationRequests();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar as alterações.');
    }
  };

  if (loading) {
    return <div className="loading-screen"><span className="spinner" />Carregando seu espaço...</div>;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={error} />;
  }

  const authorizedNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(user.role)),
    }))
    .filter((group) => group.items.length > 0);
  const normalizedNavSearch = navSearch.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const visibleNavGroups = authorizedNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const searchableText = [item.label, group.label, ...(item.keywords ?? [])]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return searchableText.includes(normalizedNavSearch);
      }),
    }))
    .filter((group) => group.items.length > 0);
  const pageTitle = pageLabels[page];
  const requestCount = demands.filter((item) => !['ENTREGUE', 'CANCELADO'].includes(item.status)).length;
  const totalBudget = overview?.totalBudget ?? demands.reduce((sum, item) => sum + (item.budgetTotal ?? 0), 0);
  const totalInvoiced = overview?.totalInvoiced ?? demands.reduce((sum, item) => sum + (item.invoicedValue ?? 0), 0);

  return (
    <div className="app-shell horizontal-shell">
      <main className="main-area">
        <header className="topbar">
          <a
            className="brand topbar-brand"
            href="#"
            aria-label="Fluxo — ir para Visão geral"
            onClick={(event) => { event.preventDefault(); setPage('overview'); }}
          >
            <span className="brand-icon"><Activity size={18} strokeWidth={2.2} /></span>
            <span>fluxo<span className="brand-period">.</span><small>GESTÃO INTEGRADA</small></span>
          </a>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <ThemeToggle />
            <span className="today-label">{date(new Date().toISOString())}</span>
            <button
              className="topbar-profile"
              type="button"
              aria-label={`Abrir perfil de ${user.name}, ${roleLabels[user.role]}`}
              aria-haspopup="dialog"
              aria-expanded={profileOpen}
              aria-controls={profileOpen ? 'account-profile-dialog' : undefined}
              onClick={() => setProfileOpen(true)}
            >
              <UserAvatar user={user} className="topbar-avatar" />
              <span className="topbar-profile-meta"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="navigation-bar">
          <nav className="horizontal-nav" aria-label="Navegação principal">
            {visibleNavGroups.flatMap((group) => group.items).map(({ page: itemPage, label, icon: Icon }) => (
              <button key={itemPage} type="button" className={`dock-item ${page === itemPage ? 'dock-item-active' : ''}`}
                aria-label={label} aria-current={page === itemPage ? 'page' : undefined} title={label}
                onClick={() => { setPage(itemPage); setNavSearch(''); setNavSearchOpen(false); }}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span className="dock-label">{label}</span>
                {itemPage === 'registrations' && registrationRequests.length > 0 && <span className="dock-count" aria-label={`${registrationRequests.length} cadastros pendentes`}>{registrationRequests.length}</span>}
              </button>
            ))}
            {!visibleNavGroups.length && <span className="dock-empty" role="status">Nenhuma página encontrada.</span>}
            <span className="dock-divider" aria-hidden="true" />
            <button type="button" className={`dock-item dock-utility ${navSearchOpen ? 'dock-search-active' : ''}`} aria-label="Buscar páginas" title="Buscar páginas"
              aria-expanded={navSearchOpen} aria-controls="navigation-search" onClick={() => { setNavSearchOpen((open) => !open); setNavSearch(''); }}><Search size={18} /></button>
            <button type="button" className="dock-item dock-utility dock-logout" aria-label="Sair da conta" title="Sair da conta" onClick={() => void handleLogout()}><LogOut size={18} /></button>
          </nav>
          {navSearchOpen && <label className="dock-search" id="navigation-search"><Search size={16} aria-hidden="true" />
            <input type="search" aria-label="Buscar páginas do menu" placeholder="Buscar páginas..." value={navSearch} autoFocus onChange={(event) => setNavSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') { setNavSearchOpen(false); setNavSearch(''); } }} />
            <button type="button" aria-label="Fechar busca" onClick={() => { setNavSearchOpen(false); setNavSearch(''); }}><X size={16} /></button>
          </label>}
        </div>
        <div className="page-content">
          <div className="page-transition" key={page}>
          {error && <div className="alert" role="alert"><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={16} /></button></div>}
          {page === 'chat' ? (
            <section><div className="page-heading"><div><div className="eyebrow">COLABORAÇÃO</div><h1>Conversas</h1><p>Contexto compartilhado para uma operação conectada.</p></div></div><Communication user={user} /></section>
          ) : page === 'registrations' ? (
            <RegistrationRequestsPage requests={registrationRequests} onApprove={(id, role) => void runAction(() => api.approveRegistration(id, role))} onReject={(id) => void runAction(() => api.rejectRegistration(id))} />
          ) : page === 'profile' ? (
            <ProfilePage user={user} onAvatarChange={updateAvatar} />
          ) : page === 'finance' ? (
            <FinancePage user={user} demands={demands} onRefresh={refresh} renderDemand={(demand) => <DemandCard demand={demand} user={user} page="finance" showReview={user.role !== 'GERENCIA'} onHistory={() => void showHistory(demand)} onRefresh={refresh} />} />
          ) : page === 'people' ? (
            <PeoplePage user={user} demands={demands} onRefresh={refresh} renderDemand={(demand) => <DemandCard demand={demand} user={user} page="people" showReview={false} onHistory={() => void showHistory(demand)} onRefresh={refresh} />} />
          ) : page === 'overview' ? (
            <OverviewPage user={user} demands={demands} activeCount={requestCount} totalBudget={totalBudget} totalInvoiced={totalInvoiced} onOpenDemands={() => setPage('demands')} onHistory={showHistory} />
          ) : (
            <section>
              <div className="page-heading">
                <div><div className="eyebrow">OPERAÇÃO</div><h1>{pageTitle}</h1><p>{pageDescription(page)}</p></div>
                {page === 'commercial' && user.role !== 'FINANCEIRO' && user.role !== 'RH' && <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17} /> Nova demanda</button>}
              </div>
              <div className="filter-row">
                <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar demanda, cliente ou código..." /></label>
                <span className="results-count">{filteredDemands.length} registros</span>
              </div>
              {filteredDemands.length ? (
                <div className="demand-list">
                  {filteredDemands.map((item) => (
                    <DemandCard key={item.id} demand={item} user={user} page={page} onHistory={() => void showHistory(item)} onRefresh={refresh} />
                  ))}
                </div>
              ) : <EmptyState page={page} onCreate={() => setShowCreate(true)} />}
            </section>
          )}
          </div>
        </div>
      </main>
      {profileOpen && <ProfileDialog user={user} roleLabel={roleLabels[user.role]} onAvatarChange={updateAvatar} onClose={() => setProfileOpen(false)} />}
      {showCreate && <CreateDemandModal onClose={() => setShowCreate(false)} onSubmit={(data) => runAction(async () => { await api.createDemand(data); setShowCreate(false); setPage('demands'); })} />}
      {historyDemand && <HistoryModal demand={historyDemand} history={history} onClose={() => setHistoryDemand(null)} />}
    </div>
  );
}

function pageDescription(page: Page): string {
  switch (page) {
    case 'demands': return 'Acompanhe cada solicitação do orçamento à entrega, com histórico em um só lugar.';
    case 'commercial': return 'Cadastre oportunidades e acompanhe propostas em andamento.';
    case 'finance': return 'Revise orçamento, condições e faturamento das demandas.';
    case 'people': return 'Planeje a equipe necessária e acompanhe a alocação de pessoas.';
    case 'registrations': return 'Revise solicitações e atribua a área antes de liberar o acesso ao sistema.';
    default: return 'Acompanhe a operação integrada.';
  }
}

function LoginScreen({ onLogin, onRegister, error }: {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<boolean>;
  error: string;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setFormError('As senhas informadas não coincidem.');
          return;
        }
        setSubmitted(await onRegister(name, email, password));
      } else {
        await onLogin(email, password);
      }
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="login-layout">
      <div className="login-theme-control"><ThemeToggle /></div>
      <div className="login-landscape" aria-hidden="true" />
      <div className="login-scene-caption" aria-hidden="true"><span>CONEXÕES QUE MOVEM</span><strong>Um fluxo.<br />Novas possibilidades.</strong><small>Comercial · Financeiro · Pessoas</small></div>
      <section className="login-panel">
        <header className="login-header">
          <a className="brand login-brand" href="#" onClick={(event) => event.preventDefault()}>
            <span className="brand-icon"><Activity size={20} strokeWidth={2.2} /></span>
            <span>fluxo<span className="brand-period">.</span><small>GESTÃO INTEGRADA</small></span>
          </a>
          <div className="auth-switch">
            <span>{submitted ? 'Cadastro enviado' : mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}</span>
            <button
              type="button"
              onClick={() => {
                if (submitted) setSubmitted(false);
                setMode(mode === 'login' ? 'register' : 'login');
                setFormError('');
              }}
            >
              {submitted ? 'Entrar' : mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </div>
        </header>
        <div className="login-content">
          {submitted ? (
            <div className="login-form registration-success" role="status">
              <span className="success-mark"><Check size={23} /></span>
              <span className="login-overline">SOLICITAÇÃO ENVIADA</span>
              <h2>Cadastro em análise</h2>
              <p>Um administrador precisa aprovar seu acesso e definir sua área antes de você entrar no sistema.</p>
              <div className="pending-note"><ShieldCheck size={17} /><span>Você poderá entrar com este e-mail e senha após a aprovação.</span></div>
            </div>
          ) : (
            <form className="login-form" onSubmit={(event) => void submit(event)}>
              <span className="login-emblem"><UserRound size={23} strokeWidth={1.7} /></span>
              <span className="login-overline">{mode === 'login' ? 'BEM-VINDO(A) DE VOLTA' : 'ACESSO À PLATAFORMA'}</span>
              <h1>{mode === 'login' ? 'Acesse sua conta' : 'Solicite seu cadastro'}</h1>
              <p>{mode === 'login' ? 'Entre para acompanhar o trabalho da sua equipe.' : 'Um administrador aprovará seu acesso e atribuirá sua área.'}</p>
              {(error || formError) && <div className="alert login-alert" role="alert">{formError || error}</div>}
              {mode === 'register' && <label className="field-label">Nome completo<input type="text" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>}
              <label className="field-label">E-mail corporativo<input type="email" autoComplete="username" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></label>
              <label className="field-label">Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 6 : 12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Mínimo de 12 caracteres' : 'Digite sua senha'} /></label>
              {mode === 'register' && <label className="field-label">Confirme a senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></label>}
              <button className="primary-button login-submit" disabled={submitting}>{submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar na plataforma' : 'Enviar solicitação'}<ArrowRight size={17} /></button>
            </form>
          )}
        </div>
        <footer className="login-footer">
          <span>Fluxo · Gestão integrada</span>
          <span><ShieldCheck size={15} /> Conexão protegida</span>
        </footer>
      </section>

    </div>
  );
}

function OverviewPage({ user, demands, activeCount, totalBudget, totalInvoiced, onOpenDemands, onHistory }: {
  user: User; demands: Demand[]; activeCount: number; totalBudget: number; totalInvoiced: number;
  onOpenDemands: () => void; onHistory: (demand: Demand) => void;
}) {
  const canSeeFinancialData = ['ADMIN', 'GERENCIA', 'FINANCEIRO'].includes(user.role);
  const canSeeBudget = user.role !== 'RH';
  const stages: { label: string; statuses: DemandStatus[] }[] = [
    { label: 'Comercial', statuses: ['ORCAMENTO'] },
    { label: 'Financeiro', statuses: ['APROVADO_COMERCIAL', 'EM_ANALISE_FINANCEIRA', 'FATURADO'] },
    { label: 'Pessoas & RH', statuses: ['ALOCACAO_RH'] },
    { label: 'Execução', statuses: ['EM_EXECUCAO'] },
    { label: 'Encerradas', statuses: ['ENTREGUE', 'CANCELADO'] },
  ];
  const stageSummary = stages.map((stage) => {
    const stageDemands = demands.filter((demand) => stage.statuses.includes(demand.status));
    return {
      ...stage,
      count: stageDemands.length,
      budget: stageDemands.reduce((sum, demand) => sum + (demand.budgetTotal ?? 0), 0),
      invoiced: stageDemands.reduce((sum, demand) => sum + (demand.invoicedValue ?? 0), 0),
    };
  });
  const recent = demands.slice(0, 5);
  const stagesWithDemands = stageSummary.filter((stage) => stage.count > 0);
  const maxStageCount = Math.max(...stageSummary.map((stage) => stage.count), 1);

  return (
    <section className="analytics-dashboard">
      <div className="page-heading overview-heading">
        <div><div className="eyebrow">{todayLabel()}</div><h1>Visão geral</h1><p>Olá, {user.name.split(' ')[0]}. Veja como está a operação.</p></div>
        <button className="primary-button" onClick={onOpenDemands}><FileText size={16} /> Abrir demandas <ArrowRight size={15} /></button>
      </div>

      <div className="analytics-summary-grid" aria-label="Indicadores da operação">
        <MetricCard icon={ClipboardList} label="Demandas cadastradas" value={String(demands.length)} note="No fluxo integrado" tone="orange" featured />
        <MetricCard
          icon={Activity}
          label="Demandas ativas"
          value={String(activeCount)}
          note={`${demands.length} ${demands.length === 1 ? 'demanda cadastrada' : 'demandas cadastradas'}`}
          tone="green"
        />
        {canSeeBudget && <MetricCard icon={CircleDollarSign} label="Orçamento total" value={money(totalBudget)} note="Soma das demandas" tone="blue" />}
        {canSeeFinancialData && <MetricCard icon={ArrowDownToLine} label="Total faturado" value={money(totalInvoiced)} note="Valores registrados" tone="orange" />}
      </div>

      <div className="analytics-content-grid">
        <section className="analytics-panel stage-analytics" aria-labelledby="stage-analytics-title">
          <div className="analytics-panel-heading">
            <div>
              <span className="analytics-kicker">{canSeeFinancialData ? 'FINANCEIRO' : 'OPERAÇÃO'}</span>
              <h2 id="stage-analytics-title">{canSeeFinancialData ? 'Orçamento e faturamento por etapa' : 'Demandas por etapa'}</h2>
              <p>{canSeeFinancialData ? 'Valores registrados por área do fluxo' : 'Volume atual em cada etapa do fluxo'}</p>
            </div>
            <span className="chart-total"><strong>{demands.length}</strong><small>no total</small></span>
          </div>
          {demands.length ? (
            <div className="stage-chart" role="img" aria-label={canSeeFinancialData ? 'Gráfico de orçamento e valores faturados agrupados por etapa atual' : 'Gráfico da quantidade de demandas agrupadas por etapa atual'}>
              <Suspense fallback={<div className="chart-placeholder" role="status">Carregando gráfico...</div>}>
                <DataVisualization mode={canSeeFinancialData ? 'financial' : 'volume'} data={stageSummary} />
              </Suspense>
              {canSeeFinancialData && <div className="chart-legend">
                <span><i className="legend-budget" style={{ backgroundColor: '#6974ef' }} /> Orçamento</span>
                <span><i className="legend-invoiced" style={{ backgroundColor: '#ff6534' }} /> Faturado</span>
              </div>}
            </div>
          ) : (
            <div className="analytics-empty"><ClipboardList size={22} /><strong>Seu fluxo começa aqui</strong><span>Cadastre uma demanda para acompanhar a operação por etapa.</span><button className="text-button" onClick={onOpenDemands}>Ver demandas <ArrowRight size={14} /></button></div>
          )}
        </section>

        <div className="analytics-side-stack">
          <section className="analytics-panel stage-mix-analytics" aria-labelledby="stage-mix-title">
            <div className="analytics-panel-heading compact">
              <div><span className="analytics-kicker">OPERAÇÃO</span><h2 id="stage-mix-title">Distribuição por etapa</h2></div>
              <span className="finance-icon"><Activity size={19} /></span>
            </div>
            {stagesWithDemands.length ? (
              <div className="stage-mix-content">
                <div className="stage-donut" role="img" aria-label={`Distribuição de ${demands.length} demandas por etapa`}>
                  <Suspense fallback={<div className="chart-placeholder" role="status">Carregando gráfico...</div>}>
                    <DataVisualization mode="distribution" data={stagesWithDemands} />
                  </Suspense>
                  <span className="stage-donut-center"><strong>{demands.length}</strong><small>demandas</small></span>
                </div>
                <div className="stage-mix-legend">
                  {stageSummary.map((stage, index) => (
                    <div className="stage-mix-row" key={stage.label}>
                      <span className="stage-mix-label"><i style={{ backgroundColor: stageChartColors[index] }} />{stage.label}</span>
                      <strong>{stage.count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="stage-mix-empty">Os dados por etapa aparecerão quando houver demandas.</div>
            )}
          </section>

          <section className="analytics-panel stage-counts-panel" aria-labelledby="stage-counts-title">
            <div className="analytics-panel-heading compact">
              <div><span className="analytics-kicker">FLUXO ATUAL</span><h2 id="stage-counts-title">Demandas por etapa</h2></div>
            </div>
            <div className="stage-count-list">
              {stageSummary.map((stage, index) => (
                <div className="stage-count-row" key={stage.label}>
                  <span className="stage-count-label">{stage.label}</span>
                  <span className="stage-count-track" aria-hidden="true">
                    <span style={{ width: `${(stage.count / maxStageCount) * 100}%`, backgroundColor: stageChartColors[index] }} />
                  </span>
                  <strong aria-label={`${stage.count} demandas`}>{stage.count}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="analytics-panel recent-analytics" aria-labelledby="recent-analytics-title">
          <div className="analytics-panel-heading compact">
            <div><span className="analytics-kicker">ACOMPANHAMENTO</span><h2 id="recent-analytics-title">Demandas recentes</h2><p>Últimas atualizações da operação</p></div>
            <button className="text-button" onClick={onOpenDemands}>Ver todas <ArrowRight size={14} /></button>
          </div>
          {recent.length ? (
            <div className="analytics-table-wrap">
              <table className="analytics-demand-table">
                <thead>
                  <tr><th>Demanda</th><th>Cliente</th><th>Status</th>{canSeeBudget && <th>Orçamento</th>}</tr>
                </thead>
                <tbody>
                  {recent.map((demand) => (
                    <tr key={demand.id}>
                      <td><button className="demand-table-trigger" onClick={() => onHistory(demand)} aria-label={`Ver histórico da demanda ${demand.code}`}>
                        <strong>{demand.title}</strong><small>{demand.code}</small>
                      </button></td>
                      <td>{demand.clientName}</td>
                      <td><StatusBadge status={demand.status} /></td>
                      {canSeeBudget && <td className="demand-table-amount">{demand.budgetTotal === undefined ? '—' : money(demand.budgetTotal)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="recent-empty">As demandas cadastradas aparecerão aqui.</div>
          )}
      </section>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone, featured = false }: { icon: typeof Activity; label: string; value: string; note: string; tone: string; featured?: boolean }) {
  return <div className={`metric-card ${featured ? 'metric-card-featured' : ''}`}><div className={`metric-icon metric-${tone}`}><Icon size={18} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></div>;
}

function DemandCard({ demand, user, page, onHistory, onRefresh, showReview = true }: {
  demand: Demand; user: User; page: Page; onHistory: () => void; onRefresh: () => Promise<void>; showReview?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="demand-card">
      <div className="demand-card-main">
        <div className="demand-code"><span className="demand-symbol"><FileText size={17} /></span><div><span>{demand.code}</span><small>{date(demand.createdAt)}</small></div></div>
        <div className="demand-info"><h3>{demand.title}</h3><p>{demand.clientName}</p></div>
        <StatusBadge status={demand.status} />
        {demand.budgetTotal !== undefined && <div className="demand-amount"><span>ORÇAMENTO</span><strong>{money(demand.budgetTotal)}</strong></div>}
        <button className={`expand-button ${expanded ? 'expanded' : ''}`} aria-label={expanded ? 'Fechar detalhes' : 'Abrir detalhes'} onClick={() => setExpanded(!expanded)}><ChevronDown size={18} /></button>
      </div>
      {expanded && <div className="demand-details">
        <div className="detail-description"><strong>Resumo da demanda</strong><p>{demand.description}</p><button className="text-button history-link" onClick={onHistory}>Ver histórico disponível para sua área <ArrowRight size={14} /></button></div>
        {(demand.financialApproved !== undefined || demand.rhApproved !== undefined) && <div className="detail-facts">
          {demand.financialApproved !== undefined && <span>Financeiro <b>{demand.financialApproved ? 'Aprovado' : 'Pendente'}</b></span>}
          {demand.rhApproved !== undefined && <span>Equipe de RH <b>{demand.rhApproved ? `${demand.assignedStaffCount ?? 0} pessoas alocadas` : 'Pendente'}</b></span>}
        </div>}
        {showReview && <DemandReview demand={demand} page={page} onComplete={onRefresh} />}
        <Communication key={demand.updatedAt} user={user} demandId={demand.id} />
      </div>}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'ENTREGUE' || status === 'FATURADO' ? 'badge-green' : status === 'CANCELADO' ? 'badge-red' : status === 'ORCAMENTO' ? 'badge-blue' : status === 'EM_EXECUCAO' ? 'badge-purple' : 'badge-amber';
  return <span className={`status-badge ${tone}`}><i />{statusLabels[status] ?? status}</span>;
}

function EmptyState({ page, onCreate }: { page: Page; onCreate: () => void }) {
  return <div className="empty-state"><span className="empty-icon"><ClipboardList size={23} /></span><h3>Nenhuma demanda encontrada</h3><p>{page === 'finance' || page === 'people' ? 'Não há itens pendentes para sua área no momento.' : 'Tente alterar a busca ou cadastre uma nova demanda.'}</p>{page === 'commercial' && <button className="primary-button" onClick={onCreate}><Plus size={16} /> Nova demanda</button>}</div>;
}

function CreateDemandModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: CreateDemandInput) => Promise<void> }) {
  const [clientName, setClientName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    await onSubmit({ clientName, title, description, budgetTotal: Number(budget) });
    setSaving(false);
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-heading"><div><span className="eyebrow">COMERCIAL</span><h2 id="create-title">Nova demanda</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={19} /></button></div><p className="modal-intro">Cadastre uma oportunidade para iniciar o fluxo integrado.</p><form className="modal-form" onSubmit={(event) => void submit(event)}><label className="field-label">Cliente<input required minLength={2} value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nome da empresa" /></label><label className="field-label">Nome da demanda<input required minLength={3} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Implantação de sistema" /></label><label className="field-label">Descrição<textarea required minLength={5} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o escopo inicial..." /></label><label className="field-label">Valor do orçamento (R$)<input required type="number" min="0.01" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="0,00" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button type="submit" disabled={saving} className="primary-button">{saving ? 'Salvando...' : 'Criar demanda'}<ArrowRight size={16} /></button></div></form></section></div>;
}

function HistoryModal({ demand, history, onClose }: { demand: Demand; history: DemandHistory[]; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title"><div className="modal-heading"><div><span className="eyebrow">{demand.code}</span><h2 id="history-title">Histórico da demanda</h2></div><button className="icon-button" aria-label="Fechar" onClick={onClose}><X size={19} /></button></div><div className="history-demand-title">{demand.title}<span>{demand.clientName}</span></div><div className="timeline">{history.map((entry) => <div className="timeline-item" key={entry.id}><span className="timeline-dot" /><div className="timeline-content"><div className="timeline-top"><strong>{entry.action}</strong><time>{date(entry.timestamp)}</time></div><p>{entry.details}</p><small>{entry.authorName} · {entry.department}</small></div></div>)}{!history.length && <p className="table-empty">Ainda não há registros de histórico.</p>}</div></section></div>;
}

function ProfilePage({ user, onAvatarChange }: { user: User; onAvatarChange: (url: string) => void }) {
  return (
    <section className="account-page">
      <div className="page-heading">
        <div><div className="eyebrow">SUA CONTA</div><h1>Meu perfil</h1><p>Sua identidade dentro do Fluxo.</p></div>
      </div>
      <ProfileCard user={user} roleLabel={roleLabels[user.role]} onAvatarChange={onAvatarChange} />
    </section>
  );
}

function RegistrationRequestsPage({ requests, onApprove, onReject }: {
  requests: RegistrationRequest[];
  onApprove: (id: string, role: Exclude<Role, 'ADMIN'>) => void;
  onReject: (id: string) => void;
}) {
  return (
    <section>
      <div className="page-heading">
        <div><div className="eyebrow">ADMINISTRAÇÃO</div><h1>Cadastros pendentes</h1><p>Revise as solicitações e atribua o nível de acesso antes de liberar cada conta.</p></div>
        <span className="results-count">{requests.length} solicitações</span>
      </div>
      {requests.length ? (
        <div className="registration-list">
          {requests.map((request) => <RegistrationRequestCard key={request.id} request={request} onApprove={onApprove} onReject={onReject} />)}
        </div>
      ) : (
        <div className="empty-state"><span className="empty-icon"><ShieldCheck size={23} /></span><h3>Nenhuma solicitação pendente</h3><p>Novas solicitações de cadastro aparecerão aqui para revisão.</p></div>
      )}
    </section>
  );
}

function RegistrationRequestCard({ request, onApprove, onReject }: {
  request: RegistrationRequest;
  onApprove: (id: string, role: Exclude<Role, 'ADMIN'>) => void;
  onReject: (id: string) => void;
}) {
  const [role, setRole] = useState<Exclude<Role, 'ADMIN'>>('COMERCIAL');
  return (
    <article className="registration-card">
      <div className="registration-person">
        <span className="registration-avatar">{request.name.slice(0, 1).toUpperCase()}</span>
        <div><strong>{request.name}</strong><span>{request.email}</span><small>Solicitado em {date(request.createdAt)}</small></div>
      </div>
      <label className="registration-role">Área após aprovação
        <select value={role} onChange={(event) => setRole(event.target.value as Exclude<Role, 'ADMIN'>)}>
          <option value="COMERCIAL">Comercial</option>
          <option value="FINANCEIRO">Financeiro</option>
          <option value="RH">Recursos Humanos</option>
          <option value="GERENCIA">Gerência</option>
        </select>
      </label>
      <div className="registration-actions">
        <button className="secondary-button" onClick={() => onReject(request.id)}>Recusar</button>
        <button className="primary-button" onClick={() => onApprove(request.id, role)}><Check size={15} /> Aprovar</button>
      </div>
    </article>
  );
}

export default App;

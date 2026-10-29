import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { api } from './services/api';
import type { CreateDemandInput, Demand, DemandHistory, DemandStatus, Overview, RegistrationRequest, Role, User } from './types';

const DataVisualization = lazy(() => import('./components/DataVisualization'));

type Page = 'overview' | 'demands' | 'commercial' | 'finance' | 'people' | 'registrations' | 'profile';

const pageLabels: Record<Page, string> = {
  overview: 'Visão geral',
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

const stageChartColors = ['#6277dc', '#ee9b42', '#51b5d5', '#8584c8', '#a8adbb'];

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
      { page: 'commercial', label: 'Comercial', icon: BriefcaseBusiness, roles: ['ADMIN', 'COMERCIAL'] },
      { page: 'finance', label: 'Financeiro', icon: CircleDollarSign, roles: ['ADMIN', 'FINANCEIRO'] },
      { page: 'people', label: 'Pessoas & RH', icon: Users, roles: ['ADMIN', 'RH'] },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('overview'); setMobileNavOpen(false); }}>
          <span className="brand-icon"><Activity size={21} strokeWidth={2.4} /></span>
          <span>fluxo<span className="brand-period">.</span><small>GESTÃO INTEGRADA</small></span>
        </a>
        <div className="workspace-context">
          <span className="workspace-context-icon"><Activity size={16} /></span>
          <span><strong>Operação integrada</strong><small>Comercial · Financeiro · RH</small></span>
        </div>
        <label className="nav-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar páginas do menu"
            placeholder="Buscar páginas..."
            value={navSearch}
            onChange={(event) => setNavSearch(event.target.value)}
          />
          {navSearch && <button type="button" aria-label="Limpar busca do menu" onClick={() => setNavSearch('')}><X size={15} /></button>}
        </label>
        <nav className="main-nav" aria-label="Navegação principal">
          {visibleNavGroups.length ? visibleNavGroups.map((group) => (
            <section className="nav-section" key={group.label}>
              <h2 className="nav-section-title">{group.label}</h2>
              <div className="nav-section-items">
                {group.items.map(({ page: itemPage, label, icon: Icon }) => (
                  <button
                    key={itemPage}
                    className={`nav-item ${page === itemPage ? 'nav-item-active' : ''}`}
                    aria-current={page === itemPage ? 'page' : undefined}
                    onClick={() => { setPage(itemPage); setNavSearch(''); setMobileNavOpen(false); }}
                  >
                    <span className="nav-item-icon"><Icon size={17} strokeWidth={1.8} /></span>
                    <span className="nav-item-label">{label}</span>
                    {itemPage === 'demands' && <span className="nav-count" aria-label={`${requestCount} demandas ativas`}>{requestCount}</span>}
                    {itemPage === 'registrations' && registrationRequests.length > 0 && <span className="nav-count" aria-label={`${registrationRequests.length} cadastros pendentes`}>{registrationRequests.length}</span>}
                    {page === itemPage && <ChevronRight className="nav-item-current" size={16} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </section>
          )) : (
            <p className="nav-no-results" role="status">Nenhuma página encontrada.</p>
          )}
        </nav>
        <div className="sidebar-bottom">
          <button className="sidebar-logout" onClick={() => void handleLogout()}><LogOut size={16} />Sair da conta</button>
        </div>
      </aside>
      {mobileNavOpen && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Abrir menu" onClick={() => setMobileNavOpen(true)}><Menu size={21} /></button>
          <a
            className="brand topbar-brand"
            href="#"
            aria-label="Fluxo — ir para Visão geral"
            onClick={(event) => { event.preventDefault(); setPage('overview'); setMobileNavOpen(false); }}
          >
            <span className="brand-icon"><Activity size={18} strokeWidth={2.2} /></span>
            <span>fluxo<span className="brand-period">.</span><small>GESTÃO INTEGRADA</small></span>
          </a>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <span className="today-label">{date(new Date().toISOString())}</span>
            <button
              className="topbar-profile"
              type="button"
              aria-label={`Abrir perfil de ${user.name}, ${roleLabels[user.role]}`}
              onClick={() => setPage('profile')}
            >
              <span className="topbar-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
              <span className="topbar-profile-meta"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="page-content">
          {error && <div className="alert" role="alert"><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={16} /></button></div>}
          {page === 'registrations' ? (
            <RegistrationRequestsPage requests={registrationRequests} onApprove={(id, role) => void runAction(() => api.approveRegistration(id, role))} onReject={(id) => void runAction(() => api.rejectRegistration(id))} />
          ) : page === 'profile' ? (
            <ProfilePage user={user} />
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
                    <DemandCard key={item.id} demand={item} page={page} onHistory={() => void showHistory(item)} onCommercialApprove={() => void runAction(() => api.approveCommercial(item.id))} onFinancial={(data) => void runAction(() => api.updateFinancial(item.id, data))} onHr={(data) => void runAction(() => api.updateHr(item.id, data))} />
                  ))}
                </div>
              ) : <EmptyState page={page} onCreate={() => setShowCreate(true)} />}
            </section>
          )}
        </div>
      </main>
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
      <aside className="login-story" aria-label="Etapas do fluxo de trabalho">
        <div className="login-story-content">
          <span className="story-label"><span /> UMA OPERAÇÃO CONECTADA</span>
          <h2>Uma demanda.<br />Três áreas.<br /><span>Um fluxo claro.</span></h2>
          <p>Do primeiro contato à entrega, cada equipe sabe o que fazer e o que acontece em seguida.</p>
          <div className="journey-card">
            <div className="journey-step">
              <span className="journey-icon"><BriefcaseBusiness size={18} /></span>
              <span><strong>Comercial</strong><small>Proposta e orçamento</small></span>
              <span className="journey-index">01</span>
            </div>
            <div className="journey-connector" />
            <div className="journey-step">
              <span className="journey-icon"><CircleDollarSign size={18} /></span>
              <span><strong>Financeiro</strong><small>Análise e faturamento</small></span>
              <span className="journey-index">02</span>
            </div>
            <div className="journey-connector" />
            <div className="journey-step">
              <span className="journey-icon"><Users size={18} /></span>
              <span><strong>Pessoas & RH</strong><small>Alocação e entrega</small></span>
              <span className="journey-index">03</span>
            </div>
          </div>
          <div className="story-foot"><ShieldCheck size={16} /> Histórico compartilhado em cada etapa</div>
        </div>
      </aside>
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

  return (
    <section className="analytics-dashboard">
      <div className="page-heading overview-heading">
        <div><div className="eyebrow">{todayLabel()}</div><h1>Visão geral</h1><p>Olá, {user.name.split(' ')[0]}. Veja como está a operação.</p></div>
        <button className="primary-button" onClick={onOpenDemands}><FileText size={16} /> Abrir demandas <ArrowRight size={15} /></button>
      </div>

      <div className={`analytics-top-grid ${canSeeFinancialData ? '' : 'analytics-top-grid-limited'}`}>
        {canSeeFinancialData && <section className="analytics-panel stage-analytics" aria-labelledby="stage-analytics-title">
          <div className="analytics-panel-heading">
            <div><span className="analytics-kicker">FINANCEIRO</span><h2 id="stage-analytics-title">Orçamento e faturamento por etapa</h2><p>Valores registrados por área do fluxo</p></div>
            <span className="chart-total"><strong>{demands.length}</strong><small>no total</small></span>
          </div>
          {demands.length ? (
            <div className="stage-chart" role="img" aria-label="Gráfico de orçamento e valores faturados agrupados por etapa atual">
              <Suspense fallback={<div className="chart-placeholder" role="status">Carregando gráfico...</div>}>
                <DataVisualization mode="financial" data={stageSummary} />
              </Suspense>
              <div className="chart-legend">
                <span><i className="legend-budget" /> Orçamento</span>
                <span><i className="legend-invoiced" /> Faturado</span>
              </div>
            </div>
          ) : (
            <div className="analytics-empty"><ClipboardList size={22} /><strong>Seu fluxo começa aqui</strong><span>Cadastre uma demanda para acompanhar a operação por etapa.</span><button className="text-button" onClick={onOpenDemands}>Ver demandas <ArrowRight size={14} /></button></div>
          )}
        </section>}

        <aside className={`analytics-kpis ${canSeeFinancialData ? '' : 'analytics-kpis-limited'}`} aria-label="Indicadores da operação">
          {canSeeBudget && <MetricCard icon={CircleDollarSign} label="Orçamento total" value={money(totalBudget)} note="Soma das demandas" tone="blue" />}
          {canSeeFinancialData && <MetricCard icon={ArrowDownToLine} label="Total faturado" value={money(totalInvoiced)} note="Valores registrados" tone="orange" />}
          <MetricCard icon={ClipboardList} label="Demandas ativas" value={String(activeCount)} note={`${demands.length} demandas cadastradas`} tone="green" />
        </aside>
      </div>

      <div className="analytics-bottom-grid">
        <section className="analytics-panel stage-mix-analytics" aria-labelledby="stage-mix-title">
          <div className="analytics-panel-heading compact">
            <div><span className="analytics-kicker">OPERAÇÃO</span><h2 id="stage-mix-title">Distribuição por etapa</h2><p>Volume atual de demandas</p></div>
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

        <section className="analytics-panel recent-analytics" aria-labelledby="recent-analytics-title">
          <div className="analytics-panel-heading compact">
            <div><span className="analytics-kicker">ACOMPANHAMENTO</span><h2 id="recent-analytics-title">Demandas recentes</h2><p>Últimas atualizações da operação</p></div>
            <button className="text-button" onClick={onOpenDemands}>Ver todas <ArrowRight size={14} /></button>
          </div>
          {recent.length ? (
            <div className="recent-demand-list">
              {recent.map((demand) => (
                <button className="recent-demand" key={demand.id} onClick={() => onHistory(demand)}>
                  <span className="recent-demand-mark"><FileText size={16} /></span>
                  <span className="recent-demand-details"><strong>{demand.title}</strong><small>{demand.code} · {demand.clientName}</small></span>
                  <StatusBadge status={demand.status} />
                  {demand.budgetTotal !== undefined && <span className="recent-demand-value">{money(demand.budgetTotal)}</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="recent-empty">As demandas cadastradas aparecerão aqui.</div>
          )}
        </section>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, note, tone }: { icon: typeof Activity; label: string; value: string; note: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon size={18} /></div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></div>;
}

function DemandCard({ demand, page, onHistory, onCommercialApprove, onFinancial, onHr }: {
  demand: Demand; page: Page; onHistory: () => void; onCommercialApprove: () => void;
  onFinancial: (data: { paymentTerms: string; costEstimate: number; invoicedValue: number; approved: boolean }) => void;
  onHr: (data: { requiredRoles: string[]; assignedStaffCount: number; approved: boolean }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [terms, setTerms] = useState(demand.paymentTerms ?? '');
  const [cost, setCost] = useState(String(demand.costEstimate ?? 0));
  const [invoiced, setInvoiced] = useState(String(demand.invoicedValue ?? demand.budgetTotal));
  const [roles, setRoles] = useState((demand.requiredRoles ?? []).join(', '));
  const [staff, setStaff] = useState(String(demand.assignedStaffCount ?? 0));
  const [showAction, setShowAction] = useState(false);
  const canReviewFinance = page === 'finance';
  const canReviewHr = page === 'people';
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
        {page === 'commercial' && demand.status === 'ORCAMENTO' && <button className="primary-button review-trigger" onClick={onCommercialApprove}><Check size={15} /> Aprovar proposta e enviar ao Financeiro</button>}
        {(canReviewFinance || canReviewHr) && <button className="secondary-button review-trigger" onClick={() => setShowAction(!showAction)}>{showAction ? 'Cancelar' : canReviewFinance ? 'Revisar financeiro' : 'Revisar alocação'}<ChevronDown size={15} /></button>}
        {showAction && canReviewFinance && <form className="review-form" onSubmit={(event) => { event.preventDefault(); onFinancial({ paymentTerms: terms, costEstimate: Number(cost), invoicedValue: Number(invoiced), approved: true }); setShowAction(false); }}><label>Condição de pagamento<input value={terms} onChange={(event) => setTerms(event.target.value)} required placeholder="Ex.: 30/60/90 dias" /></label><label>Custo estimado (R$)<input type="number" min="0" step="0.01" value={cost} onChange={(event) => setCost(event.target.value)} required /></label><label>Valor faturado (R$)<input type="number" min="0" step="0.01" value={invoiced} onChange={(event) => setInvoiced(event.target.value)} required /></label><button className="primary-button" type="submit"><Check size={15} /> Aprovar análise</button></form>}
        {showAction && canReviewHr && <form className="review-form" onSubmit={(event) => { event.preventDefault(); onHr({ requiredRoles: roles.split(',').map((role) => role.trim()).filter(Boolean), assignedStaffCount: Number(staff), approved: true }); setShowAction(false); }}><label>Perfis necessários<input value={roles} onChange={(event) => setRoles(event.target.value)} required placeholder="Ex.: Analista, Desenvolvedor" /></label><label>Pessoas alocadas<input type="number" min="0" step="1" value={staff} onChange={(event) => setStaff(event.target.value)} required /></label><button className="primary-button" type="submit"><Check size={15} /> Confirmar alocação</button></form>}
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

function ProfilePage({ user }: { user: User }) {
  return <section><div className="page-heading"><div><div className="eyebrow">CONTA</div><h1>Meu perfil</h1><p>Informações da sua conta e nível de acesso.</p></div></div><div className="profile-card"><span className="profile-large-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div className="profile-card-heading"><h2>{user.name}</h2><span>{roleLabels[user.role]}</span></div><div className="profile-fields"><div><span>Endereço de e-mail</span><strong>{user.email}</strong></div><div><span>Área</span><strong>{user.department}</strong></div><div><span>Nível de acesso</span><strong>{roleLabels[user.role]}</strong></div><div><span>Conta</span><strong className="account-active"><i />Ativa</strong></div></div><div className="profile-security"><ShieldCheck size={18} /><span><strong>Conta protegida</strong><small>As permissões são aplicadas e validadas pelo servidor.</small></span></div></div></section>;
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

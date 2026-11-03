import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  FileText,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { api } from './services/api';
import { ProfileCard, ProfileDialog, UserAvatar } from './components/ProfileCard';
import { Communication } from './components/Communication';
import { ThemeToggle } from './components/ThemeToggle';
import { PublicEntry } from './components/PublicEntry';
import { NavigationDock } from './components/NavigationDock';
import { GuideInvitation, SystemGuide } from './components/SystemGuide';
import { getTourSteps, type TourStep } from './content/systemTour';
import type { GuideDestination } from './content/systemGuide';
import { DemandReview } from './components/DemandReview';
import { RouteFeedback } from './components/RouteFeedback';
import { useAuthSession } from './hooks/useAuthSession';
import { canAccess, modules, resolveRoute, safeReturnPath, type Page } from './routing/routes';
import { getNavigation } from './routing/navigation';
import { navigate, useBrowserRoute } from './routing/browser';
import { Link } from './routing/Link';
import type { CreateDemandInput, Demand, DemandHistory, DemandStatus, Overview, RegistrationRequest, Role, User } from './types';

const DataVisualization = lazy(() => import('./components/DataVisualization'));
const GuidedTour = lazy(() => import('./components/GuidedTour'));
const PeoplePage = lazy(() => import('./components/PeoplePage').then((module) => ({ default: module.PeoplePage })));
const FinancePage = lazy(() => import('./components/FinancePage').then((module) => ({ default: module.FinancePage })));

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

function App() {
  const route = useBrowserRoute();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [historyDemand, setHistoryDemand] = useState<Demand | null>(null);
  const [history, setHistory] = useState<DemandHistory[]>([]);
  const [navSearchOpen, setNavSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tourSteps, setTourSteps] = useState<TourStep[] | null>(null);
  const [navSearch, setNavSearch] = useState('');

  const resetPrivateState = useCallback(() => {
    setDemands([]); setOverview(null); setRegistrationRequests([]); setHistory([]); setHistoryDemand(null);
    setShowCreate(false); setProfileOpen(false); setGuideOpen(false); setTourSteps(null);
    setSearch(''); setNavSearch(''); setNavSearchOpen(false); setError('');
  }, []);
  const { user, loading, sessionError, acceptUser, clearSession, updateUser, epoch } = useAuthSession(resetPrivateState);
  const decision = resolveRoute(route.pathname, route.search, user);
  const page: Page = decision.kind === 'protected' ? decision.page : 'overview';
  const redirect = decision.kind === 'redirect' ? decision.to : undefined;
  const routePath = useRef(route.pathname);
  routePath.current = route.pathname;
  const setPage = (destination: Page) => { if (canAccess(user, destination)) navigate(modules[destination].path); };
  const identityVersion = epoch.current;
  const updateAvatar = (url: string) => {
    if (identityVersion === epoch.current) updateUser((current) => ({ ...current, avatarUrl: url }));
  };

  useEffect(() => { if (!loading && redirect) navigate(redirect, { replace: true }); }, [loading, redirect]);
  useEffect(() => {
    setSearch(''); setHistoryDemand(null); setShowCreate(false); setProfileOpen(false); setGuideOpen(false);
    setNavSearch(''); setNavSearchOpen(false);
    if (!loading && user) document.querySelector<HTMLElement>('.page-content')?.focus({ preventScroll: true });
  }, [route.pathname, loading, user?.id]);

  const refresh = useCallback(async () => {
    const version = epoch.current;
    const [data, summary] = await Promise.all([api.demands(), api.overview()]);
    if (version !== epoch.current) return;
    setDemands(data); setOverview(summary);
  }, [epoch]);
  const refreshRegistrationRequests = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    const version = epoch.current;
    const requests = await api.registrationRequests();
    if (version === epoch.current) setRegistrationRequests(requests);
  }, [user?.id, user?.role, epoch]);

  useEffect(() => {
    if (!user) return;
    const version = epoch.current;
    void Promise.all([refresh(), refreshRegistrationRequests()]).catch((error: unknown) => {
      if (version === epoch.current) setError(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
    });
  }, [user?.id, user?.role, refresh, refreshRegistrationRequests, epoch]);

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
      acceptUser(loggedInUser);
      navigate(safeReturnPath(new URLSearchParams(route.search).get('retorno')) ?? modules.overview.path, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.');
      throw loginError;
    }
  };

  const handleRegister = async (name: string, email: string, password: string): Promise<void> => {
    setError('');
    try {
      await api.register(name, email, password);
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Não foi possível enviar seu cadastro.');
      throw registrationError;
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      clearSession();
      navigate('/entrar', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível encerrar sua sessão. Tente novamente.');
    }
  };

  const showHistory = async (item: Demand) => {
    const version = epoch.current, path = routePath.current;
    try {
      const events = await api.demandHistory(item.id);
      if (version !== epoch.current || path !== routePath.current) return;
      setHistory(events); setHistoryDemand(item);
    } catch (historyError) {
      if (version !== epoch.current) return;
      setError(historyError instanceof Error ? historyError.message : 'Não foi possível carregar o histórico.');
    }
  };

  const runAction = async (action: () => Promise<void>) => {
    setError('');
    const version = epoch.current;
    try {
      await action();
      if (version !== epoch.current) return;
      await refresh();
      await refreshRegistrationRequests();
    } catch (actionError) {
      if (version !== epoch.current) return;
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar as alterações.');
    }
  };

  if (loading || redirect) {
    return <div className="loading-screen"><span className="spinner" />Carregando seu espaço...</div>;
  }

  if (!user) {
    return <PublicEntry page={decision.kind === 'public' ? decision.page : 'login'} onLogin={handleLogin} onRegister={handleRegister} error={error || sessionError} />;
  }

  const authorizedNavGroups = getNavigation(user);
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
  const routeBlocked = decision.kind === 'forbidden' || decision.kind === 'not-found';
  const pageTitle = decision.kind === 'forbidden' ? 'Acesso restrito' : decision.kind === 'not-found' ? 'Página não encontrada' : modules[page].title;
  const requestCount = demands.filter((item) => !['ENTREGUE', 'CANCELADO'].includes(item.status)).length;
  const totalBudget = overview?.totalBudget ?? demands.reduce((sum, item) => sum + (item.budgetTotal ?? 0), 0);
  const totalInvoiced = overview?.totalInvoiced ?? demands.reduce((sum, item) => sum + (item.invoicedValue ?? 0), 0);

  const startTour = (onlyPage?: GuideDestination) => {
    const allowed = authorizedNavGroups.flatMap((group) => group.items.map((item) => item.page));
    if (onlyPage && !allowed.includes(onlyPage)) return;
    setGuideOpen(false); setProfileOpen(false); setNavSearch(''); setNavSearchOpen(false);
    setTourSteps(getTourSteps(allowed, onlyPage));
  };

  return (
    <div className="app-shell horizontal-shell">
      <main className="main-area" data-tour-page={routeBlocked ? 'blocked' : page}>
        <header className="topbar">
          <Link
            className="brand topbar-brand"
            to="/dashboard"
            aria-label="Fluxo — ir para Visão geral"
          >
            <span className="brand-icon"><Activity size={18} strokeWidth={2.2} /></span>
            <span>fluxo<span className="brand-period">.</span><small>GESTÃO INTEGRADA</small></span>
          </Link>
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-right">
            <button type="button" className="guide-trigger" data-tour="guide-trigger" aria-label="Como usar o Fluxo" aria-haspopup="dialog" onClick={() => setGuideOpen(true)}><BookOpen size={18} aria-hidden="true" /><span>Como usar</span></button>
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
          <NavigationDock activePage={routeBlocked ? '' : page}>
            {visibleNavGroups.flatMap((group) => group.items).map(({ page: itemPage, label, icon: Icon }) => (
              <Link key={itemPage} to={modules[itemPage].path} className={`dock-item ${!routeBlocked && page === itemPage ? 'dock-item-active' : ''}`}
                aria-label={label} aria-current={!routeBlocked && page === itemPage ? 'page' : undefined}
                onClick={() => { setNavSearch(''); setNavSearchOpen(false); }}>
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span className="dock-label">{label}</span>
                {itemPage === 'registrations' && registrationRequests.length > 0 && <span className="dock-count" aria-label={`${registrationRequests.length} cadastros pendentes`}>{registrationRequests.length}</span>}
              </Link>
            ))}
            {!visibleNavGroups.length && <span className="dock-empty" role="status">Nenhuma página encontrada.</span>}
            <span className="dock-divider" aria-hidden="true" />
            <button type="button" className={`dock-item dock-utility ${navSearchOpen ? 'dock-search-active' : ''}`} aria-label="Buscar páginas"
              aria-expanded={navSearchOpen} aria-controls="navigation-search" onClick={() => { setNavSearchOpen((open) => !open); setNavSearch(''); }}><Search size={18} /></button>
            <button type="button" className="dock-item dock-utility dock-logout" aria-label="Sair da conta" onClick={() => void handleLogout()}><LogOut size={18} /></button>
          </NavigationDock>
          {navSearchOpen && <label className="dock-search" id="navigation-search"><Search size={16} aria-hidden="true" />
            <input type="search" aria-label="Buscar páginas do menu" placeholder="Buscar páginas..." value={navSearch} autoFocus onChange={(event) => setNavSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') { setNavSearchOpen(false); setNavSearch(''); } }} />
            <button type="button" aria-label="Fechar busca" onClick={() => { setNavSearchOpen(false); setNavSearch(''); }}><X size={16} /></button>
          </label>}
        </div>
        <div className="page-content" tabIndex={-1}>
          <div className="page-transition" key={route.pathname}>
          {!routeBlocked && page === 'overview' && <GuideInvitation onOpen={() => setGuideOpen(true)} />}
          {error && <div className="alert" role="alert"><span>{error}</span><button aria-label="Fechar aviso" onClick={() => setError('')}><X size={16} /></button></div>}
          {routeBlocked ? <RouteFeedback denied={decision.kind === 'forbidden'} /> : page === 'chat' ? (
            <section><div className="page-heading"><div><div className="eyebrow">COLABORAÇÃO</div><h1>Conversas</h1><p>Contexto compartilhado para uma operação conectada.</p></div></div><Communication user={user} /></section>
          ) : page === 'registrations' ? (
            <RegistrationRequestsPage requests={registrationRequests} onApprove={(id, role) => void runAction(() => api.approveRegistration(id, role))} onReject={(id) => void runAction(() => api.rejectRegistration(id))} />
          ) : page === 'profile' ? (
            <ProfilePage user={user} onAvatarChange={updateAvatar} />
          ) : page === 'finance' ? (
            <Suspense fallback={<p role="status">Carregando Financeiro...</p>}><FinancePage user={user} demands={demands} onRefresh={refresh} renderDemand={(demand) => <DemandCard demand={demand} user={user} page="finance" showReview={user.role !== 'GERENCIA'} onHistory={() => void showHistory(demand)} onRefresh={refresh} />} /></Suspense>
          ) : page === 'people' ? (
            <Suspense fallback={<p role="status">Carregando Pessoas e RH...</p>}><PeoplePage user={user} demands={demands} onRefresh={refresh} renderDemand={(demand) => <DemandCard demand={demand} user={user} page="people" showReview={false} onHistory={() => void showHistory(demand)} onRefresh={refresh} />} /></Suspense>
          ) : page === 'overview' ? (
            <OverviewPage user={user} demands={demands} activeCount={requestCount} totalBudget={totalBudget} totalInvoiced={totalInvoiced} onOpenDemands={() => setPage('demands')} onHistory={showHistory} />
          ) : (
            <section>
              <div className="page-heading">
                <div><div className="eyebrow">OPERAÇÃO</div><h1>{pageTitle}</h1><p>{pageDescription(page)}</p></div>
                {page === 'commercial' && user.role !== 'FINANCEIRO' && user.role !== 'RH' && <button className="primary-button" data-tour="new-demand" onClick={() => setShowCreate(true)}><Plus size={17} /> Nova demanda</button>}
              </div>
              <div className="filter-row" data-tour="demand-search">
                <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar demanda, cliente ou código..." /></label>
                <span className="results-count">{filteredDemands.length} registros</span>
              </div>
              <div data-tour="demand-results">
              {filteredDemands.length ? (
                <div className="demand-list">
                  {filteredDemands.map((item) => (
                    <DemandCard key={item.id} demand={item} user={user} page={page} onHistory={() => void showHistory(item)} onRefresh={refresh} />
                  ))}
                </div>
              ) : <EmptyState page={page} onCreate={() => setShowCreate(true)} />}
              </div>
            </section>
          )}
          </div>
        </div>
      </main>
      {guideOpen && <SystemGuide onStartTour={startTour} allowedPages={authorizedNavGroups.flatMap((group) => group.items.map((item) => item.page))} onClose={() => setGuideOpen(false)} onNavigate={(destination) => {
        if (authorizedNavGroups.some((group) => group.items.some((item) => item.page === destination))) { setPage(destination); setGuideOpen(false); setNavSearch(''); setNavSearchOpen(false); }
      }} />}
      {tourSteps && <Suspense fallback={<div className="tour-loading" role="status">Preparando guia...</div>}><GuidedTour steps={tourSteps} onClose={() => {
        setTourSteps(null);
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-tour="guide-trigger"]')?.focus({ preventScroll: true }));
      }} onNavigate={(destination) => {
        if (authorizedNavGroups.some((group) => group.items.some((item) => item.page === destination))) setPage(destination);
      }} /></Suspense>}
      {profileOpen && <ProfileDialog user={user} roleLabel={roleLabels[user.role]} onAvatarChange={updateAvatar} onClose={() => setProfileOpen(false)} />}
      {showCreate && <CreateDemandModal onClose={() => setShowCreate(false)} onSubmit={(data) => runAction(async () => { const version = epoch.current; await api.createDemand(data); if (version !== epoch.current) return; setShowCreate(false); setPage('demands'); })} />}
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

      <div className="analytics-summary-grid" data-tour="overview-metrics" aria-label="Indicadores da operação">
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

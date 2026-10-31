import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useId } from 'react';

interface AnalyticsDatum {
  label: string;
  count: number;
  budget: number;
  invoiced: number;
}

interface DataVisualizationProps {
  mode: 'financial' | 'volume' | 'distribution';
  data: AnalyticsDatum[];
}

const stageColors: Record<string, string> = {
  Comercial: 'var(--stage-commercial)',
  Financeiro: '#ff4c20',
  'Pessoas & RH': '#777a74',
  Execução: '#a8aaa4',
  Encerradas: '#d1d2cc',
};

const money = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const compactMoney = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

const tooltipStyle = {
  border: '1px solid var(--outline)',
  borderRadius: 16,
  background: 'var(--panel-surface)',
  color: 'var(--on-surface)',
  fontSize: 13,
  boxShadow: '0 8px 32px #25242812',
};

export default function DataVisualization({ mode, data }: DataVisualizationProps) {
  const gradientId = useId().replace(/:/g, '');
  if (mode === 'financial') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} interval={0} />
          <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: 'var(--chart-axis)', fontSize: 10 }} tickFormatter={compactMoney} />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            formatter={(value, name) => [money(Number(value)), name === 'Orçamento' ? 'Orçamento' : 'Faturado']}
            contentStyle={tooltipStyle}
            labelStyle={{ marginBottom: 4, color: 'var(--on-surface)', fontWeight: 600 }}
          />
          <defs>
            <linearGradient id={`${gradientId}-budget`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6974ef" /><stop offset="100%" stopColor="#c5c9fc" />
            </linearGradient>
            <linearGradient id={`${gradientId}-invoiced`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6534" /><stop offset="100%" stopColor="#ffce94" />
            </linearGradient>
          </defs>
          <Bar dataKey="budget" name="Orçamento" fill={`url(#${gradientId}-budget)`} radius={[9, 9, 3, 3]} maxBarSize={44} isAnimationActive={false} />
          <Bar dataKey="invoiced" name="Faturado" fill={`url(#${gradientId}-invoiced)`} radius={[9, 9, 3, 3]} maxBarSize={44} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (mode === 'volume') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="2 6" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} interval={0} />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            width={34}
            tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            formatter={(value) => [`${Number(value)} demandas`, 'Quantidade']}
            contentStyle={tooltipStyle}
          />
          <Bar dataKey="count" name="Demandas" radius={[5, 5, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {data.map((stage) => <Cell key={stage.label} fill={stageColors[stage.label] ?? '#a8adbb'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius="68%" outerRadius="92%" paddingAngle={5} cornerRadius={5} stroke="none" isAnimationActive={false}>
          {data.map((stage) => <Cell key={stage.label} fill={stageColors[stage.label] ?? '#a8adbb'} />)}
        </Pie>
        <Tooltip
          formatter={(value) => [`${Number(value)} demandas`, 'Quantidade']}
          contentStyle={tooltipStyle}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

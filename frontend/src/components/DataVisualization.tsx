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

interface AnalyticsDatum {
  label: string;
  count: number;
  budget: number;
  invoiced: number;
}

interface DataVisualizationProps {
  mode: 'financial' | 'distribution';
  data: AnalyticsDatum[];
}

const stageColors: Record<string, string> = {
  Comercial: '#6277dc',
  Financeiro: '#ee9b42',
  'Pessoas & RH': '#51b5d5',
  Execução: '#8584c8',
  Encerradas: '#a8adbb',
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
  border: '1px solid #e3e4df',
  borderRadius: 8,
  background: '#fff',
  fontSize: 12,
};

export default function DataVisualization({ mode, data }: DataVisualizationProps) {
  if (mode === 'financial') {
    return (
      <ResponsiveContainer width="100%" height={252}>
        <BarChart data={data} margin={{ top: 10, right: 6, left: 0, bottom: 0 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="#e9e8e2" strokeDasharray="3 5" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#656761', fontSize: 11 }} interval={0} />
          <YAxis axisLine={false} tickLine={false} width={58} tick={{ fill: '#777a74', fontSize: 10 }} tickFormatter={compactMoney} />
          <Tooltip
            cursor={{ fill: '#f0efe9' }}
            formatter={(value, name) => [money(Number(value)), name === 'budget' ? 'Orçamento' : 'Faturado']}
            contentStyle={tooltipStyle}
            labelStyle={{ marginBottom: 4, color: '#30312e', fontWeight: 600 }}
          />
          <Bar dataKey="budget" name="Orçamento" fill="#6277dc" radius={[5, 5, 0, 0]} maxBarSize={28} />
          <Bar dataKey="invoiced" name="Faturado" fill="#ee9b42" radius={[5, 5, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" innerRadius="68%" outerRadius="92%" paddingAngle={3} stroke="none">
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

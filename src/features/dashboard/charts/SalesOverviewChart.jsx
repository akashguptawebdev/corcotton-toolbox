import { useSelector } from 'react-redux';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SEQUENTIAL_BLUE, SEQUENTIAL_BLUE_FILL, CHART_INK } from '../chartPalette';
import styles from './SalesOverviewChart.module.scss';

// Sample data — replace with GET /admin/reports/sales?range=daily once the reports
// module (backend/ARCHITECTURE.md Part 12) is built.
const data = [
  { date: 'May 25', sales: 18100 },
  { date: 'May 27', sales: 19500 },
  { date: 'May 30', sales: 26400 },
  { date: 'Jun 1', sales: 20300 },
  { date: 'Jun 3', sales: 22100 },
  { date: 'Jun 4', sales: 17800 },
  { date: 'Jun 6', sales: 29400 },
  { date: 'Jun 7', sales: 43800 },
  { date: 'Jun 9', sales: 31600 },
  { date: 'Jun 11', sales: 24600 },
  { date: 'Jun 13', sales: 18400 },
  { date: 'Jun 14', sales: 21100 },
  { date: 'Jun 16', sales: 19600 },
  { date: 'Jun 18', sales: 28200 },
  { date: 'Jun 19', sales: 27300 },
  { date: 'Jun 20', sales: 43200 },
  { date: 'Jun 22', sales: 36500 },
  { date: 'Jun 23', sales: 38200 },
  { date: 'Jun 25', sales: 29231 },
];

const formatCurrency = (v) => `$${(v / 1000).toFixed(0)}K`;

const CustomTooltip = ({ active, payload, label, ink }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip} style={{ background: ink.tooltipBg, borderColor: ink.tooltipBorder }}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p className={styles.tooltipValue}>${payload[0].value.toLocaleString()}</p>
    </div>
  );
};

const SalesOverviewChart = () => {
  const theme = useSelector((state) => state.ui.theme);
  const lineColor = SEQUENTIAL_BLUE[theme];
  const fillColor = SEQUENTIAL_BLUE_FILL[theme];
  const ink = CHART_INK[theme];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={ink.grid} strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tick={{ fill: ink.text, fontSize: 12 }}
          axisLine={{ stroke: ink.axis }}
          tickFormatter={(value, index) => (index % 3 === 0 || index === data.length - 1 ? value : '')}
          tickLine={false}
        />
        <YAxis tickFormatter={formatCurrency} tick={{ fill: ink.text, fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip content={<CustomTooltip ink={ink} />} cursor={{ stroke: ink.axis, strokeWidth: 1 }} />
        <Area type="monotone" dataKey="sales" stroke={lineColor} strokeWidth={2} fill="url(#salesFill)" activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default SalesOverviewChart;

import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { NAVY, GOLD } from '../reportConfig';
import { formatRwfShort } from '../reportConfig';

function DonutChart({ data, nameKey = 'name', valueKey = 'value' }) {
  const items = data || [];
  if (!items.length) return <p className="text-sm text-slate-400 text-center py-12">No chart data</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={items} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
          {items.map((e, i) => <Cell key={i} fill={e.color || GOLD} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function CategoryBarChart({ data }) {
  const items = data || [];
  if (!items.length) return <p className="text-sm text-slate-400 text-center py-12">No chart data</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={items} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={(val, key) => (key === 'current_value' || key === 'original_cost' ? formatRwfShort(val) : val)} />
        <Bar dataKey="quantity" fill={NAVY} name="Quantity" radius={[4, 4, 0, 0]} />
        <Bar dataKey="current_value" fill={GOLD} name="Current Value" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SimpleBarChart({ data, nameKey = 'name', valueKey = 'value' }) {
  const items = data || [];
  if (!items.length) return <p className="text-sm text-slate-400 text-center py-12">No chart data</p>;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={items}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey={valueKey} fill={NAVY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ReportCharts({ reportType, chart, charts }) {
  const data = chart || charts;
  if (!data?.length) return null;

  const isHealth = reportType === 'health';
  const isCategory = reportType === 'categories';
  const isLocation = reportType === 'locations' || reportType === 'transfers';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold mb-4" style={{ color: NAVY }}>
          {isHealth ? 'Used vs Not Used (Old)' : isCategory ? 'Category Analysis' : 'Visual Summary'}
        </h3>
        {isHealth && (
          <DonutChart
            data={data}
            valueKey="value"
          />
        )}
        {isCategory && !isHealth && (
          <div className="space-y-4">
            <DonutChart data={data.map((d) => ({ ...d, value: d.quantity }))} />
          </div>
        )}
        {isLocation && !isCategory && !isHealth && <SimpleBarChart data={data} />}
        {!isHealth && !isCategory && !isLocation && <SimpleBarChart data={data} nameKey={data[0]?.year ? 'year' : 'name'} valueKey={data[0]?.total_added != null ? 'total_added' : 'value'} />}
      </div>
      {(isCategory || isHealth) && (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold mb-4" style={{ color: NAVY }}>
            {isHealth ? 'Count by health status' : 'Bar Chart'}
          </h3>
          {isCategory ? <CategoryBarChart data={data} /> : <SimpleBarChart data={data.map((d) => ({ name: d.name, value: d.count || d.value }))} />}
        </div>
      )}
    </div>
  );
}

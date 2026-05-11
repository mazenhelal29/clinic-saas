'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'الأحد',    appointments: 8 },
  { day: 'الاثنين', appointments: 15 },
  { day: 'الثلاثاء', appointments: 12 },
  { day: 'الأربعاء', appointments: 18 },
  { day: 'الخميس',  appointments: 24 },
  { day: 'الجمعة',  appointments: 6 },
  { day: 'السبت',   appointments: 3 },
];

export function AppointmentsBarChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barSize={24}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(v: any) => [v, 'موعد']}
          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', fontSize: 12 }}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
        />
        <Bar dataKey="appointments" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

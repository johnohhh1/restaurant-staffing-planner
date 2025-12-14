
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type StaffingData = {
  name: string;
  current: number;
  needed: number;
};

interface StaffingOverviewChartProps {
  data: StaffingData[];
}

const StaffingOverviewChart: React.FC<StaffingOverviewChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="current" fill="#4CAF50" name="Current" />
        <Bar dataKey="needed" fill="#2196F3" name="Needed" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StaffingOverviewChart;
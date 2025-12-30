import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart
} from 'recharts';
import { Paper, Typography, Box, CircularProgress } from '@mui/material';

const ForecastingChart = ({ data, loading, title }) => {
  if (loading) return <Box p={3} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (!data || data.length === 0) return <Box p={3}><Typography variant="body2" color="textSecondary">Not enough history to forecast.</Typography></Box>;

  // Data format expected: [{ name: 'Jan', actual: 4000, projected: null }, { name: 'Apr', actual: null, projected: 4200 }]
  
  return (
    <Paper elevation={0} sx={{ p: 2, height: 350, border: '1px solid #eee' }}>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip 
            formatter={(value) => [`${value} GHS`, '']}
            contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend />
          {/* Actual Data (Solid Line/Area) */}
          <Area type="monotone" dataKey="actual" fill="#e3f2fd" stroke="#2196f3" strokeWidth={3} name="Actual" />
          {/* Projected Data (Dotted Line) */}
          <Line type="monotone" dataKey="projected" stroke="#ff9800" strokeWidth={3} strokeDasharray="5 5" dot={{r: 4}} name="Forecast" />
        </ComposedChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default ForecastingChart;

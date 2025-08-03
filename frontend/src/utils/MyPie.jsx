import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useMediaQuery } from "@mui/material";

const COLORS = [
  "#00caff",
  "#FF8042",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF69B4",
];

const MyPie = ({ data, dataKey, nameKey }) => {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down("md"));

  const formatTooltip = (value) => {
    // Format as currency if it's sales data
    if (dataKey === "totalSales") {
      return `₵${value.toFixed(2)}`;
    }
    return value;
  };

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (percent < 0.05) return null; // Don't show labels for small segments
    return `${(percent * 100).toFixed(1)}%`;
  };

  return (
    <ResponsiveContainer
      width="100%"
      height={300}
      style={{ margin: 0, padding: 0 }}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="52%"
          cy="52%"
          innerRadius="40%"
          outerRadius="85%"
          fill="#8884d8"
          labelLine={false}
          label={renderCustomizedLabel}>
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={formatTooltip} />
        <Legend
          layout={isMobile ? "horizontal" : "vertical"}
          align={isMobile ? "center" : "right"}
          verticalAlign={isMobile ? "bottom" : "middle"}
          wrapperStyle={{
            paddingLeft: 40, // Increased padding for desktop
            paddingRight: isMobile ? 0 : 10,
            paddingTop: isMobile ? 20 : 0,
            fontSize: "10px",
           }}
          formatter={(value) => {
            return value.length > 20 ? value.substring(0, 20) + "..." : value;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default MyPie;

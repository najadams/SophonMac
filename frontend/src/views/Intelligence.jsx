import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  useTheme
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Error as ErrorIcon,
  Inventory,
  Lightbulb,
  Refresh,
  CheckCircle,
  AccessTime,
  ReceiptLong,
  CalendarToday
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import axios from "../config/index";
import { motion } from "framer-motion";
import Loader from "../components/common/Loader";
import ForecastingChart from "./components/ForecastingChart"; // Adjust path if needed (e.g. view/components)
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { format } from "date-fns";
import { formatQuantity } from "../utils/quantityFormat";

const Intelligence = () => {
    const theme = useTheme();
    const company = useSelector((state) => state.companyState.data);
    const companyId = company?.id;

    const [isLoading, setIsLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState(null);
    const [pulseData, setPulseData] = useState(null);
    const [trendsData, setTrendsData] = useState(null);
    const [reordersData, setReordersData] = useState([]);
    const [anomaliesData, setAnomaliesData] = useState([]);
    const [productIntelData, setProductIntelData] = useState(null);
    const [forecastData, setForecastData] = useState([]);
    const [taxData, setTaxData] = useState(null);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        if (!companyId) return;
        setIsLoading(true);
        setError(null);
        try {
            const [pulseRes, trendsRes, reordersRes, anomaliesRes, productRes, forecastRes] = await Promise.all([
                 axios.get(`/api/intelligence/pulse/${companyId}`),
                 axios.get(`/api/intelligence/trends/${companyId}?period=7d`),
                 axios.get(`/api/intelligence/reorders/${companyId}`),
                 axios.get(`/api/intelligence/anomalies/${companyId}`),
                 axios.get(`/api/intelligence/product-performance/${companyId}`),
                 axios.get(`/api/intelligence/forecast/${companyId}`)
            ]);

            setPulseData(pulseRes.data);
            if (pulseRes.data.tax) {
                setTaxData(pulseRes.data.tax);
            }
            setTrendsData(trendsRes.data);
            setReordersData(reordersRes.data);
            setAnomaliesData(anomaliesRes.data);
            setProductIntelData(productRes.data);
            setForecastData(forecastRes.data);
            setLastRefreshed(new Date());

        } catch (err) {
            console.error("Error fetching intelligence data:", err);
            setError("Failed to load intelligence insights.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [companyId]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (isLoading && !pulseData) return <Loader />;

    // Helper to determine status color
    const getStatusParams = (type, value) => {
        const colors = {
            green: { bg: '#e8f5e9', text: '#2e7d32', icon: '#2e7d32', border: '#c8e6c9' },
            yellow: { bg: '#fffde7', text: '#f57f17', icon: '#f57f17', border: '#fff9c4' },
            red: { bg: '#ffebee', text: '#c62828', icon: '#c62828', border: '#ffcdd2' },
            neutral: { bg: '#ffffff', text: '#424242', icon: '#757575', border: '#eeeeee' }
        };

        if (type === 'stock') {
            if (value === 0) return colors.green;
            if (value < 5) return colors.yellow;
            return colors.red;
        }
        if (type === 'anomalies') {
            if (value === 0) return colors.green;
            return colors.red;
        }
        if (type === 'sales') {
            // Trend direction check. value is percent change
             if (value > 0) return colors.green;
             if (value > -10) return colors.neutral; // Small drop is normal
             return colors.red; // Big drop
        }
        if (type === 'tax') {
            // Always neutral/info unless overdue (which we don't track yet)
             return colors.neutral;
        }
        return colors.neutral;
    };

    const stockStatus = getStatusParams('stock', pulseData?.reordersCount || 0);
    const anomalyStatus = getStatusParams('anomalies', pulseData?.anomalies?.length || 0);
    const trendStatus = getStatusParams('sales', trendsData?.daily?.percentChange || 0);
    const taxStatus = getStatusParams('tax', 0);

    return (
        <Box sx={{ p: 2, height: "100%", overflowY: "auto", bgcolor: '#f5f5f5' }}>
             <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', color: '#1a1a1a' }}>
                    <Lightbulb sx={{ mr: 1, color: '#fdd835' }} />
                    Shop Intelligence
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    {lastRefreshed && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTime sx={{ fontSize: 14, mr: 0.5 }} />
                            Updated {format(lastRefreshed, 'h:mm a')}
                        </Typography>
                    )}
                    <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<Refresh />} 
                        onClick={fetchData}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                        Refresh
                    </Button>
                </Box>
            </Box>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            )}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* 1. PULSE (Health Monitor) */}
                <Grid container spacing={2} mb={3}>
                    {/* Stock Risks */}
                    <Grid item xs={12} sm={6} md={3}>
                        <PulseCard 
                            title="Stock Risks" 
                            status={stockStatus}
                            value={pulseData?.reordersCount || 0}
                            subLabel={pulseData?.reordersCount === 0 ? "Inventory healthy" : "Items low stock"}
                        />
                    </Grid>

                    {/* Sales Trend */}
                    <Grid item xs={12} sm={6} md={3}>
                        <PulseCard 
                            title="Sales Trend (Today)" 
                            status={trendStatus}
                            value={`${trendsData?.daily?.percentChange > 0 ? '+' : ''}${trendsData?.daily?.percentChange || 0}%`}
                            subLabel={`vs Yesterday (${company?.currency?.symbol}${trendsData?.daily?.previous?.toFixed(2) || 0})`}
                            icon={trendsData?.daily?.percentChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                        />
                    </Grid>

                    {/* Anomalies */}
                    <Grid item xs={12} sm={6} md={3}>
                        <PulseCard 
                            title="Anomalies Today" 
                            status={anomalyStatus}
                            value={pulseData?.anomalies?.length || 0}
                            subLabel={pulseData?.anomalies?.length === 0 ? "No issues detected" : "Unusual events"}
                            icon={<Warning />}
                        />
                    </Grid>

                     {/* Tax Intelligence */}
                     <Grid item xs={12} sm={6} md={3}>
                        <PulseCard 
                            title="Tax Output (MTD)" 
                            status={taxStatus}
                            value={<>{company?.currency?.symbol}{taxData?.outputVat?.toFixed(0) || '0'}</>}
                            subLabel={`Est. Liability: ${company?.currency?.symbol}${taxData?.estimatedLiability?.toFixed(0) || '0'}`}
                            icon={<ReceiptLong />}
                        />
                    </Grid>
                </Grid>

                {/* 2. MAIN CONTENT GRID */}
                <Grid container spacing={2}>
                    
                    {/* LEFT COLUMN: Trends, Forecast, Reorders */}
                    <Grid item xs={12} md={8}>
                         {/* SALES TREND CHART */}
                         <motion.div variants={itemVariants}>
                            <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6" fontWeight="600">Sales Performance (7 Days)</Typography>
                                    </Box>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={trendsData?.chartData || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                            <XAxis 
                                                dataKey="day" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#757575', fontSize: 12 }} 
                                                dy={10}
                                            />
                                            <YAxis 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fill: '#757575', fontSize: 12 }} 
                                                tickFormatter={(val) => `${company?.currency?.symbol || ''}${val}`}
                                            />
                                            <RechartsTooltip 
                                                cursor={{ fill: '#f5f5f5' }}
                                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0px 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="sales" radius={[4, 4, 0, 0]}>
                                                {(trendsData?.chartData || []).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.sales > 0 ? "#5c6bc0" : "#e0e0e0"} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                         </motion.div>

                         {/* SALES FORECAST CHART */}
                         <motion.div variants={itemVariants}>
                             <Box mb={2}>
                                 <ForecastingChart 
                                     data={forecastData} 
                                     loading={isLoading} 
                                     title="Business Forecast (6 Months)" 
                                 />
                             </Box>
                         </motion.div>

                         {/* REORDER SUGGESTIONS */}
                         <motion.div variants={itemVariants}>
                             <Card sx={{ borderRadius: 3, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                 <CardContent>
                                     <Box display="flex" justifyContent="space-between" mb={1}>
                                         <Typography variant="h6" fontWeight="600">Smart Reorder Suggestions</Typography>
                                         {reordersData.length > 0 && <Chip label={`${reordersData.length} Urgent`} size="small" color="error" />}
                                     </Box>
                                     
                                     {reordersData.length === 0 ? (
                                         <Box display="flex" flexDirection="column" alignItems="center" py={4}>
                                             <CheckCircle sx={{ fontSize: 40, color: '#66bb6a', mb: 1, opacity: 0.8 }} />
                                             <Typography variant="subtitle1" fontWeight="500" color="text.primary">Everything in stock</Typography>
                                             <Typography variant="body2" color="text.secondary">No items expected to sell out within 7 days.</Typography>
                                         </Box>
                                     ) : (
                                         <List disablePadding>
                                             {reordersData.slice(0, 5).map((item) => (
                                                 <React.Fragment key={item.id}>
                                                     <ListItem sx={{ px: 0, py: 1.5 }}>
                                                         <ListItemIcon sx={{ minWidth: 40 }}>
                                                             <Inventory sx={{ color: item.riskLevel === 'critical' ? '#d32f2f' : '#f57c00' }} />
                                                         </ListItemIcon>
                                                         <ListItemText 
                                                             primary={<Typography variant="subtitle2" fontWeight="600">{item.name}</Typography>}
                                                             secondary={
                                                                 <Typography variant="caption" color="text.secondary">
                                                                     {formatQuantity(item.onhand)} in stock • Burning {formatQuantity(item.burnRate)}/day
                                                                 </Typography>
                                                             }
                                                         />
                                                         <Box textAlign="right">
                                                             <Chip 
                                                                size="small" 
                                                                label={`${item.daysUntilStockout} days left`} 
                                                                sx={{ 
                                                                    bgcolor: item.riskLevel === 'critical' ? '#ffebee' : '#fff3e0',
                                                                    color: item.riskLevel === 'critical' ? '#c62828' : '#ef6c00',
                                                                    fontWeight: 'bold',
                                                                    height: 24
                                                                }} 
                                                             />
                                                         </Box>
                                                     </ListItem>
                                                     <Divider component="li" />
                                                 </React.Fragment>
                                             ))}
                                         </List>
                                     )}
                                 </CardContent>
                             </Card>
                         </motion.div>
                    </Grid>

                    {/* RIGHT COLUMN: Dead Stock & Details */}
                    <Grid item xs={12} md={4}>
                        {/* DEAD STOCK */}
                        <motion.div variants={itemVariants}>
                            <Card sx={{ borderRadius: 3, mb: 2, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <CardContent>
                                     <Typography variant="h6" mb={0.5} color="text.primary" fontWeight="600">Dead Stock</Typography>
                                     <Typography variant="caption" color="text.secondary" mb={2} display="block">
                                         Capital locked in unsold items (&gt;30 days)
                                     </Typography>
                                     
                                     {(!productIntelData?.deadStock || productIntelData.deadStock.length === 0) ? (
                                         <Box display="flex" flexDirection="column" alignItems="center" py={4} mt={2} bgcolor="#fafafa" borderRadius={2}>
                                             <PriceCheck sx={{ fontSize: 40, color: '#bdbdbd', mb: 1 }} /> 
                                             <Typography variant="subtitle2" color="text.secondary">No dead stock found</Typography>
                                             <Typography variant="caption" color="text.secondary">Capital is flowing efficiently.</Typography>
                                         </Box>
                                     ) : (
                                         <List dense>
                                             {productIntelData?.deadStock?.slice(0, 8).map((item) => (
                                                 <ListItem key={item.id} sx={{ px: 0, py: 1 }}>
                                                     <ListItemText
                                                         primary={<Typography variant="body2" fontWeight="500">{item.name}</Typography>}
                                                         secondary={`Inactive: ${item.daysInactive} days`}
                                                     />
                                                      <Typography variant="body2" fontWeight="700" color="error.main">
                                                          {company?.currency?.symbol}{item.valueLocked?.toFixed(2)}
                                                      </Typography>
                                                 </ListItem>
                                             ))}
                                         </List>
                                     )}
                                </CardContent>
                            </Card>
                        </motion.div>

                        {/* TAX DETAILS */}
                        <motion.div variants={itemVariants}>
                             <Card sx={{ borderRadius: 3, boxShadow: '0px 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee', bgcolor: '#f8f9fa' }}>
                                 <CardContent>
                                    <Box display="flex" alignItems="center" mb={1}>
                                         <ReceiptLong sx={{ color: '#546e7a', mr: 1 }} />
                                         <Typography variant="h6" fontWeight="600">Tax Filing</Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" mb={2}>
                                        Next Deadline: <strong>{taxData?.nextFilingDeadline || 'N/A'}</strong>
                                    </Typography>
                                    
                                    <Divider sx={{ mb: 2 }} />
                                    
                                    <Grid container spacing={1}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Output VAT</Typography>
                                            <Typography variant="body1" fontWeight="600">{company?.currency?.symbol}{taxData?.outputVat?.toFixed(2) || '0.00'}</Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" color="text.secondary">Input VAT</Typography>
                                            <Typography variant="body1" fontWeight="600">{company?.currency?.symbol}{taxData?.inputVat?.toFixed(2) || '0.00'}</Typography>
                                        </Grid>
                                        <Grid item xs={12} mt={1}>
                                            <Box p={1.5} bgcolor={taxData?.estimatedLiability > 0 ? '#ffebee' : '#e8f5e9'} borderRadius={2} textAlign="center">
                                                <Typography variant="caption" color={taxData?.estimatedLiability > 0 ? "error" : "success.main"} fontWeight="bold">
                                                    NET {taxData?.estimatedLiability > 0 ? "PAYABLE" : "REFUNDABLE"}
                                                </Typography>
                                                <Typography variant="h5" fontWeight="800" color={taxData?.estimatedLiability > 0 ? "error" : "success.main"}>
                                                    {company?.currency?.symbol}{Math.abs(taxData?.estimatedLiability || 0).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                 </CardContent>
                             </Card>
                        </motion.div>
                    </Grid>
                </Grid>
            </motion.div>
        </Box>
    );
};

// Premium Pulse Card Component
const PulseCard = ({ title, status, value, subLabel, icon }) => (
    <Card sx={{ 
        height: '100%', 
        borderRadius: 3, 
        bgcolor: 'white', 
        boxShadow: '0px 2px 4px rgba(0,0,0,0.05)',
        border: '1px solid',
        borderColor: status.border,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
            cursor: 'pointer'
        }
    }}>
        <CardContent sx={{ p: '16px !important' }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {title}
                    </Typography>
                    <Box display="flex" alignItems="baseline" mt={1}>
                        <Typography variant="h4" fontWeight="800" sx={{ color: '#263238', mr: 1 }}>
                            {value}
                        </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {subLabel}
                    </Typography>
                </Box>
                <Box sx={{ 
                    p: 1, 
                    borderRadius: '50%', 
                    bgcolor: status.bg, 
                    color: status.icon,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon || (status === 'green' ? <CheckCircle /> : <Warning />)}
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Fallback icon for Dead Stock empty state
const PriceCheck = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
);

export default Intelligence;

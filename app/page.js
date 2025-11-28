'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink, Info, DollarSign, Navigation, Gauge, Route, Activity } from 'lucide-react';

// Color Palette
const COLORS = {
  gallons: '#3b82f6',      // Blue
  costPerGallon: '#f59e0b', // Amber
  costPerTank: '#f97316',   // Orange
  costPerMile: '#a855f7',   // Purple
  mpg: '#10b981',          // Green
  success: '#10b981',      // Green
  warning: '#ef4444',      // Red
  neutral: '#6b7280',      // Gray
  chartMain: '#2563eb',    // Chart Blue
};

export default function GasMileageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timePeriod, setTimePeriod] = useState('ytd');
  const [costPerGallonChartPeriod, setCostPerGallonChartPeriod] = useState('ytd');
  const [mpgChartPeriod, setMpgChartPeriod] = useState('ytd');

  const SHEET_ID = '1a3QjhxhRyMMYclu3Fs7AJ-ey_rAYMLLPX8uETtP-0_M';
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdFwOyl6iX009A1Q5IR_L1v0aFjALdzjWkNDY6b6i8Ya9a3mA/viewform';

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=1412224841`
      );
      const text = await response.text();
      const json = JSON.parse(text.substr(47).slice(0, -2));
      
      const rows = json.table.rows.slice(3); // Skip header rows
      const parsedData = rows
        .filter(row => {
          // Must have odometer (not zero) and gallons (not zero) and cost data
          const hasOdometer = row.c[1] && row.c[1].v && row.c[1].v > 0;
          const hasGallons = row.c[3] && row.c[3].v && row.c[3].v > 0;
          const hasCost = row.c[4] && row.c[4].v && row.c[4].v > 0;
          return hasOdometer && hasGallons && hasCost;
        })
        .map(row => {
          // Parse the timestamp properly
          let timestamp;
          if (row.c[0]?.f) {
            // Use formatted value if available
            timestamp = new Date(row.c[0].f);
          } else if (row.c[0]?.v) {
            // Parse raw value (could be string or Date object)
            timestamp = new Date(row.c[0].v);
          } else {
            timestamp = new Date();
          }
          
          return {
            timestamp: timestamp.getTime(), // Store as timestamp for reliable comparisons
            odometer: parseFloat(row.c[1]?.v || 0),
            tripMeter: parseFloat(row.c[2]?.v || 0),
            gallons: parseFloat(row.c[3]?.v || 0),
            totalCost: parseFloat(row.c[4]?.v || 0),
            costPerGallon: parseFloat(row.c[5]?.v || 0),
          };
        })
        .filter(item => !isNaN(item.timestamp)); // Only valid timestamps

      setData(parsedData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filterDataByPeriod = (data) => {
    if (timePeriod === 'all') return data;
    
    const now = Date.now();
    let cutoffDate;
    
    if (timePeriod === 'ytd') {
      // Year to date - from January 1st of current year
      const currentYear = new Date().getFullYear();
      cutoffDate = new Date(currentYear, 0, 1).getTime();
    } else {
      const periodDays = {
        '30': 30,
        '90': 90
      };
      cutoffDate = now - periodDays[timePeriod] * 24 * 60 * 60 * 1000;
    }
    
    return data.filter(item => item.timestamp >= cutoffDate);
  };

  const calculateMetrics = (data) => {
    if (data.length === 0) return null;

    const filteredData = filterDataByPeriod(data);
    if (filteredData.length === 0) return null;

    // Calculate averages
    const avgGallons = filteredData.reduce((sum, d) => sum + d.gallons, 0) / filteredData.length;
    const avgCostPerGallon = filteredData.reduce((sum, d) => sum + d.costPerGallon, 0) / filteredData.length;
    const avgCostPerTank = filteredData.reduce((sum, d) => sum + d.totalCost, 0) / filteredData.length;
    const avgMPG = filteredData.reduce((sum, d) => sum + (d.tripMeter / d.gallons), 0) / filteredData.length;
    const avgCostPerMile = filteredData.reduce((sum, d) => sum + (d.totalCost / d.tripMeter), 0) / filteredData.length;

    // Calculate percentage changes (comparing first half to second half of period)
    const midPoint = Math.floor(filteredData.length / 2);
    const firstHalf = filteredData.slice(0, midPoint);
    const secondHalf = filteredData.slice(midPoint);

    const calcChange = (arr1, arr2, getValue) => {
      if (arr1.length === 0 || arr2.length === 0) return 0;
      const avg1 = arr1.reduce((sum, d) => sum + getValue(d), 0) / arr1.length;
      const avg2 = arr2.reduce((sum, d) => sum + getValue(d), 0) / arr2.length;
      return ((avg2 - avg1) / avg1) * 100;
    };

    const gallonsChange = calcChange(firstHalf, secondHalf, d => d.gallons);
    const costPerGallonChange = calcChange(firstHalf, secondHalf, d => d.costPerGallon);
    const costPerTankChange = calcChange(firstHalf, secondHalf, d => d.totalCost);
    const mpgChange = calcChange(firstHalf, secondHalf, d => d.tripMeter / d.gallons);
    const costPerMileChange = calcChange(firstHalf, secondHalf, d => d.totalCost / d.tripMeter);

    // Calculate totals
    const totalFuelCost = data.reduce((sum, d) => sum + d.totalCost, 0);
    const totalMiles = data[data.length - 1].odometer - data[0].odometer;
    const timeSpanMs = data[data.length - 1].timestamp - data[0].timestamp;
    const timeSpanYears = timeSpanMs / (365 * 24 * 60 * 60 * 1000);
    const annualMileage = timeSpanYears > 0 ? totalMiles / timeSpanYears : 0;
    const monthlyMileage = annualMileage / 12;

    // Monthly calculations (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const lastMonthData = data.filter(d => d.timestamp >= thirtyDaysAgo);
    const monthlyFuelCost = lastMonthData.reduce((sum, d) => sum + d.totalCost, 0);
    const monthlyMPG = lastMonthData.length > 0 
      ? lastMonthData.reduce((sum, d) => sum + (d.tripMeter / d.gallons), 0) / lastMonthData.length 
      : avgMPG;

    // Annual calculations
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const lastYearData = data.filter(d => d.timestamp >= oneYearAgo);
    const annualFuelCost = lastYearData.reduce((sum, d) => sum + d.totalCost, 0);
    const annualMileageActual = lastYearData.length > 1
      ? lastYearData[lastYearData.length - 1].odometer - lastYearData[0].odometer
      : annualMileage;

    const avgMileagePerFillup = filteredData.reduce((sum, d) => sum + d.tripMeter, 0) / filteredData.length;

    // Calculate comparisons for secondary cards
    // Monthly Fuel Cost: last 30 days vs previous 30 days
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const prev30DaysData = data.filter(d => d.timestamp >= sixtyDaysAgo && d.timestamp < thirtyDaysAgo);
    const prevMonthlyFuelCost = prev30DaysData.reduce((sum, d) => sum + d.totalCost, 0);
    const monthlyFuelCostChange = prevMonthlyFuelCost > 0 ? monthlyFuelCost - prevMonthlyFuelCost : 0;

    // Annual Fuel Cost: last 365 days vs previous 365 days
    const twoYearsAgo = Date.now() - 730 * 24 * 60 * 60 * 1000;
    const prevYearData = data.filter(d => d.timestamp >= twoYearsAgo && d.timestamp < oneYearAgo);
    const prevAnnualFuelCost = prevYearData.reduce((sum, d) => sum + d.totalCost, 0);
    const annualFuelCostChange = prevAnnualFuelCost > 0 ? annualFuelCost - prevAnnualFuelCost : 0;

    // Monthly Mileage: current month vs previous month (based on average)
    const prevMonthlyMileage = monthlyMileage; // This is historical average, so we'll compare differently
    const currentMonthMiles = lastMonthData.length > 1 
      ? lastMonthData[lastMonthData.length - 1].odometer - lastMonthData[0].odometer 
      : 0;
    const monthlyMileageChange = currentMonthMiles - monthlyMileage;

    // Annual Mileage: last 365 days vs previous 365 days
    const prevAnnualMileage = prevYearData.length > 1
      ? prevYearData[prevYearData.length - 1].odometer - prevYearData[0].odometer
      : 0;
    const annualMileageChange = prevAnnualMileage > 0 ? annualMileageActual - prevAnnualMileage : 0;

    // Monthly MPG: last 30 days vs previous 30 days
    const prevMonthlyMPG = prev30DaysData.length > 0
      ? prev30DaysData.reduce((sum, d) => sum + (d.tripMeter / d.gallons), 0) / prev30DaysData.length
      : 0;
    const monthlyMPGChange = prevMonthlyMPG > 0 ? monthlyMPG - prevMonthlyMPG : 0;

    return {
      avgGallons,
      avgCostPerGallon,
      avgCostPerTank,
      avgMPG,
      avgCostPerMile,
      gallonsChange,
      costPerGallonChange,
      costPerTankChange,
      mpgChange,
      costPerMileChange,
      monthlyFuelCost,
      annualFuelCost,
      totalFuelCost,
      avgMileagePerFillup,
      monthlyMileage,
      annualMileage: annualMileageActual,
      monthlyMPG,
      // Comparison changes
      monthlyFuelCostChange,
      annualFuelCostChange,
      monthlyMileageChange,
      annualMileageChange,
      monthlyMPGChange
    };
  };

  const metrics = calculateMetrics(data);

  const formatChartData = () => {
    return data.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      fullDate: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      costPerGallon: parseFloat(item.costPerGallon.toFixed(2)),
      mpg: parseFloat((item.tripMeter / item.gallons).toFixed(2)),
      timestamp: item.timestamp
    }));
  };

  const filterChartData = (chartData, period) => {
    if (period === 'all') return chartData;
    
    const now = Date.now();
    let cutoffDate;
    
    if (period === 'ytd') {
      // Year to date - from January 1st of current year
      const currentYear = new Date().getFullYear();
      cutoffDate = new Date(currentYear, 0, 1).getTime();
    } else {
      const periodDays = {
        '30': 30,
        '90': 90
      };
      cutoffDate = now - periodDays[period] * 24 * 60 * 60 * 1000;
    }
    
    return chartData.filter(item => item.timestamp >= cutoffDate);
  };

  // Generate sparkline data for cards
  const getSparklineData = (dataKey) => {
    const filteredData = filterDataByPeriod(data);
    return filteredData.map(item => {
      switch(dataKey) {
        case 'gallons':
          return item.gallons;
        case 'costPerGallon':
          return item.costPerGallon;
        case 'costPerTank':
          return item.totalCost;
        case 'costPerMile':
          return item.totalCost / item.tripMeter;
        case 'mpg':
          return item.tripMeter / item.gallons;
        default:
          return 0;
      }
    });
  };

  // Sparkline component with gradient - using straight lines for clean rendering
  const Sparkline = ({ data, color = '#2563eb' }) => {
    if (!data || data.length === 0) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    // Add 15% padding above and below for visual space
    const paddingPercent = 15;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      // Map to 15-85 range instead of 0-100 to add padding
      const normalizedY = ((value - min) / range) * (100 - 2 * paddingPercent) + paddingPercent;
      const y = 100 - normalizedY;
      return { x, y };
    });
    
    // Create path with straight lines - no curves
    const createLinePath = (points) => {
      if (points.length < 2) return '';
      
      let path = `M ${points[0].x},${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
      
      return path;
    };
    
    const linePath = createLinePath(points);
    
    // Create area path - straight lines to bottom at 90%
    const createAreaPath = () => {
      if (points.length < 2) return '';
      
      let path = `M 0,90 L ${points[0].x},${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
      
      path += ` L 100,90 Z`;
      return path;
    };
    
    const areaPath = createAreaPath();
    
    // Create gradient ID based on color to avoid conflicts
    const gradientId = `gradient-${color.replace('#', '')}`;
    
    return (
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.4 }} />
            <stop offset="70%" style={{ stopColor: color, stopOpacity: 0.1 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradientId})`}
          d={areaPath}
        />
        <path
          fill="none"
          stroke={color}
          strokeWidth="1"
          d={linePath}
        />
      </svg>
    );
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label, valuePrefix = '', valueSuffix = '' }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-gray-600 text-sm mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-gray-900 font-bold">
            {valuePrefix}{payload[0].value.toFixed(2)}{valueSuffix}
          </p>
        </div>
      );
    }
    return null;
  };

  // Chart period selector buttons
  const ChartPeriodButtons = ({ currentPeriod, onChange }) => {
    const periods = [
      { label: 'All', value: 'all' },
      { label: '30 Days', value: '30' },
      { label: '90 Days', value: '90' },
      { label: 'YTD', value: 'ytd' }
    ];

    return (
      <div className="flex gap-2">
        {periods.map(period => (
          <button
            key={period.value}
            onClick={() => onChange(period.value)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              currentPeriod === period.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    );
  };

  const MetricCard = ({ title, value, prefix = '', suffix = '', change, reverseColors = false, sparklineData, color }) => {
    const isPositive = change > 0;
    const showGreen = reverseColors ? !isPositive : isPositive;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="text-gray-600 text-sm font-medium mb-2">{title}</div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-3xl font-bold" style={{ color: color }}>
            {prefix}{value}{suffix}
          </div>
          <div className={`flex items-center text-sm font-medium ${showGreen ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
            {Math.abs(change).toFixed(2)}%
          </div>
        </div>
        <div className="w-full h-16">
          <Sparkline data={sparklineData} color={color} />
        </div>
      </div>
    );
  };

  const SecondaryCard = ({ title, value, prefix = '', suffix = '', type = 'cost', tooltip = '', comparison = null, comparisonLabel = '' }) => {
    const bgColor = type === 'cost' ? 'bg-green-50' : 'bg-orange-50';
    const iconColor = type === 'cost' ? '#10b981' : '#f97316';
    const numberColor = type === 'cost' ? '#10b981' : '#f97316';
    const [showTooltip, setShowTooltip] = React.useState(false);
    
    // Choose icon based on type
    const Icon = type === 'cost' ? DollarSign : Gauge;
    
    const handleTooltipToggle = () => {
      setShowTooltip(!showTooltip);
    };
    
    // Determine comparison color and arrow
    let comparisonColor = 'text-gray-500';
    let ComparisonIcon = null;
    
    if (comparison !== null && comparison !== 0) {
      const isIncrease = comparison > 0;
      
      // For costs and mileage: increase = red, decrease = green
      // For MPG: increase = green, decrease = red (reversed)
      const isMPG = title.includes('MPG');
      
      if (isMPG) {
        comparisonColor = isIncrease ? 'text-green-600' : 'text-red-600';
      } else {
        comparisonColor = isIncrease ? 'text-red-600' : 'text-green-600';
      }
      
      ComparisonIcon = isIncrease ? TrendingUp : TrendingDown;
    }
    
    return (
      <div className={`${bgColor} rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow aspect-square lg:aspect-auto flex flex-col items-center justify-center relative`}>
        <div className="mb-2">
          <Icon size={24} color={iconColor} strokeWidth={2} />
        </div>
        <div className="text-gray-600 text-xs lg:text-sm font-medium mb-2 text-center flex items-center justify-center gap-1">
          {title}
          {tooltip && (
            <div className="relative inline-block">
              <Info 
                size={14} 
                className="text-gray-400 cursor-help"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={handleTooltipToggle}
                onTouchStart={handleTooltipToggle}
              />
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg py-2 px-3 z-10">
                  {tooltip}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-3xl lg:text-4xl font-bold text-center" style={{ color: numberColor }}>
          {prefix}{value}{suffix}
        </div>
        {comparison !== null && comparison !== 0 && ComparisonIcon ? (
          <div className={`flex items-center gap-1 mt-1 text-xs ${comparisonColor} font-medium`}>
            <ComparisonIcon size={12} />
            {prefix}{Math.abs(comparison).toFixed(prefix === '$' ? 0 : 1)}{suffix} {comparisonLabel}
          </div>
        ) : (
          <div className="mt-1 text-xs opacity-0">
            &nbsp;
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  const chartData = formatChartData();

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Gas Mileage Dashboard</h1>
              <p className="text-gray-600 text-sm">
                Last updated: {lastUpdated?.toLocaleString()}
              </p>
            </div>
            <div className="flex flex-col lg:flex-row gap-3">
              <button
                onClick={() => window.open(FORM_URL, '_blank')}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <ExternalLink size={18} />
                Add Fill-up
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="flex flex-col sm:flex-row gap-2">
            {[
              { label: 'Last 30 Days', value: '30' },
              { label: 'Last 90 Days', value: '90' },
              { label: 'YTD', value: 'ytd' },
              { label: 'All Time', value: 'all' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  timePeriod === period.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Gallons"
            value={metrics.avgGallons.toFixed(2)}
            change={metrics.gallonsChange}
            reverseColors={true}
            sparklineData={getSparklineData('gallons')}
            color={COLORS.gallons}
          />
          <MetricCard
            title="Cost/Gallon"
            value={metrics.avgCostPerGallon.toFixed(2)}
            prefix="$"
            change={metrics.costPerGallonChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerGallon')}
            color={COLORS.costPerGallon}
          />
          <MetricCard
            title="Cost/Tank"
            value={metrics.avgCostPerTank.toFixed(2)}
            prefix="$"
            change={metrics.costPerTankChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerTank')}
            color={COLORS.costPerTank}
          />
          <MetricCard
            title="Cost/Mile"
            value={metrics.avgCostPerMile.toFixed(2)}
            prefix="$"
            change={metrics.costPerMileChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerMile')}
            color={COLORS.costPerMile}
          />
          <MetricCard
            title="MPG"
            value={metrics.avgMPG.toFixed(1)}
            change={metrics.mpgChange}
            reverseColors={false}
            sparklineData={getSparklineData('mpg')}
            color={COLORS.mpg}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <SecondaryCard
            title="Monthly Cost"
            value={metrics.monthlyFuelCost.toFixed(0)}
            prefix="$"
            type="cost"
            tooltip="Total spent on fuel in the last 30 days"
            comparison={metrics.monthlyFuelCostChange}
            comparisonLabel="vs last month"
          />
          <SecondaryCard
            title="Annual Cost"
            value={metrics.annualFuelCost.toFixed(0)}
            prefix="$"
            type="cost"
            tooltip="Total spent on fuel in the last 365 days"
            comparison={metrics.annualFuelCostChange}
            comparisonLabel="vs last year"
          />
          <SecondaryCard
            title="Total Cost"
            value={metrics.totalFuelCost.toFixed(0)}
            prefix="$"
            type="cost"
            tooltip="Total spent on fuel since you started tracking"
          />
          <SecondaryCard
            title="Mileage/Fill-up"
            value={metrics.avgMileagePerFillup.toFixed(0)}
            type="mileage"
            tooltip="Average miles driven between fill-ups"
          />
          <SecondaryCard
            title="Monthly Mileage"
            value={metrics.monthlyMileage.toFixed(0)}
            type="mileage"
            tooltip="Average miles driven per month based on your entire tracking history"
            comparison={metrics.monthlyMileageChange}
            comparisonLabel="vs avg"
          />
          <SecondaryCard
            title="Annual Mileage"
            value={metrics.annualMileage.toFixed(0)}
            type="mileage"
            tooltip="Total miles driven in the last 365 days"
            comparison={metrics.annualMileageChange}
            comparisonLabel="vs last year"
          />
          <SecondaryCard
            title="Monthly MPG"
            value={metrics.monthlyMPG.toFixed(1)}
            type="mileage"
            tooltip="Average fuel efficiency over the last 30 days"
            comparison={metrics.monthlyMPGChange}
            comparisonLabel="vs last month"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost/Gallon Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Cost/Gallon</h2>
              <ChartPeriodButtons 
                currentPeriod={costPerGallonChartPeriod}
                onChange={setCostPerGallonChartPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filterChartData(chartData, costPerGallonChartPeriod)} margin={{ left: 10, right: 10, top: 20, bottom: 20 }} className="sm:!ml-0 !-ml-6">
                <defs>
                  <linearGradient id="colorCostPerGallon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chartMain} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.chartMain} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip valuePrefix="$" />}
                  cursor={{ stroke: COLORS.chartMain, strokeWidth: 3, strokeOpacity: 0.3 }}
                />
                <Area
                  type="monotone"
                  dataKey="costPerGallon"
                  stroke={COLORS.chartMain}
                  strokeWidth={2}
                  fill="url(#colorCostPerGallon)"
                  dot={{ fill: COLORS.chartMain, stroke: COLORS.chartMain, strokeWidth: 0, r: 4, fillOpacity: 1 }}
                  activeDot={{ 
                    r: 6, 
                    fill: '#ffffff', 
                    stroke: COLORS.costPerTank, 
                    strokeWidth: 3
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* MPG Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">MPG</h2>
              <ChartPeriodButtons 
                currentPeriod={mpgChartPeriod}
                onChange={setMpgChartPeriod}
              />
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filterChartData(chartData, mpgChartPeriod)} margin={{ left: 10, right: 10, top: 20, bottom: 20 }} className="sm:!ml-0 !-ml-6">
                <defs>
                  <linearGradient id="colorMPG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.chartMain} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.chartMain} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(1)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip valueSuffix=" MPG" />}
                  cursor={{ stroke: COLORS.chartMain, strokeWidth: 3, strokeOpacity: 0.3 }}
                />
                <Area
                  type="monotone"
                  dataKey="mpg"
                  stroke={COLORS.chartMain}
                  strokeWidth={2}
                  fill="url(#colorMPG)"
                  dot={{ fill: COLORS.chartMain, stroke: COLORS.chartMain, strokeWidth: 0, r: 4, fillOpacity: 1 }}
                  activeDot={{ 
                    r: 6, 
                    fill: '#ffffff', 
                    stroke: COLORS.costPerTank, 
                    strokeWidth: 3
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Records Counter */}
        <div className="mt-6 text-center text-gray-600 text-sm">
          {data.length} fill-ups recorded | Tracking since {new Date(data[0]?.timestamp).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

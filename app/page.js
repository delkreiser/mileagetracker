'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react';

export default function GasMileageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timePeriod, setTimePeriod] = useState('all');

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
        .filter(row => row.c[1] && row.c[1].v && row.c[3] && row.c[3].v) // Filter valid rows
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
        .filter(item => item.gallons > 0 && !isNaN(item.timestamp)); // Only valid fill-ups

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
    const periodDays = {
      '30': 30,
      '90': 90,
      '365': 365
    };
    
    const cutoffDate = now - periodDays[timePeriod] * 24 * 60 * 60 * 1000;
    
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
      monthlyMPG
    };
  };

  const metrics = calculateMetrics(data);

  const formatChartData = () => {
    return data.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      fullDate: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      costPerGallon: parseFloat(item.costPerGallon.toFixed(2)),
      mpg: parseFloat((item.tripMeter / item.gallons).toFixed(2))
    }));
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

  // Sparkline component
  const Sparkline = ({ data, color = '#2563eb' }) => {
    if (!data || data.length === 0) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg className="w-20 h-10" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="3"
          points={points}
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

  const MetricCard = ({ title, value, prefix = '', suffix = '', change, reverseColors = false, sparklineData }) => {
    const isPositive = change > 0;
    const showGreen = reverseColors ? !isPositive : isPositive;
    const sparklineColor = showGreen ? '#16a34a' : '#dc2626';
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="text-center">
          <div className="text-gray-600 text-sm font-medium mb-2">{title}</div>
          <div className="text-3xl font-bold text-gray-900 mb-3">
            {prefix}{value}{suffix}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className={`flex items-center text-sm font-medium ${showGreen ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
            {Math.abs(change).toFixed(2)}%
          </div>
          <Sparkline data={sparklineData} color={sparklineColor} />
        </div>
      </div>
    );
  };

  const SecondaryCard = ({ title, value, prefix = '', suffix = '' }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow aspect-square flex flex-col items-center justify-center">
      <div className="text-gray-600 text-xs font-medium mb-2 text-center">{title}</div>
      <div className="text-2xl font-bold text-gray-900 text-center">
        {prefix}{value}{suffix}
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Gas Mileage Dashboard</h1>
            <p className="text-gray-600 text-sm">
              Last updated: {lastUpdated?.toLocaleString()}
            </p>
          </div>

          {/* Buttons - Stack on mobile */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.open(FORM_URL, '_blank')}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors w-full"
            >
              <ExternalLink size={18} />
              Add Fill-up
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 w-full"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            
            {/* Time Period Selector */}
            {[
              { label: 'Last 30 Days', value: '30' },
              { label: 'Last 90 Days', value: '90' },
              { label: 'Last Year', value: '365' },
              { label: 'All Time', value: 'all' }
            ].map(period => (
              <button
                key={period.value}
                onClick={() => setTimePeriod(period.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors w-full ${
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
          />
          <MetricCard
            title="Cost/Gallon"
            value={metrics.avgCostPerGallon.toFixed(2)}
            prefix="$"
            change={metrics.costPerGallonChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerGallon')}
          />
          <MetricCard
            title="Cost/Tank"
            value={metrics.avgCostPerTank.toFixed(2)}
            prefix="$"
            change={metrics.costPerTankChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerTank')}
          />
          <MetricCard
            title="Cost/Mile"
            value={metrics.avgCostPerMile.toFixed(2)}
            prefix="$"
            change={metrics.costPerMileChange}
            reverseColors={true}
            sparklineData={getSparklineData('costPerMile')}
          />
          <MetricCard
            title="MPG"
            value={metrics.avgMPG.toFixed(1)}
            change={metrics.mpgChange}
            reverseColors={false}
            sparklineData={getSparklineData('mpg')}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <SecondaryCard
            title="Monthly Fuel Cost"
            value={metrics.monthlyFuelCost.toFixed(0)}
            prefix="$"
          />
          <SecondaryCard
            title="Annual Fuel Cost"
            value={metrics.annualFuelCost.toFixed(0)}
            prefix="$"
          />
          <SecondaryCard
            title="Total Fuel Cost"
            value={metrics.totalFuelCost.toFixed(0)}
            prefix="$"
          />
          <SecondaryCard
            title="Mileage per Fill-up"
            value={metrics.avgMileagePerFillup.toFixed(0)}
          />
          <SecondaryCard
            title="Monthly Mileage"
            value={metrics.monthlyMileage.toFixed(0)}
          />
          <SecondaryCard
            title="Annual Mileage"
            value={metrics.annualMileage.toFixed(0)}
          />
          <SecondaryCard
            title="Monthly MPG"
            value={metrics.monthlyMPG.toFixed(1)}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost/Gallon Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cost/Gallon</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip content={<CustomTooltip valuePrefix="$" />} />
                <Line 
                  type="monotone" 
                  dataKey="costPerGallon" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* MPG Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">MPG</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip content={<CustomTooltip valueSuffix=" MPG" />} />
                <Line 
                  type="monotone" 
                  dataKey="mpg" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
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

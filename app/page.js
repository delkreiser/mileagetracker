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
        .map(row => ({
          timestamp: row.c[0]?.v || '',
          odometer: parseFloat(row.c[1]?.v || 0),
          tripMeter: parseFloat(row.c[2]?.v || 0),
          gallons: parseFloat(row.c[3]?.v || 0),
          totalCost: parseFloat(row.c[4]?.v || 0),
          costPerGallon: parseFloat(row.c[5]?.v || 0),
        }))
        .filter(item => item.gallons > 0); // Only valid fill-ups

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
    
    const now = new Date();
    const periodDays = {
      '30': 30,
      '90': 90,
      '365': 365
    };
    
    const cutoffDate = new Date(now.getTime() - periodDays[timePeriod] * 24 * 60 * 60 * 1000);
    
    return data.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= cutoffDate;
    });
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
    const annualMileage = totalMiles / ((new Date(data[data.length - 1].timestamp) - new Date(data[0].timestamp)) / (365 * 24 * 60 * 60 * 1000));
    const monthlyMileage = annualMileage / 12;

    // Monthly calculations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const lastMonthData = data.filter(d => new Date(d.timestamp) >= thirtyDaysAgo);
    const monthlyFuelCost = lastMonthData.reduce((sum, d) => sum + d.totalCost, 0);
    const monthlyMPG = lastMonthData.length > 0 
      ? lastMonthData.reduce((sum, d) => sum + (d.tripMeter / d.gallons), 0) / lastMonthData.length 
      : avgMPG;

    // Annual calculations
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const lastYearData = data.filter(d => new Date(d.timestamp) >= oneYearAgo);
    const annualFuelCost = lastYearData.reduce((sum, d) => sum + d.totalCost, 0);
    const annualMileagActual = lastYearData.length > 1
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
      annualMileage: annualMileagActual,
      monthlyMPG
    };
  };

  const metrics = calculateMetrics(data);

  const formatChartData = () => {
    return data.map(item => ({
      date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      costPerGallon: item.costPerGallon,
      mpg: item.tripMeter / item.gallons
    }));
  };

  const MetricCard = ({ title, value, prefix = '', suffix = '', change, reverseColors = false }) => {
    const isPositive = change > 0;
    const showGreen = reverseColors ? !isPositive : isPositive;
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="text-gray-600 text-sm font-medium mb-2">{title}</div>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {prefix}{value}{suffix}
        </div>
        <div className={`flex items-center text-sm font-medium ${showGreen ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
          {Math.abs(change).toFixed(2)}%
        </div>
      </div>
    );
  };

  const SecondaryCard = ({ title, value, prefix = '', suffix = '' }) => (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="text-gray-600 text-xs font-medium mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">
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
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Gas Mileage Dashboard</h1>
              <p className="text-gray-600 text-sm">
                Last updated: {lastUpdated?.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(FORM_URL, '_blank')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <ExternalLink size={18} />
                Add Fill-up
              </button>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Time Period Selector */}
          <div className="flex gap-2">
            {[
              { label: 'Last 30 Days', value: '30' },
              { label: 'Last 90 Days', value: '90' },
              { label: 'Last Year', value: '365' },
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
          />
          <MetricCard
            title="Cost/Gallon"
            value={metrics.avgCostPerGallon.toFixed(2)}
            prefix="$"
            change={metrics.costPerGallonChange}
            reverseColors={true}
          />
          <MetricCard
            title="Cost/Tank"
            value={metrics.avgCostPerTank.toFixed(2)}
            prefix="$"
            change={metrics.costPerTankChange}
            reverseColors={true}
          />
          <MetricCard
            title="Cost/Mile"
            value={metrics.avgCostPerMile.toFixed(2)}
            prefix="$"
            change={metrics.costPerMileChange}
            reverseColors={true}
          />
          <MetricCard
            title="MPG"
            value={metrics.avgMPG.toFixed(1)}
            change={metrics.mpgChange}
            reverseColors={false}
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
                  domain={['dataMin - 0.5', 'dataMax + 0.5']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
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
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
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

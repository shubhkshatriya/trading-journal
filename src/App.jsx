import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, BarChart3, PieChart, Download, Upload, Plus, Trash2, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const TradingJournal = () => {
  const [trades, setTrades] = useState([]);
  const [view, setView] = useState('table');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [timeframe, setTimeframe] = useState('daily');
  const [stockFilter, setStockFilter] = useState('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [includeBrokerage, setIncludeBrokerage] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('tradingJournalData');
    if (stored) {
      setTrades(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tradingJournalData', JSON.stringify(trades));
  }, [trades]);

  const calculateTrade = (trade) => {
    const totalQuantity = (trade.lotSize || 0) * (trade.numberOfLots || 0);
    const amountWithoutBrokerage = ((trade.sellPrice || 0) - (trade.buyPrice || 0)) * totalQuantity;
    const amountWithBrokerage = amountWithoutBrokerage - (trade.brokerage || 0);
    const profitLoss = amountWithBrokerage;
    const status = profitLoss > 0 ? 'PROFIT' : 'LOSS';

    return {
      ...trade,
      totalQuantity,
      amountWithoutBrokerage,
      amountWithBrokerage,
      profitLoss,
      status
    };
  };

  const addTrade = () => {
    const newTrade = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      stockName: '',
      type: 'BUY',
      lotSize: 0,
      numberOfLots: 0,
      buyPrice: 0,
      sellPrice: 0,
      brokerage: 0
    };
    setTrades([calculateTrade(newTrade), ...trades]);
  };

  const updateTrade = (id, field, value) => {
    setTrades(trades.map(trade => 
      trade.id === id ? calculateTrade({ ...trade, [field]: value }) : trade
    ));
  };

  const deleteTrade = (id) => {
    setTrades(trades.filter(trade => trade.id !== id));
  };

  const clearAllData = () => {
    setTrades([]);
    setShowClearConfirm(false);
    setStockFilter('all');
    setDateFilter({ start: '', end: '' });
  };

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      const matchesDate = (!dateFilter.start || tradeDate >= new Date(dateFilter.start)) &&
                         (!dateFilter.end || tradeDate <= new Date(dateFilter.end));
      const matchesStock = !stockFilter || stockFilter === 'all' || trade.stockName === stockFilter;
      return matchesDate && matchesStock;
    });
  }, [trades, dateFilter, stockFilter]);

  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const profitTradesWithBrokerage = filteredTrades.filter(t => t.profitLoss > 0);
    const lossTradesWithBrokerage = filteredTrades.filter(t => t.profitLoss < 0);
    
    const profitTradesWithoutBrokerage = filteredTrades.filter(t => t.amountWithoutBrokerage > 0);
    const lossTradesWithoutBrokerage = filteredTrades.filter(t => t.amountWithoutBrokerage < 0);
    
    const totalProfitWithBrokerage = profitTradesWithBrokerage.reduce((sum, t) => sum + t.profitLoss, 0);
    const totalLossWithBrokerage = Math.abs(lossTradesWithBrokerage.reduce((sum, t) => sum + t.profitLoss, 0));
    
    const totalProfitWithoutBrokerage = profitTradesWithoutBrokerage.reduce((sum, t) => sum + t.amountWithoutBrokerage, 0);
    const totalLossWithoutBrokerage = Math.abs(lossTradesWithoutBrokerage.reduce((sum, t) => sum + t.amountWithoutBrokerage, 0));
    
    const totalBrokerage = filteredTrades.reduce((sum, t) => sum + (t.brokerage || 0), 0);
    
    const netPLWithBrokerage = totalProfitWithBrokerage - totalLossWithBrokerage;
    const netPLWithoutBrokerage = totalProfitWithoutBrokerage - totalLossWithoutBrokerage;
    
    const winRateWithBrokerage = totalTrades > 0 ? (profitTradesWithBrokerage.length / totalTrades) * 100 : 0;
    const winRateWithoutBrokerage = totalTrades > 0 ? (profitTradesWithoutBrokerage.length / totalTrades) * 100 : 0;
    
    const avgProfitWithBrokerage = profitTradesWithBrokerage.length > 0 ? totalProfitWithBrokerage / profitTradesWithBrokerage.length : 0;
    const avgProfitWithoutBrokerage = profitTradesWithoutBrokerage.length > 0 ? totalProfitWithoutBrokerage / profitTradesWithoutBrokerage.length : 0;
    
    const avgBrokerage = totalTrades > 0 ? totalBrokerage / totalTrades : 0;

    return { 
      totalTrades, 
      totalProfitWithBrokerage, 
      totalLossWithBrokerage, 
      totalProfitWithoutBrokerage,
      totalLossWithoutBrokerage,
      totalBrokerage, 
      netPLWithBrokerage, 
      netPLWithoutBrokerage,
      winRateWithBrokerage,
      winRateWithoutBrokerage,
      avgProfitWithBrokerage,
      avgProfitWithoutBrokerage,
      avgBrokerage 
    };
  }, [filteredTrades]);

  const chartData = useMemo(() => {
    const grouped = {};
    
    filteredTrades.forEach(trade => {
      let key = trade.date;
      let displayDate = trade.date;
      
      if (timeframe === 'weekly') {
        const date = new Date(trade.date);
        const day = date.getDay();
        const diff = date.getDate() - day;
        const weekStart = new Date(date.setDate(diff));
        key = weekStart.toISOString().split('T')[0];
        displayDate = `Week of ${key}`;
      } else if (timeframe === 'monthly') {
        const [year, month] = trade.date.split('-');
        key = `${year}-${month}`;
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        displayDate = `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      
      if (!grouped[key]) {
        grouped[key] = { date: displayDate, profit: 0, loss: 0, net: 0, sortKey: key };
      }
      
      const plValue = includeBrokerage ? trade.profitLoss : trade.amountWithoutBrokerage;
      
      if (plValue > 0) {
        grouped[key].profit += plValue;
      } else {
        grouped[key].loss += Math.abs(plValue);
      }
      grouped[key].net = grouped[key].profit - grouped[key].loss;
    });

    return Object.values(grouped).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTrades, timeframe, includeBrokerage]);

  const uniqueStocks = useMemo(() => {
    const stocks = trades
      .map(t => t.stockName)
      .filter(s => s && s.trim() !== '')
      .filter((value, index, self) => self.indexOf(value) === index);
    return stocks.sort();
  }, [trades]);

  const stockData = useMemo(() => {
    const byStock = {};
    
    filteredTrades.forEach(trade => {
      if (!byStock[trade.stockName]) {
        byStock[trade.stockName] = { 
          name: trade.stockName, 
          profitWithBrokerage: 0, 
          lossWithBrokerage: 0, 
          netWithBrokerage: 0,
          profitWithoutBrokerage: 0,
          lossWithoutBrokerage: 0,
          netWithoutBrokerage: 0,
          trades: 0,
          brokerage: 0
        };
      }
      byStock[trade.stockName].trades++;
      byStock[trade.stockName].brokerage += (trade.brokerage || 0);
      
      // With brokerage
      if (trade.profitLoss > 0) {
        byStock[trade.stockName].profitWithBrokerage += trade.profitLoss;
      } else {
        byStock[trade.stockName].lossWithBrokerage += Math.abs(trade.profitLoss);
      }
      byStock[trade.stockName].netWithBrokerage += trade.profitLoss;
      
      // Without brokerage
      if (trade.amountWithoutBrokerage > 0) {
        byStock[trade.stockName].profitWithoutBrokerage += trade.amountWithoutBrokerage;
      } else {
        byStock[trade.stockName].lossWithoutBrokerage += Math.abs(trade.amountWithoutBrokerage);
      }
      byStock[trade.stockName].netWithoutBrokerage += trade.amountWithoutBrokerage;
    });

    return Object.values(byStock).sort((a, b) => 
      includeBrokerage ? b.netWithBrokerage - a.netWithBrokerage : b.netWithoutBrokerage - a.netWithoutBrokerage
    );
  }, [filteredTrades, includeBrokerage]);

  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return filteredTrades
      .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
      .map(trade => {
        cumulative += includeBrokerage ? trade.profitLoss : trade.amountWithoutBrokerage;
        return {
          date: `${trade.date} ${trade.time}`,
          cumulative: cumulative
        };
      });
  }, [filteredTrades, includeBrokerage]);

  const exportCSV = () => {
    const headers = ['Date', 'Time', 'Stock Name', 'Type', 'Lot Size', 'Number of Lots', 'Total Quantity', 'Buy Price', 'Sell Price', 'Brokerage', 'Amount Without Brokerage', 'Amount With Brokerage', 'Profit/Loss', 'Status'];
    const rows = trades.map(t => [
      t.date, t.time, t.stockName, t.type, t.lotSize, t.numberOfLots, t.totalQuantity,
      t.buyPrice, t.sellPrice, t.brokerage, t.amountWithoutBrokerage, t.amountWithBrokerage,
      t.profitLoss, t.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trades_${new Date().toISOString()}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const data = trades.map(t => ({
      'Date': t.date,
      'Time': t.time,
      'Stock Name': t.stockName,
      'Type': t.type,
      'Lot Size': t.lotSize,
      'Number of Lots': t.numberOfLots,
      'Total Quantity': t.totalQuantity,
      'Buy Price': t.buyPrice,
      'Sell Price': t.sellPrice,
      'Brokerage': t.brokerage,
      'Amount Without Brokerage': t.amountWithoutBrokerage,
      'Amount With Brokerage': t.amountWithBrokerage,
      'Profit/Loss': t.profitLoss,
      'Status': t.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Trades');
    XLSX.writeFile(workbook, `trades_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const downloadSampleExcel = () => {
    const stocks = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICI', 'SBIN', 'WIPRO', 'BHARTIARTL', 'HCLTECH', 'KOTAKBANK'];
    const sampleData = [];
    
    // Generate 1 year of sample data (approx 250 trading days)
    const startDate = new Date('2024-01-10');
    const endDate = new Date('2025-01-10');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      
      // Randomly add 0-3 trades per day
      const tradesPerDay = Math.floor(Math.random() * 4);
      
      for (let i = 0; i < tradesPerDay; i++) {
        const stock = stocks[Math.floor(Math.random() * stocks.length)];
        const lotSize = stock === 'RELIANCE' || stock === 'HDFC' ? 250 : 
                       stock === 'TCS' || stock === 'INFY' ? 125 : 
                       stock === 'SBIN' ? 1500 : 500;
        const numberOfLots = Math.floor(Math.random() * 3) + 1;
        const buyPrice = Math.random() * 2000 + 100;
        const priceChange = (Math.random() - 0.45) * 50; // Slightly biased towards profit
        const sellPrice = buyPrice + priceChange;
        const brokerage = (buyPrice * lotSize * numberOfLots * 0.0003) + (sellPrice * lotSize * numberOfLots * 0.0003) + 50; // Typical brokerage
        
        const hour = 9 + Math.floor(Math.random() * 6); // 9 AM to 3 PM
        const minute = Math.floor(Math.random() * 60);
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        sampleData.push({
          'Date': d.toISOString().split('T')[0],
          'Time': time,
          'Stock Name': stock,
          'Type': 'BUY',
          'Lot Size': lotSize,
          'Number of Lots': numberOfLots,
          'Buy Price': parseFloat(buyPrice.toFixed(2)),
          'Sell Price': parseFloat(sellPrice.toFixed(2)),
          'Brokerage': parseFloat(brokerage.toFixed(2))
        });
      }
    }
    
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Trades');
    XLSX.writeFile(workbook, 'sample_trading_data_1year.xlsx');
  };

  const importFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const fileExtension = file.name.split('.').pop().toLowerCase();

    reader.onload = (event) => {
      let data = [];

      if (fileExtension === 'csv') {
        // Handle CSV files
        const text = event.target.result;
        const lines = text.split('\n').slice(1);
        
        data = lines.filter(line => line.trim()).map((line, idx) => {
          const [date, time, stockName, type, lotSize, numberOfLots, , buyPrice, sellPrice, brokerage] = line.split(',');
          return {
            id: Date.now().toString() + idx,
            date: date?.trim() || '',
            time: time?.trim() || '',
            stockName: stockName?.trim() || '',
            type: type?.trim() || 'BUY',
            lotSize: parseFloat(lotSize) || 0,
            numberOfLots: parseFloat(numberOfLots) || 0,
            buyPrice: parseFloat(buyPrice) || 0,
            sellPrice: parseFloat(sellPrice) || 0,
            brokerage: parseFloat(brokerage) || 0
          };
        });
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        // Handle Excel files
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        data = jsonData.map((row, idx) => ({
          id: Date.now().toString() + idx,
          date: row.Date || row.date || '',
          time: row.Time || row.time || '',
          stockName: row['Stock Name'] || row.stockName || row.Stock || '',
          type: row['Buy/Sell'] || row.Type || row.type || 'BUY',
          lotSize: parseFloat(row['Lot Size'] || row.lotSize || 0),
          numberOfLots: parseFloat(row['Number of Lots'] || row.numberOfLots || row.Lots || 0),
          buyPrice: parseFloat(row['Buy Price'] || row.buyPrice || 0),
          sellPrice: parseFloat(row['Sell Price'] || row.sellPrice || 0),
          brokerage: parseFloat(row.Brokerage || row.brokerage || 0)
        }));
      }

      const imported = data.map(trade => calculateTrade(trade));
      setTrades([...imported, ...trades]);
      e.target.value = null; // Reset input
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Trading Journal</h1>
            
            <div className="flex gap-2">
              <button
                onClick={() => setView(view === 'table' ? 'dashboard' : 'table')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                {view === 'table' ? <BarChart3 size={18} /> : <Filter size={18} />}
                {view === 'table' ? 'Dashboard' : 'Table'}
              </button>
            </div>
          </div>

          {view === 'table' ? (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={addTrade} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2">
                  <Plus size={18} />
                  Add Trade
                </button>
                
                <button onClick={exportCSV} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                  <Download size={18} />
                  Export CSV
                </button>

                <button onClick={exportExcel} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2">
                  <Download size={18} />
                  Export Excel
                </button>
                
                <label className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2 cursor-pointer">
                  <Upload size={18} />
                  Import File
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={importFile} className="hidden" />
                </label>

                <button onClick={downloadSampleExcel} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                  <Download size={18} />
                  Sample Excel
                </button>

                <button onClick={() => setShowClearConfirm(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2">
                  <Trash2 size={18} />
                  Clear All Data
                </button>
              </div>

              {showClearConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 className="text-xl font-bold mb-4">Clear All Data?</h3>
                    <p className="text-gray-600 mb-6">Are you sure you want to delete all trades? This action cannot be undone.</p>
                    <div className="flex gap-3 justify-end">
                      <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                      >
                        No, Cancel
                      </button>
                      <button 
                        onClick={clearAllData}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        Yes, Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-left">Stock</th>
                      <th className="p-2 text-left">Type</th>
                      <th className="p-2 text-left">Lot Size</th>
                      <th className="p-2 text-left">Lots</th>
                      <th className="p-2 text-left">Total Qty</th>
                      <th className="p-2 text-left">Buy Price</th>
                      <th className="p-2 text-left">Sell Price</th>
                      <th className="p-2 text-left">Brokerage</th>
                      <th className="p-2 text-left">P/L (No Brok)</th>
                      <th className="p-2 text-left">P/L (With Brok)</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => (
                      <tr key={trade.id} className="border-b hover:bg-gray-50">
                        <td className="p-2"><input type="date" value={trade.date} onChange={(e) => updateTrade(trade.id, 'date', e.target.value)} className="w-full p-1 border rounded" /></td>
                        <td className="p-2"><input type="text" value={trade.stockName} onChange={(e) => updateTrade(trade.id, 'stockName', e.target.value)} className="w-full p-1 border rounded" placeholder="Stock" /></td>
                        <td className="p-2">
                          <select value={trade.type} onChange={(e) => updateTrade(trade.id, 'type', e.target.value)} className="w-full p-1 border rounded">
                            <option>BUY</option>
                            <option>SELL</option>
                          </select>
                        </td>
                        <td className="p-2"><input type="number" value={trade.lotSize === 0 ? '' : trade.lotSize} onChange={(e) => updateTrade(trade.id, 'lotSize', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-20 p-1 border rounded" placeholder="0" /></td>
                        <td className="p-2"><input type="number" value={trade.numberOfLots === 0 ? '' : trade.numberOfLots} onChange={(e) => updateTrade(trade.id, 'numberOfLots', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-20 p-1 border rounded" placeholder="0" /></td>
                        <td className="p-2 font-semibold">{trade.totalQuantity}</td>
                        <td className="p-2"><input type="number" step="0.01" value={trade.buyPrice === 0 ? '' : trade.buyPrice} onChange={(e) => updateTrade(trade.id, 'buyPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-24 p-1 border rounded" placeholder="0" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={trade.sellPrice === 0 ? '' : trade.sellPrice} onChange={(e) => updateTrade(trade.id, 'sellPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-24 p-1 border rounded" placeholder="0" /></td>
                        <td className="p-2"><input type="number" step="0.01" value={trade.brokerage === 0 ? '' : trade.brokerage} onChange={(e) => updateTrade(trade.id, 'brokerage', e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-24 p-1 border rounded" placeholder="0" /></td>
                        <td className="p-2 font-semibold">₹{trade.amountWithoutBrokerage.toFixed(2)}</td>
                        <td className={`p-2 font-bold ${trade.profitLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>₹{trade.profitLoss.toFixed(2)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${trade.status === 'PROFIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {trade.status}
                          </span>
                        </td>
                        <td className="p-2">
                          <button onClick={() => deleteTrade(trade.id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Filter</label>
                  <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="w-full p-2 border rounded">
                    <option value="all">All Stocks</option>
                    {uniqueStocks.map(stock => (
                      <option key={stock} value={stock}>{stock}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timeframe</label>
                  <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full p-2 border rounded">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-sm font-medium mb-1">View Mode</label>
                  <div className="flex items-center gap-4 p-2 bg-gray-50 rounded border">
                    <button
                      onClick={() => setIncludeBrokerage(false)}
                      className={`flex-1 px-4 py-2 rounded transition ${!includeBrokerage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                      Without Brokerage
                    </button>
                    <button
                      onClick={() => setIncludeBrokerage(true)}
                      className={`flex-1 px-4 py-2 rounded transition ${includeBrokerage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                    >
                      With Brokerage
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Trades</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalTrades}</p>
                    </div>
                    <BarChart3 className="text-blue-600" size={32} />
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Total Profit {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                      </p>
                      <p className="text-2xl font-bold text-green-900">
                        ₹{includeBrokerage ? stats.totalProfitWithBrokerage.toFixed(2) : stats.totalProfitWithoutBrokerage.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="text-green-600" size={32} />
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">
                        Total Loss {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                      </p>
                      <p className="text-2xl font-bold text-red-900">
                        ₹{includeBrokerage ? stats.totalLossWithBrokerage.toFixed(2) : stats.totalLossWithoutBrokerage.toFixed(2)}
                      </p>
                    </div>
                    <TrendingDown className="text-red-600" size={32} />
                  </div>
                </div>

                <div className={`${(includeBrokerage ? stats.netPLWithBrokerage : stats.netPLWithoutBrokerage) >= 0 ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-lg`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${(includeBrokerage ? stats.netPLWithBrokerage : stats.netPLWithoutBrokerage) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Net P/L {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                      </p>
                      <p className={`text-2xl font-bold ${(includeBrokerage ? stats.netPLWithBrokerage : stats.netPLWithoutBrokerage) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                        ₹{includeBrokerage ? stats.netPLWithBrokerage.toFixed(2) : stats.netPLWithoutBrokerage.toFixed(2)}
                      </p>
                    </div>
                    <IndianRupee className={(includeBrokerage ? stats.netPLWithBrokerage : stats.netPLWithoutBrokerage) >= 0 ? 'text-green-600' : 'text-red-600'} size={32} />
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Total Brokerage</p>
                      <p className="text-2xl font-bold text-orange-900">₹{stats.totalBrokerage.toFixed(2)}</p>
                    </div>
                    <IndianRupee className="text-orange-600" size={32} />
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Win Rate {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {includeBrokerage ? stats.winRateWithBrokerage.toFixed(1) : stats.winRateWithoutBrokerage.toFixed(1)}%
                      </p>
                    </div>
                    <PieChart className="text-purple-600" size={32} />
                  </div>
                </div>

                <div className="bg-teal-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-teal-600 font-medium">
                        Avg Profit/Trade {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                      </p>
                      <p className="text-2xl font-bold text-teal-900">
                        ₹{includeBrokerage ? stats.avgProfitWithBrokerage.toFixed(2) : stats.avgProfitWithoutBrokerage.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="text-teal-600" size={32} />
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-600 font-medium">Avg Brokerage/Trade</p>
                      <p className="text-2xl font-bold text-amber-900">₹{stats.avgBrokerage.toFixed(2)}</p>
                    </div>
                    <IndianRupee className="text-amber-600" size={32} />
                  </div>
                </div>

                <div className="bg-cyan-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-cyan-600 font-medium">Brokerage Impact</p>
                      <p className="text-2xl font-bold text-cyan-900">
                        ₹{(stats.netPLWithoutBrokerage - stats.netPLWithBrokerage).toFixed(2)}
                      </p>
                      <p className="text-xs text-cyan-700 mt-1">
                        {stats.netPLWithoutBrokerage > 0 ? ((stats.totalBrokerage / stats.netPLWithoutBrokerage) * 100).toFixed(1) : '0.0'}% of gross profit
                      </p>
                    </div>
                    <IndianRupee className="text-cyan-600" size={32} />
                  </div>
                </div>
              </div>

              {chartData.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                    {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} View Summary {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-yellow-700">Periods</p>
                      <p className="font-bold text-yellow-900">{chartData.length}</p>
                    </div>
                    <div>
                      <p className="text-yellow-700">Avg Profit/Period</p>
                      <p className="font-bold text-green-700">₹{(chartData.reduce((sum, d) => sum + d.profit, 0) / chartData.length).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-yellow-700">Avg Loss/Period</p>
                      <p className="font-bold text-red-700">₹{(chartData.reduce((sum, d) => sum + d.loss, 0) / chartData.length).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-yellow-700">Best Period</p>
                      <p className="font-bold text-green-700">₹{Math.max(...chartData.map(d => d.net)).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    P&L Trend ({timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}) {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        angle={timeframe === 'daily' ? -45 : -45} 
                        textAnchor="end" 
                        height={timeframe === 'monthly' ? 80 : 100}
                        interval={timeframe === 'daily' ? 'preserveStartEnd' : 0}
                      />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Bar dataKey="profit" fill="#10b981" name="Profit" />
                      <Bar dataKey="loss" fill="#ef4444" name="Loss" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    Stock-wise Net P/L {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Bar dataKey={includeBrokerage ? "netWithBrokerage" : "netWithoutBrokerage"} fill="#3b82f6">
                        {stockData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            (includeBrokerage ? entry.netWithBrokerage : entry.netWithoutBrokerage) > 0 ? '#10b981' : '#ef4444'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    Stock-wise Profit vs Loss {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Bar 
                        dataKey={includeBrokerage ? "profitWithBrokerage" : "profitWithoutBrokerage"} 
                        fill="#10b981" 
                        name="Profit" 
                      />
                      <Bar 
                        dataKey={includeBrokerage ? "lossWithBrokerage" : "lossWithoutBrokerage"} 
                        fill="#ef4444" 
                        name="Loss" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">Stock-wise Trade Count</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stockData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="trades" fill="#3b82f6" name="Number of Trades" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    Cumulative P/L {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cumulativeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" hide />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                      <Legend />
                      <Line type="monotone" dataKey="cumulative" stroke="#8b5cf6" strokeWidth={2} name="Cumulative P/L" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">
                    Profit vs Loss Distribution {includeBrokerage ? '(With Brokerage)' : '(Without Brokerage)'}
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RePieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Profit', 
                            value: includeBrokerage ? stats.totalProfitWithBrokerage : stats.totalProfitWithoutBrokerage 
                          },
                          { 
                            name: 'Loss', 
                            value: includeBrokerage ? stats.totalLossWithBrokerage : stats.totalLossWithoutBrokerage 
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) => `${name}: ₹${value.toFixed(0)} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>

                {stockData.length > 0 && (
                  <div className="bg-white p-4 rounded-lg border lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Stock Performance Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="p-2 text-left">Stock</th>
                            <th className="p-2 text-right">Trades</th>
                            <th className="p-2 text-right">Gross Profit</th>
                            <th className="p-2 text-right">Gross Loss</th>
                            <th className="p-2 text-right">Gross Net P/L</th>
                            <th className="p-2 text-right">Total Brokerage</th>
                            <th className="p-2 text-right">Net P/L (After Brok)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockData.map((stock, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2 font-semibold">{stock.name}</td>
                              <td className="p-2 text-right">{stock.trades}</td>
                              <td className="p-2 text-right text-green-600">₹{stock.profitWithoutBrokerage.toFixed(2)}</td>
                              <td className="p-2 text-right text-red-600">₹{stock.lossWithoutBrokerage.toFixed(2)}</td>
                              <td className={`p-2 text-right font-semibold ${stock.netWithoutBrokerage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{stock.netWithoutBrokerage.toFixed(2)}
                              </td>
                              <td className="p-2 text-right text-orange-600 font-semibold">₹{stock.brokerage.toFixed(2)}</td>
                              <td className={`p-2 text-right font-bold ${stock.netWithBrokerage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹{stock.netWithBrokerage.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-bold border-t-2">
                            <td className="p-2">TOTAL</td>
                            <td className="p-2 text-right">{stockData.reduce((sum, s) => sum + s.trades, 0)}</td>
                            <td className="p-2 text-right text-green-600">₹{stockData.reduce((sum, s) => sum + s.profitWithoutBrokerage, 0).toFixed(2)}</td>
                            <td className="p-2 text-right text-red-600">₹{stockData.reduce((sum, s) => sum + s.lossWithoutBrokerage, 0).toFixed(2)}</td>
                            <td className={`p-2 text-right ${stockData.reduce((sum, s) => sum + s.netWithoutBrokerage, 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{stockData.reduce((sum, s) => sum + s.netWithoutBrokerage, 0).toFixed(2)}
                            </td>
                            <td className="p-2 text-right text-orange-600">₹{stockData.reduce((sum, s) => sum + s.brokerage, 0).toFixed(2)}</td>
                            <td className={`p-2 text-right ${stockData.reduce((sum, s) => sum + s.netWithBrokerage, 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{stockData.reduce((sum, s) => sum + s.netWithBrokerage, 0).toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingJournal;
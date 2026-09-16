import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, Truck, AlertTriangle, CheckCircle, Search, 
  User, Calendar, MapPin, Key, X, Check, FileText,
  History, Printer, Download, Clock, Activity, ListChecks, FileSpreadsheet,
  PackagePlus, UploadCloud, FileCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [auditData, setAuditData] = useState(null);
  
  const [reportsData, setReportsData] = useState({ daily: [], outstanding: [] });
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchReports = async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/reports/daily`);
      const dailyData = await res.json();
      const outRes = await fetch(`http://localhost:5000/api/reports/outstanding`);
      const outstandingData = await outRes.json();
      
      setReportsData({ 
        daily: Array.isArray(dailyData) ? dailyData : [], 
        outstanding: Array.isArray(outstandingData) ? outstandingData : [] 
      });
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setIsReportsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:5000/api/licences/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
        if (data.length === 1) {
          setSelectedLicence(data[0]);
        } else if (selectedLicence) {
          const updated = data.find(l => l.licence_id === selectedLicence.licence_id);
          if (updated) setSelectedLicence(updated);
        }
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = async (licenceId) => {
    await fetchStats();
    if (searchQuery.trim()) {
      await handleSearch();
    }
    if (activeTab === 'reports') {
      await fetchReports();
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleViewAudit = async (licence) => {
    try {
      const res = await fetch(`http://localhost:5000/api/licences/${licence.licence_id}/history`);
      const data = await res.json();
      setAuditData({ licence, ...data });
      setShowAuditDrawer(true);
    } catch (err) {
      console.error('Failed to fetch audit trail', err);
      alert('Failed to load audit history.');
    }
  };

  const handleResolveMissing = async (licence) => {
    if (!licence.missing_id) return;
    const resolution = prompt('Enter resolution for this missing licence:');
    if (!resolution) return;

    try {
      const res = await fetch(`http://localhost:5000/api/missing/${licence.missing_id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      if (!res.ok) throw new Error('Failed to resolve missing licence');
      showToast('Missing licence resolved');
      handleRefresh(licence.licence_id);
    } catch (err) {
      console.error(err);
      alert('Failed to resolve missing licence');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Card Tracker</h1>
          </div>
          
          <div className="flex-1 flex justify-center">
            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => setActiveTab('terminal')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'terminal' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Activity className="w-4 h-4 mr-2" />
                Desk Terminal
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'reports' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Daily Reports
              </button>
              <button 
                onClick={() => setActiveTab('intake')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'intake' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <PackagePlus className="w-4 h-4 mr-2" />
                Intake / Dispatch
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="w-64 relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="w-full pl-9 pr-8 py-1.5 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded">⌘K</kbd>
            </div>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-bounce z-50">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{toastMessage}</span>
          </div>
        )}

        {activeTab === 'terminal' ? (
          <>
            {/* Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard title="Dispatched" value={stats?.dispatched || 0} icon={<Truck className="w-5 h-5 text-indigo-500" />} />
              <StatCard title="Available (Outstanding)" value={stats?.outstanding || 0} icon={<CreditCard className="w-5 h-5 text-emerald-500" />} />
              <StatCard title="Collected Total" value={stats?.collected || 0} icon={<CheckCircle className="w-5 h-5 text-slate-500" />} 
                subtitle={`Today: ${stats?.today_personal || 0} Personal / ${stats?.today_proxy || 0} Proxy`} />
              <StatCard title="Missing" value={stats?.missing || 0} icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} />
            </div>

            {/* Workspace Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Results List */}
              <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-150">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-700">Search Results {searchResults.length > 0 && `(${searchResults.length})`}</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {isSearching ? (
                    <div className="flex justify-center p-8 text-slate-400">Searching...</div>
                  ) : !Array.isArray(searchResults) || searchResults.length === 0 ? (
                    <div className="text-center p-8 text-sm text-slate-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No licences found. Use the search bar above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map(licence => (
                        <div 
                          key={licence.licence_id} 
                          onClick={() => setSelectedLicence(licence)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedLicence?.licence_id === licence.licence_id 
                              ? 'bg-indigo-50 border-indigo-200' 
                              : 'bg-white border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-slate-900 text-sm">{licence.licence_number}</span>
                            <StatusBadge status={licence.status} />
                          </div>
                          <p className="text-xs text-slate-600 truncate">{licence.applicant_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Card & Action Panel */}
              <div className="lg:col-span-2">
                {selectedLicence ? (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedLicence.applicant_name}</h2>
                        <div className="flex items-center text-sm text-slate-500 space-x-4">
                          <span className="flex items-center"><CreditCard className="w-4 h-4 mr-1" /> {selectedLicence.licence_number}</span>
                          <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {selectedLicence.phone_number}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <StatusBadge status={selectedLicence.status} size="lg" />
                        <button 
                          onClick={() => handleViewAudit(selectedLicence)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                        >
                          <History className="w-3 h-3 mr-1" /> Audit Trail
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <InfoItem icon={<MapPin className="w-4 h-4 text-slate-400" />} label="Address" value={selectedLicence.address} />
                      <InfoItem icon={<Key className="w-4 h-4 text-slate-400" />} label="Pickup Code" value={selectedLicence.pickup_code} />
                      <InfoItem icon={<Truck className="w-4 h-4 text-slate-400" />} label="Dispatch Code" value={selectedLicence.dispatch_code} />
                      <InfoItem icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Arrival Date" value={new Date(selectedLicence.date_received).toLocaleDateString()} />
                    </div>

                    <div className="flex-1">
                      {selectedLicence.status === 'Collected' && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-2">
                          <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-1 text-slate-400" /> Collection Record
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><span className="text-slate-500">Type:</span> {selectedLicence.collection_type}</p>
                            <p><span className="text-slate-500">Date:</span> {new Date(selectedLicence.collection_date).toLocaleString()}</p>
                            <p><span className="text-slate-500">Collector:</span> {selectedLicence.collector_name}</p>
                            <p><span className="text-slate-500">Phone:</span> {selectedLicence.collector_phone}</p>
                            {selectedLicence.collection_type === 'Proxy' && (
                              <>
                                <p><span className="text-slate-500">ID:</span> {selectedLicence.collector_id_num}</p>
                                <p><span className="text-slate-500">Relation:</span> {selectedLicence.relationship}</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedLicence.status === 'Missing' && (
                        <div className="bg-rose-50 rounded-lg p-4 border border-rose-200 mt-2">
                          <h4 className="text-xs font-semibold uppercase text-rose-600 mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1 text-rose-500" /> Missing Record
                          </h4>
                          <p className="text-sm text-rose-800 mb-1"><span className="font-medium">Reason:</span> {selectedLicence.reason}</p>
                          <p className="text-sm text-rose-800"><span className="font-medium">Reported:</span> {new Date(selectedLicence.date_reported).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto border-t border-slate-100 pt-6 flex space-x-3">
                      {selectedLicence.status === 'Available' && (
                        <>
                          <button 
                            onClick={() => setShowModal(true)}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center"
                          >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Record Collection
                          </button>
                          <button 
                            onClick={() => setShowMissingModal(true)}
                            className="px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium rounded-lg shadow-sm transition-colors flex justify-center items-center"
                          >
                            <AlertTriangle className="w-5 h-5 text-slate-400" />
                          </button>
                        </>
                      )}
                      
                      {selectedLicence.status === 'Missing' && (
                        <button 
                          onClick={() => handleResolveMissing(selectedLicence)}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center"
                        >
                          <ListChecks className="w-5 h-5 mr-2" />
                          Resolve Issue (Return to Available)
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Select a licence record to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : activeTab === 'reports' ? (
          <ReportsView data={reportsData} isLoading={isReportsLoading} />
        ) : (
          <IntakeView setActiveTab={setActiveTab} showToast={showToast} />
        )}
      </main>

      {/* Modals */}
      {showModal && selectedLicence && (
        <CollectionModal 
          licence={selectedLicence} 
          onClose={() => setShowModal(false)} 
          onSuccess={() => {
            setShowModal(false);
            showToast('Collection recorded successfully!');
            handleRefresh(selectedLicence.licence_id);
          }}
        />
      )}

      {showMissingModal && selectedLicence && (
        <ReportMissingModal 
          licence={selectedLicence}
          onClose={() => setShowMissingModal(false)}
          onSuccess={() => {
            setShowMissingModal(false);
            showToast('Licence marked as missing');
            handleRefresh(selectedLicence.licence_id);
          }}
        />
      )}

      {showAuditDrawer && auditData && (
        <AuditDrawer 
          data={auditData}
          onClose={() => setShowAuditDrawer(false)}
        />
      )}
    </div>
  );
}

// Subcomponents

function ReportsView({ data, isLoading }) {
  const handleExportCSV = () => {
    if (!data?.daily?.length) return;
    const headers = ['Licence Number', 'Applicant Name', 'Type', 'Collector Name', 'Phone', 'Verification', 'Date'];
    const rows = data.daily.map(d => [
      d.licence_number, d.applicant_name, d.collection_type, d.collector_name, d.collector_phone, 
      d.verification, new Date(d.collection_date).toLocaleString()
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${cell || ''}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `daily_collections_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Activity className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Daily Collections */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900">Today's Collection Log</h3>
            <p className="text-sm text-slate-500">{data?.daily?.length || 0} cards processed today</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={() => window.print()} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Print">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={handleExportCSV} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center" title="Export CSV">
              <Download className="w-5 h-5 mr-1" /> <span className="text-sm font-medium">Export</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Licence / Applicant</th>
                <th className="px-6 py-3 font-semibold">Collection Type</th>
                <th className="px-6 py-3 font-semibold">Collector Info</th>
                <th className="px-6 py-3 font-semibold">Verification</th>
                <th className="px-6 py-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.daily || data.daily.length === 0) ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No collections recorded today.</td></tr>
              ) : data.daily.map(row => (
                <tr key={row.collection_id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{row.licence_number}</div>
                    <div className="text-xs text-slate-500">{row.applicant_name}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row.collection_type === 'Personal' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {row.collection_type}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-slate-900">{row.collector_name}</div>
                    <div className="text-xs text-slate-500">{row.collector_phone}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{row.verification}</td>
                  <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{new Date(row.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outstanding Cards */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-rose-500" /> Stale / Outstanding Cards {'>'}30 Days
          </h3>
          <p className="text-sm text-slate-500">{data?.outstanding?.length || 0} cards pending pickup</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-100 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Licence Number</th>
                <th className="px-6 py-3 font-semibold">Applicant Name</th>
                <th className="px-6 py-3 font-semibold">Phone Number</th>
                <th className="px-6 py-3 font-semibold">Arrival Date</th>
                <th className="px-6 py-3 font-semibold text-right">Days Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!data?.outstanding || data.outstanding.length === 0) ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No stale cards found.</td></tr>
              ) : data.outstanding.map(row => (
                <tr key={row.licence_id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{row.licence_number}</td>
                  <td className="px-6 py-3 text-slate-700">{row.applicant_name}</td>
                  <td className="px-6 py-3 text-slate-600">{row.phone_number}</td>
                  <td className="px-6 py-3 text-slate-500">{new Date(row.date_received).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right">
                    <span className="font-bold text-rose-600">{row.days_pending}</span> <span className="text-xs text-slate-500">days</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditDrawer({ data, onClose }) {
  const { licence, dispatch, collections, missing_incidents } = data;
  
  // Build timeline events
  let events = [];
  
  if (dispatch) {
    events.push({
      id: 'dispatch',
      date: new Date(dispatch.date_received),
      title: 'Received from Dispatch',
      desc: `Manifest ${dispatch.dispatch_code} arrived on ${new Date(dispatch.dispatch_date).toLocaleDateString()}`,
      icon: <Truck className="w-4 h-4 text-emerald-600" />,
      color: 'bg-emerald-100 border-emerald-200'
    });
  }

  (collections || []).forEach(c => {
    events.push({
      id: `col-${c.collection_id}`,
      date: new Date(c.collection_date),
      title: `${c.collection_type} Collection Record`,
      desc: `Collected by ${c.collector_name} (${c.collector_phone}). Verified via ${c.verification}.`,
      icon: <CheckCircle className="w-4 h-4 text-indigo-600" />,
      color: 'bg-indigo-100 border-indigo-200'
    });
  });

  (missing_incidents || []).forEach(m => {
    events.push({
      id: `miss-${m.missing_id}-rep`,
      date: new Date(m.date_reported),
      title: 'Reported Missing',
      desc: `Reason: ${m.reason}. Action taken: ${m.action_taken || 'None'}`,
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      color: 'bg-rose-100 border-rose-200'
    });
    if (m.status === 'Resolved') {
      events.push({
        id: `miss-${m.missing_id}-res`,
        date: new Date(m.date_reported), // simplistic, doesn't have resolution date
        title: 'Missing Issue Resolved',
        desc: `Resolution: ${m.resolution}`,
        icon: <Check className="w-4 h-4 text-slate-600" />,
        color: 'bg-slate-100 border-slate-200'
      });
    }
  });

  events.sort((a, b) => b.date - a.date); // Sort descending

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200 transform transition-transform">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div className="flex items-center text-slate-900">
          <History className="w-5 h-5 mr-2 text-indigo-600" />
          <h3 className="font-bold">Audit Trail</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="px-6 py-4 border-b border-slate-100">
        <p className="text-sm font-medium text-slate-500 mb-1">Licence</p>
        <p className="font-bold text-slate-900">{licence.licence_number}</p>
        <p className="text-sm text-slate-600">{licence.applicant_name}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-linear-to-b before:from-transparent before:via-slate-200 before:to-transparent">
          {events.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4 relative z-10">No history events found.</p>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${ev.color}`}>
                  {ev.icon}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm z-10">
                  <div className="flex items-center justify-between space-x-2 mb-1">
                    <div className="font-bold text-slate-900 text-sm">{ev.title}</div>
                  </div>
                  <div className="text-slate-500 text-xs mb-2">{ev.date.toLocaleString()}</div>
                  <div className="text-slate-700 text-sm">{ev.desc}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ReportMissingModal({ licence, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ reason: '', action_taken: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/missing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licence_id: licence.licence_id, ...formData })
      });
      if (!res.ok) throw new Error('Failed');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to report missing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-rose-100 flex justify-between items-center bg-rose-50">
          <h3 className="font-bold text-rose-800 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" /> Report Missing
          </h3>
          <button onClick={onClose} className="text-rose-400 hover:text-rose-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 text-sm text-slate-600 border-b border-slate-100 pb-4">
            You are reporting <span className="font-semibold text-slate-900">{licence.licence_number}</span> ({licence.applicant_name}) as missing.
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reason / Details</label>
              <textarea 
                required rows={3} value={formData.reason} onChange={e => setFormData(p => ({...p, reason: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm resize-none"
                placeholder="e.g. Could not locate in dispatch box B"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Action Taken (Optional)</label>
              <textarea 
                rows={2} value={formData.action_taken} onChange={e => setFormData(p => ({...p, action_taken: e.target.value}))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm resize-none"
                placeholder="e.g. Searched adjacent boxes, notified supervisor"
              />
            </div>
          </div>
          <div className="mt-8">
            <button type="submit" disabled={isSubmitting || !formData.reason} className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-medium py-2.5 rounded-lg transition-colors">
              {isSubmitting ? 'Reporting...' : 'Confirm Missing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start space-x-4">
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value || '-'}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, size = 'sm' }) {
  const styles = {
    Available: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Collected: 'bg-slate-100 text-slate-700 border-slate-200',
    Missing: 'bg-rose-100 text-rose-700 border-rose-200'
  };
  
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${sizeClasses} ${styles[status] || styles.Available}`}>
      {status === 'Available' && <CheckCircle className="w-3 h-3 mr-1" />}
      {status}
    </span>
  );
}

function CollectionModal({ licence, onClose, onSuccess }) {
  const [type, setType] = useState('Personal');
  const [formData, setFormData] = useState({
    collector_name: licence.applicant_name,
    collector_phone: licence.phone_number || '',
    collector_id_num: '',
    relationship: '',
    idVerified: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isFormValid = () => {
    if (type === 'Personal') {
      return formData.collector_name && formData.collector_phone && formData.idVerified;
    }
    return formData.collector_name && formData.collector_phone && formData.collector_id_num && formData.relationship;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licence_id: licence.licence_id,
          collection_type: type,
          collector_name: formData.collector_name,
          collector_phone: formData.collector_phone,
          collector_id_num: formData.collector_id_num,
          relationship: formData.relationship,
          verification: type === 'Personal' && formData.idVerified ? 'Physical ID Checked' : 'Proxy Docs Checked'
        })
      });

      if (!res.ok) throw new Error('Submission failed');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to record collection. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Record Collection</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'Personal' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => {
                setType('Personal');
                setFormData(prev => ({ ...prev, collector_name: licence.applicant_name, collector_phone: licence.phone_number || '' }));
              }}
            >
              Personal Collection
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${type === 'Proxy' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => {
                setType('Proxy');
                setFormData(prev => ({ ...prev, collector_name: '', collector_phone: '', collector_id_num: '', relationship: '' }));
              }}
            >
              Proxy Collection
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <input 
                name="collector_name" value={formData.collector_name} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
              <input 
                name="collector_phone" value={formData.collector_phone} onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                required
              />
            </div>

            {type === 'Proxy' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">NIN / ID Number</label>
                  <input 
                    name="collector_id_num" value={formData.collector_id_num} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship to Applicant</label>
                  <input 
                    name="relationship" value={formData.relationship} onChange={handleChange} placeholder="e.g. Brother, Wife"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
              </>
            )}

            {type === 'Personal' && (
              <label className="flex items-start space-x-3 mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-md cursor-pointer">
                <input 
                  type="checkbox" name="idVerified" checked={formData.idVerified} onChange={handleChange}
                  className="mt-0.5 h-4 w-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" 
                />
                <span className="text-sm font-medium text-indigo-900">
                  I have physically verified the applicant's Identity Card.
                </span>
              </label>
            )}
          </div>

          <div className="mt-8">
            <button 
              type="submit" 
              disabled={!isFormValid() || isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center"
            >
              {isSubmitting ? 'Recording...' : 'Confirm Collection'}
              {!isSubmitting && <Check className="w-4 h-4 ml-2" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IntakeView({ setActiveTab, showToast }) {
  const [isUploading, setIsUploading] = useState(false);
  const [stagedManifest, setStagedManifest] = useState(null);
  const [records, setRecords] = useState([]);
  const [showSmsPreview, setShowSmsPreview] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [pastDispatches, setPastDispatches] = useState([]);
  const [stagedFileName, setStagedFileName] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [viewManifestData, setViewManifestData] = useState(null);
  const [viewManifestName, setViewManifestName] = useState('');
  const [isViewing, setIsViewing] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const fileInputRef = useRef(null);

  const fetchManifestContents = async (id, name) => {
    setIsViewing(true);
    setViewManifestName(name);
    setViewManifestData(null);
    setModalSearchQuery('');
    try {
      const res = await fetch(`http://localhost:5000/api/dispatches/${id}/licences`);
      if (res.ok) {
        setViewManifestData(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDispatches = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('http://localhost:5000/api/dispatches');
      if (res.ok) {
        const data = await res.json();
        setPastDispatches(data);
      }
    } catch (err) {
      console.error('Failed to fetch dispatches:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStagedFileName(file.name);
    setIsUploading(true);
    setStagedManifest(null);
    setRecords([]);

    const formData = new FormData();
    formData.append('manifest', file);

    try {
      const res = await fetch('http://localhost:5000/api/dispatches/upload-manifest', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setStagedManifest(data);
      setRecords(data.records);
    } catch (err) {
      alert(err.message);
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };



  const handleCommit = async () => {
    if (!records?.length) return;

    setIsCommitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/dispatches/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          manifest_code: stagedManifest?.file_name || `DISP-OJO-${Date.now()}`,
          file_name: stagedManifest?.file_name || `DISP-OJO-${Date.now()}`,
          received_date: new Date().toISOString().split('T')[0],
          cards: records
        })
      });
      
      if (!res.ok) {
        const text = await res.text();
        let errMsg = 'Commit failed';
        try {
          const data = JSON.parse(text);
          errMsg = data.error || errMsg;
        } catch (e) {
          errMsg = text;
        }
        throw new Error(errMsg);
      }

      const data = await res.json();

      showToast(`Successfully added ${data.count} licences to the database!`);
      setStagedManifest(null);
      setRecords([]);
      fetchDispatches();
    } catch (err) {
      alert(err.message);
      console.error(err);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">MVAA Ojo Station - Dispatch & Ingestion Desk</h2>
        <p className="text-sm text-slate-500 mb-6">Upload Lagos State HQ Manifest. System will automatically filter and extract Ojo Station records.</p>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer mb-8 ${isUploading ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:bg-slate-100 bg-slate-50'}`}
        >
          {isUploading ? (
            <Activity className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
          ) : (
            <UploadCloud className="w-12 h-12 text-indigo-400 mb-4" />
          )}
          <p className="text-slate-700 font-medium mb-1">
            {isUploading ? 'Processing manifest...' : 'Drag and drop your manifest file here, or click to browse'}
          </p>
          <p className="text-xs text-slate-500">Supports .xlsx, .xls</p>
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleFileSelect}
          />
        </div>

        {stagedManifest && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            {/* INGESTION SUMMARY BANNER */}
            <div className={`px-6 py-3 border-b border-slate-200 text-sm font-medium flex items-center justify-center ${stagedManifest.new_records_count > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Ingestion Summary: {stagedManifest.new_records_count} New Licences to be added • {stagedManifest.duplicate_count} Existing records detected (will be skipped).
            </div>

            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Staged: {records.length} Ojo Licences Ready</h3>
                <div className="mt-2 flex items-center text-sm font-medium text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-md shadow-sm w-fit">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600 mr-2" />
                  {stagedFileName}
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowSmsPreview(!showSmsPreview)}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm"
                >
                  {showSmsPreview ? 'Hide SMS Preview' : 'View SMS Campaign Preview'}
                </button>
                <button 
                  onClick={handleCommit}
                  disabled={isCommitting || stagedManifest.new_records_count === 0}
                  className={`px-4 py-2 font-medium rounded-lg shadow-sm transition-colors text-sm flex items-center ${stagedManifest.new_records_count === 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400'}`}
                >
                  {isCommitting ? (
                    <><Activity className="w-4 h-4 mr-2 animate-spin" /> Committing...</>
                  ) : stagedManifest.new_records_count === 0 ? (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Manifest already imported</>
                  ) : (
                    <><CheckCircle className="w-4 h-4 mr-2" /> Confirm & Import {stagedManifest.new_records_count} New Licences</>
                  )}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-slate-100 text-slate-500 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold">S/N</th>
                    <th className="px-6 py-3 font-semibold">DL Number</th>
                    <th className="px-6 py-3 font-semibold">Applicant Name</th>
                    <th className="px-6 py-3 font-semibold">Phone Number</th>
                    <th className="px-6 py-3 font-semibold">Pickup Code</th>
                    {showSmsPreview && <th className="px-6 py-3 font-semibold">SMS Preview</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((rec, i) => (
                    <tr key={i} className={rec.is_duplicate ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}>
                      <td className="px-6 py-3 text-slate-500">{rec.sn}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center">
                          <span className={`font-medium ${rec.is_duplicate ? 'text-amber-800' : 'text-indigo-700'}`}>{rec.licence_number}</span>
                          {rec.is_duplicate ? (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                              Already Exists
                            </span>
                          ) : (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                              New Intake
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-slate-900">{rec.applicant_name}</td>
                      <td className="px-6 py-3 text-slate-600">{rec.phone_number || '-'}</td>
                      <td className="px-6 py-3 font-medium text-slate-700">{rec.pickup_code || '-'}</td>
                      {showSmsPreview && (
                        <td className="px-6 py-3 text-xs text-slate-500 italic max-w-xs truncate" title={rec.sms_preview}>
                          {rec.sms_preview}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center">
            <History className="w-5 h-5 mr-2 text-indigo-500" /> Ingested Manifest Archive
          </h3>
          <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
            {pastDispatches.length} Total
          </span>
        </div>
        
        {isLoadingHistory ? (
          <div className="p-8 flex justify-center items-center">
            <Activity className="w-6 h-6 text-indigo-500 animate-spin" />
            <span className="ml-3 text-slate-500 font-medium text-sm">Loading archive...</span>
          </div>
        ) : pastDispatches.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No recent dispatches found. Upload your first manifest above.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold">File / Batch Name</th>
                  <th className="px-6 py-3 font-semibold">Date Ingested</th>
                  <th className="px-6 py-3 font-semibold">Total Cards</th>
                  <th className="px-6 py-3 font-semibold">Available vs Collected</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastDispatches.map((dispatch) => (
                  <tr key={dispatch.dispatch_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <button 
                        onClick={() => fetchManifestContents(dispatch.dispatch_id, dispatch.dispatch_code)}
                        className="flex items-center hover:text-indigo-600 hover:underline transition-colors focus:outline-none"
                        title="Click to view the contents of this manifest"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-indigo-400" />
                        {dispatch.dispatch_code}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {new Date(dispatch.dispatch_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {dispatch.total_licences}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="text-emerald-600 font-medium">{dispatch.available_count} Available</span> 
                      <span className="text-slate-400 mx-2">•</span> 
                      <span className="text-indigo-600 font-medium">{dispatch.collected_count} Collected</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active In Inventory
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manifest Viewer Modal */}
      {isViewing && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-500 mr-2" /> 
                  {viewManifestName}
                </h3>
                <p className="text-sm text-slate-500 mt-1">Showing {viewManifestData?.length || 0} records imported from this batch.</p>
              </div>
              <div className="flex items-center space-x-4">
                {viewManifestData && (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search records..."
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                    />
                  </div>
                )}
                <button onClick={() => setIsViewing(false)} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {!viewManifestData ? (
                <div className="flex justify-center p-8"><Activity className="w-8 h-8 text-indigo-500 animate-spin" /></div>
              ) : viewManifestData.length === 0 ? (
                <div className="text-center p-8 text-slate-500">No records found for this manifest.</div>
              ) : (
                <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-3 font-semibold">S/N</th>
                      <th className="px-6 py-3 font-semibold">DL Number</th>
                      <th className="px-6 py-3 font-semibold">Applicant Name</th>
                      <th className="px-6 py-3 font-semibold">Phone Number</th>
                      <th className="px-6 py-3 font-semibold">Pickup Code</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewManifestData.filter(rec => 
                      !modalSearchQuery || 
                      (rec.applicant_name && rec.applicant_name.toLowerCase().includes(modalSearchQuery.toLowerCase())) ||
                      (rec.licence_number && rec.licence_number.toLowerCase().includes(modalSearchQuery.toLowerCase())) ||
                      (rec.phone_number && rec.phone_number.includes(modalSearchQuery)) ||
                      (rec.pickup_code && rec.pickup_code.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                    ).map((rec, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-500 font-medium">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-indigo-700">{rec.licence_number}</td>
                        <td className="px-6 py-3 text-slate-900">{rec.applicant_name}</td>
                        <td className="px-6 py-3 text-slate-600">{rec.phone_number || '-'}</td>
                        <td className="px-6 py-3 font-medium text-slate-700">{rec.pickup_code || '-'}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

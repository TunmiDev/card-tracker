import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, Truck, AlertTriangle, CheckCircle, Search, 
  User, Calendar, MapPin, Key, X, Check, FileText,
  History, Printer, Download, Clock, Activity, ListChecks, FileSpreadsheet,
  PackagePlus, UploadCloud, FileCheck, ChevronDown, Edit2, Trash2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState(null);
  
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const [showModal, setShowModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [auditData, setAuditData] = useState(null);
  
  const [reportsData, setReportsData] = useState({ daily: null, outstanding: [] });
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

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
    fetchBatches();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(reportDate);
    }
  }, [activeTab, reportDate]);

  const fetchBatches = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dispatches');
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const fetchReports = async (dateStr) => {
    setIsReportsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/reports/daily?date=${dateStr}`);
      const dailyData = await res.json();
      const outRes = await fetch(`http://localhost:5000/api/reports/outstanding`);
      const outstandingData = await outRes.json();
      
      setReportsData({ 
        daily: dailyData, 
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
    setCurrentPage(1);
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`http://localhost:5000/api/licences/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBatch]);

  const filteredResults = searchResults.filter(licence => 
    selectedBatch === 'all' || licence.dispatch_id === Number(selectedBatch)
  );
  
  const itemsPerPage = 25;
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage) || 1;
  const paginatedResults = filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 print:hidden">
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

          {activeTab !== 'terminal' && (
            <form onSubmit={handleSearch} className="w-64 relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
              <input 
                ref={searchInputRef}
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (!val.trim()) {
                    setSearchResults([]);
                    setHasSearched(false);
                  }
                }}
                placeholder="Search..." 
                className="w-full pl-9 pr-8 py-1.5 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded">⌘K</kbd>
              </div>
            </form>
          )}
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
            {/* Unified Search and Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
              {/* Header Title */}
              <div className="px-6 pt-6 pb-2 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                    Dispatch Index
                  </h2>
                  <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">2026 Till Date</span>
                </div>
              </div>

              {/* Search Filter Control */}
              <div className="p-6 border-b border-slate-200 bg-white flex flex-col items-center">
                <div className="w-full max-w-2xl flex flex-col items-center">
                  {/* Input Field */}
                  <div className="relative w-full flex gap-3 items-center group">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      ref={activeTab === 'terminal' ? searchInputRef : null}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        if (!val.trim()) {
                          setSearchResults([]);
                          setHasSearched(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      placeholder="Type DL Number or Applicant Name and hit Enter..."
                      className="w-full pl-12 pr-20 py-3 bg-white border-2 border-slate-300 rounded focus:outline-none focus:border-blue-500 text-lg uppercase font-mono shadow-sm transition-colors text-slate-900 placeholder:text-base placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans"
                    />
                    {!searchQuery ? (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <kbd className="hidden lg:inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded shadow-sm">
                          <span>↵</span>
                          <span>Enter</span>
                        </kbd>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setHasSearched(false);
                        }}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto bg-slate-50">
                {isSearching ? (
                  <div className="flex justify-center p-12"><Activity className="w-8 h-8 text-blue-500 animate-spin" /></div>
                ) : !hasSearched ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-12 mt-16">
                    <div className="bg-slate-100 p-5 rounded-full mb-4 ring-8 ring-slate-50">
                      <Search className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">Search for a Driver's License</h3>
                    <p className="text-slate-500 max-w-sm">Enter a DL Number or Applicant Name in the search bar above to begin.</p>
                  </div>
                ) : !Array.isArray(filteredResults) || filteredResults.length === 0 ? (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-indigo-700 border-b border-indigo-800 text-white font-semibold uppercase text-xs sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-4 tracking-wider whitespace-nowrap">dl_number</th>
                        <th className="px-6 py-4 tracking-wider">applicant name</th>
                        <th className="px-6 py-4 tracking-wider whitespace-nowrap">pickup Code</th>
                        <th className="px-6 py-4 tracking-wider">status</th>
                        <th className="px-6 py-4 tracking-wider">action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      <tr><td colSpan="5" className="text-center p-12 text-sm text-slate-500">No record found for this DL Number or Name.</td></tr>
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-indigo-600 border-b border-indigo-800 text-white font-semibold uppercase text-xs sticky top-0 shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-4 tracking-wider whitespace-nowrap">dl number</th>
                        <th className="px-6 py-4 tracking-wider">applicant name</th>
                        <th className="px-6 py-4 tracking-wider whitespace-nowrap">pickup Code</th>
                        <th className="px-6 py-4 tracking-wider">status</th>
                        <th className="px-6 py-4 tracking-wider">action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {paginatedResults.map((licence) => (
                        <tr key={licence.licence_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-mono font-medium text-slate-900">{licence.licence_number}</td>
                          <td className="px-6 py-4 font-medium text-slate-900">{licence.applicant_name}</td>
                          <td className="px-6 py-4">
                            {licence.pickup_code ? (
                              <span className="font-mono font-medium text-slate-700">{licence.pickup_code}</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200 shadow-sm">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {licence.status === 'Available' ? (
                              <span className="inline-flex w-max items-center px-2.5 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {licence.status}
                              </span>
                            ) : licence.status === 'Missing' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold">
                                {licence.status}
                              </span>
                            ) : (
                              <div className="flex flex-col space-y-1">
                                <span className="inline-flex w-max items-center px-2.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Collected
                                </span>
                                {licence.collector_name && (
                                  <span className="text-xs text-slate-500">
                                    {licence.collection_type ? `${licence.collection_type} • ` : ''}{licence.collector_name}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {licence.status === 'Available' ? (
                              <button
                                onClick={() => {
                                  setSelectedLicence(licence);
                                  setShowModal(true);
                                }}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm text-xs"
                              >
                                Hand Over / Collect
                              </button>
                            ) : licence.status === 'Missing' ? (
                              <button
                                onClick={() => handleResolveMissing(licence)}
                                className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded transition-colors shadow-sm text-xs"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              
              {/* Pagination */}
              {!isSearching && filteredResults.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Showing <span className="font-medium text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredResults.length)}</span> of <span className="font-medium text-slate-900">{filteredResults.length}</span> results
                  </span>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-slate-600 font-medium">Page {currentPage} of {totalPages}</span>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : activeTab === 'reports' ? (
          <ReportsView data={reportsData} isLoading={isReportsLoading} stats={stats} reportDate={reportDate} setReportDate={setReportDate} />
        ) : (
          <IntakeView setActiveTab={setActiveTab} showToast={showToast} stats={stats} />
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

function CustomDatePicker({ selectedDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate + 'T12:00:00'));
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentMonth(new Date(selectedDate + 'T12:00:00'));
  }, [selectedDate]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const handlePrev = () => {
    if (viewMode === 'days') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    else if (viewMode === 'months') setCurrentMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1));
    else if (viewMode === 'years') setCurrentMonth(new Date(currentMonth.getFullYear() - 12, currentMonth.getMonth(), 1));
  };
  
  const handleNext = () => {
    if (viewMode === 'days') setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    else if (viewMode === 'months') setCurrentMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth(), 1));
    else if (viewMode === 'years') setCurrentMonth(new Date(currentMonth.getFullYear() + 12, currentMonth.getMonth(), 1));
  };

  const handleSelectDate = (day) => {
    const yyyy = currentMonth.getFullYear();
    const mm = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setViewMode('days');
  };

  const handleSelectYear = (year) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setViewMode('months');
  };

  const handleOpenToggle = () => {
    if (!isOpen) {
      setViewMode('days');
      setCurrentMonth(new Date(selectedDate + 'T12:00:00'));
    }
    setIsOpen(!isOpen);
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB');
  
  const selectedD = new Date(selectedDate + 'T12:00:00');
  const startYear = Math.floor(currentMonth.getFullYear() / 12) * 12;
  const yearsList = Array.from({ length: 12 }, (_, i) => startYear + i);

  return (
    <div className="relative flex-1 sm:flex-none" ref={containerRef}>
      <button
        onClick={handleOpenToggle}
        className="flex items-center justify-between w-full sm:w-36 px-3 py-2 bg-transparent hover:bg-slate-200/50 rounded-lg text-sm font-semibold text-slate-700 transition-colors focus:outline-none"
      >
        <span>{displayDate}</span>
        <Calendar className="w-4 h-4 text-indigo-500 ml-2" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 sm:right-auto bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-72 z-50">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            
            {viewMode === 'days' && (
              <button onClick={() => setViewMode('months')} className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </button>
            )}
            
            {viewMode === 'months' && (
              <button onClick={() => setViewMode('years')} className="font-bold text-slate-800 text-sm hover:text-indigo-600 transition-colors">
                {currentMonth.getFullYear()}
              </button>
            )}
            
            {viewMode === 'years' && (
              <div className="font-bold text-slate-800 text-sm">
                {startYear} - {startYear + 11}
              </div>
            )}

            <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 transition-colors">
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>

          {viewMode === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                  <div key={`empty-${index}`} className="p-2"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  const isToday = todayStr === dateStr;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => handleSelectDate(day)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full text-xs mx-auto transition-colors ${
                        isSelected 
                          ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                          : isToday 
                            ? 'bg-indigo-50 text-indigo-700 font-bold' 
                            : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {monthNames.map((month, index) => {
                const isSelected = index === selectedD.getMonth() && currentMonth.getFullYear() === selectedD.getFullYear();
                return (
                  <button
                    key={month}
                    onClick={() => handleSelectMonth(index)}
                    className={`py-2 text-sm rounded-lg transition-colors font-medium ${
                      isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {month.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {yearsList.map(year => {
                const isSelected = year === selectedD.getFullYear();
                return (
                  <button
                    key={year}
                    onClick={() => handleSelectYear(year)}
                    className={`py-2 text-sm rounded-lg transition-colors font-medium ${
                      isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportsView({ data, isLoading, stats, reportDate, setReportDate }) {


  const getDayOffset = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Activity className="w-8 h-8 text-indigo-500 animate-spin" /></div>;
  }

  const personalPickups = data?.daily?.personal || [];
  const proxyPickups = data?.daily?.proxy || [];
  
  // Create a display string for the selected date
  const displayDateStr = new Date(reportDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-8 print:space-y-0">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <StatCard title="Available in Stock" value={stats?.available || 0} icon={<CreditCard className="w-5 h-5 text-emerald-500" />} />
        <StatCard title={`${reportDate === getDayOffset(0) ? "Today's" : "Selected Date"} Personal Pickups`} value={data?.daily?.total_personal || 0} icon={<User className="w-5 h-5 text-indigo-500" />} />
        <StatCard title={`${reportDate === getDayOffset(0) ? "Today's" : "Selected Date"} Proxy Pickups`} value={data?.daily?.total_proxy || 0} icon={<Truck className="w-5 h-5 text-indigo-500" />} />
        <StatCard title={`${reportDate === getDayOffset(0) ? "Today's" : "Selected Date"} Total Collected`} value={data?.daily?.total_collected || 0} icon={<CheckCircle className="w-5 h-5 text-slate-500" />} />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 sm:p-3 rounded-2xl border border-slate-100 shadow-sm print:hidden">
        {/* Date Selector Group */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => setReportDate(getDayOffset(-1))}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${reportDate === getDayOffset(-1) ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Yesterday
          </button>
          <button 
            onClick={() => setReportDate(getDayOffset(0))}
            className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${reportDate === getDayOffset(0) ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
          >
            Today
          </button>
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
          
          <CustomDatePicker selectedDate={reportDate} onChange={setReportDate} />
        </div>

        {/* Action Buttons */}
        <div className="flex w-full sm:w-auto">
          <button onClick={() => window.print()} className="flex-1 sm:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all flex items-center justify-center shadow-sm shadow-indigo-200 text-sm font-medium" title="Print Reports">
            <Printer className="w-4 h-4 mr-2" /> Print Day Sheet
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block text-center pb-6 border-b border-slate-200 mb-8 pt-4">
        <h2 className="text-3xl font-bold text-slate-900">Daily Handover Report</h2>
        <p className="text-lg text-slate-600 mt-2">{displayDateStr}</p>
        <div className="flex justify-center space-x-12 mt-6 text-base text-slate-600">
          <span>Personal Collections: <strong className="text-slate-900">{personalPickups.length}</strong></span>
          <span>Proxy Collections: <strong className="text-slate-900">{proxyPickups.length}</strong></span>
          <span>Total Collected: <strong className="text-slate-900">{personalPickups.length + proxyPickups.length}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 print:block print:space-y-8">
        {/* Personal Collections Ledger Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-indigo-900 flex items-center">
                <User className="w-5 h-5 mr-2" /> Personal Collections
              </h3>
              <p className="text-sm text-indigo-700 mt-1">{displayDateStr}</p>
            </div>
            <span className="bg-white text-indigo-700 font-bold px-3 py-1 rounded-full shadow-sm text-sm border border-indigo-100">
              {personalPickups.length} Total
            </span>
          </div>
          <div className="overflow-x-auto flex-1 min-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Applicant & DL Number</th>
                  <th className="px-6 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personalPickups.length === 0 ? (
                  <tr><td colSpan="2" className="px-6 py-12 text-center text-slate-400">No personal collections today.</td></tr>
                ) : personalPickups.map(row => (
                  <tr key={row.collection_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 uppercase">{row.applicant_name}</div>
                      <div className="text-xs text-slate-400 mt-1">{row.licence_number} • {row.collector_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{new Date(row.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide mr-4">COB TOTAL (PERSONAL):</span>
            <span className="text-lg font-bold text-slate-900">{personalPickups.length}</span>
          </div>
        </div>

        {/* Proxy Collections Ledger Card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-emerald-50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-emerald-900 flex items-center">
                <Truck className="w-5 h-5 mr-2" /> Proxy Collections
              </h3>
              <p className="text-sm text-emerald-700 mt-1">{displayDateStr}</p>
            </div>
            <span className="bg-white text-emerald-700 font-bold px-3 py-1 rounded-full shadow-sm text-sm border border-emerald-100">
              {proxyPickups.length} Total
            </span>
          </div>
          <div className="overflow-x-auto flex-1 min-h-[300px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-semibold">Proxy Info & Applicant</th>
                  <th className="px-6 py-3 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proxyPickups.length === 0 ? (
                  <tr><td colSpan="2" className="px-6 py-12 text-center text-slate-400">No proxy collections today.</td></tr>
                ) : proxyPickups.map(row => (
                  <tr key={row.collection_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{row.collector_name} <span className="text-xs font-normal text-slate-500">({row.verification})</span></div>
                      <div className="text-xs text-slate-600 mt-1">For: {row.applicant_name} ({row.licence_number})</div>
                      <div className="text-xs text-slate-500 mt-0.5">{row.collector_phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap align-top">{new Date(row.collection_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide mr-4">COB TOTAL (PROXY):</span>
            <span className="text-lg font-bold text-slate-900">{proxyPickups.length}</span>
          </div>
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
  const todayDate = new Date().toISOString().split('T')[0];
  const [type, setType] = useState('Personal');
  const [formData, setFormData] = useState({
    collector_name: licence.applicant_name,
    collector_phone: licence.phone_number || '',
    collector_id_num: '',
    relationship: '',
    idVerified: false,
    address: licence.address || '',
    collection_date: todayDate
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
    return formData.collector_name && formData.collector_phone && formData.relationship;
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
          verification: type === 'Personal' && formData.idVerified ? 'Physical ID Checked' : 'Proxy Docs Checked',
          address: formData.address,
          collection_date: formData.collection_date
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">Applicant</p>
                <p className="font-bold text-indigo-900">{licence.applicant_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider">DL Number</p>
                <p className="font-mono text-indigo-900 bg-white px-2 py-0.5 rounded shadow-sm border border-indigo-100">{licence.licence_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{type === 'Personal' ? 'Applicant Phone' : 'Collector Phone'}</label>
                <input 
                  name="collector_phone" value={formData.collector_phone} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Collection Date</label>
                <input 
                  type="date"
                  name="collection_date" value={formData.collection_date} onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>

            {type === 'Personal' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Applicant Address</label>
                <textarea 
                  name="address" value={formData.address} onChange={handleChange} rows="2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none"
                  placeholder="Enter full residential address"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Collector Full Name</label>
                  <input 
                    name="collector_name" value={formData.collector_name} onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">NIN / ID Number (Optional)</label>
                    <input 
                      name="collector_id_num" value={formData.collector_id_num} onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship</label>
                    <input 
                      name="relationship" value={formData.relationship} onChange={handleChange} placeholder="e.g. Brother"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {type === 'Personal' && (
              <label className="flex items-start space-x-3 mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-md cursor-pointer hover:bg-indigo-100 transition-colors">
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

function IntakeView({ setActiveTab, showToast, stats }) {
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

  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, dispatch: null });

  const handleContextMenu = (e, dispatch) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      dispatch
    });
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      window.addEventListener('click', closeMenu);
      return () => window.removeEventListener('click', closeMenu);
    }
  }, [contextMenu.visible]);

  const [activeCard, setActiveCard] = useState(null);
  const [masterData, setMasterData] = useState([]);
  const [masterPagination, setMasterPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isMasterLoading, setIsMasterLoading] = useState(false);

  const fetchMasterData = async (filter, page = 1) => {
    setIsMasterLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/licences/master?filter=${filter}&page=${page}&limit=25`);
      if (res.ok) {
        const data = await res.json();
        setMasterData(data.data);
        setMasterPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsMasterLoading(false);
    }
  };

  const handleCardClick = (cardType) => {
    if (activeCard === cardType) {
      setActiveCard(null);
    } else {
      setActiveCard(cardType);
      fetchMasterData(cardType, 1);
    }
  };

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

  const handleRenameBatch = async (dispatch) => {
    const newName = prompt(`Enter new name for batch ${dispatch.dispatch_code}:`, dispatch.dispatch_code);
    if (!newName || newName.trim() === '' || newName === dispatch.dispatch_code) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/dispatches/${dispatch.dispatch_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatch_code: newName })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to rename');
      }
      showToast('Batch renamed successfully');
      fetchDispatches();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBatch = async (dispatch) => {
    if (!window.confirm(`Are you sure you want to delete batch ${dispatch.dispatch_code}? This will remove all associated licences that were in this batch. This action cannot be undone.`)) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/dispatches/${dispatch.dispatch_id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
      showToast('Batch deleted successfully');
      fetchDispatches();
    } catch (err) {
      alert(err.message);
    }
  };

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
      {/* 3 Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => handleCardClick('all')} 
          className={`bg-white p-5 rounded-xl border cursor-pointer transition-all ${activeCard === 'all' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <PackagePlus className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Ingested Licences</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.total_ingested || 0}</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => handleCardClick('collected')} 
          className={`bg-white p-5 rounded-xl border cursor-pointer transition-all ${activeCard === 'collected' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
              <CheckCircle className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Collected</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.total_collected_all_time || 0}</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => handleCardClick('available')} 
          className={`bg-white p-5 rounded-xl border cursor-pointer transition-all ${activeCard === 'available' ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300'}`}
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <CreditCard className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Available in Stock</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.available || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Master Data Table */}
      {activeCard && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-500" /> 
              {activeCard === 'all' ? 'All Ingested Licences' : activeCard === 'collected' ? 'Collected Licences' : 'Available Licences'}
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {masterPagination.total} Records
            </span>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            {isMasterLoading ? (
              <div className="p-12 flex justify-center items-center">
                <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : masterData.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No records found.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">DL Number</th>
                    <th className="px-6 py-3 font-semibold">Applicant Name</th>
                    <th className="px-6 py-3 font-semibold">Phone Number</th>
                    <th className="px-6 py-3 font-semibold">Pickup Code</th>
                    <th className="px-6 py-3 font-semibold">Batch Source</th>
                    {activeCard === 'collected' && (
                      <>
                        <th className="px-6 py-3 font-semibold">Collector</th>
                        <th className="px-6 py-3 font-semibold">Date Collected</th>
                      </>
                    )}
                    <th className="px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {masterData.map((rec) => (
                    <tr key={rec.licence_id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-indigo-700">{rec.licence_number}</td>
                      <td className="px-6 py-3 text-slate-900">{rec.applicant_name}</td>
                      <td className="px-6 py-3 text-slate-600">{rec.phone_number || '-'}</td>
                      <td className="px-6 py-3 font-medium text-slate-700">{rec.pickup_code || '-'}</td>
                      <td className="px-6 py-3 text-slate-500">{rec.batch_source || '-'}</td>
                      {activeCard === 'collected' && (
                        <>
                          <td className="px-6 py-3 text-slate-900">{rec.collector_name || '-'}</td>
                          <td className="px-6 py-3 text-slate-500">{rec.collection_date ? new Date(rec.collection_date).toLocaleDateString() : '-'}</td>
                        </>
                      )}
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
          
          {/* Pagination Controls */}
          {!isMasterLoading && masterPagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Page <span className="font-medium text-slate-900">{masterPagination.page}</span> of <span className="font-medium text-slate-900">{masterPagination.totalPages}</span>
              </span>
              <div className="flex space-x-2">
                <button 
                  onClick={() => fetchMasterData(activeCard, masterPagination.page - 1)}
                  disabled={masterPagination.page === 1}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button 
                  onClick={() => fetchMasterData(activeCard, masterPagination.page + 1)}
                  disabled={masterPagination.page === masterPagination.totalPages}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                  <tr 
                    key={dispatch.dispatch_id} 
                    className="hover:bg-slate-50 cursor-context-menu"
                    onContextMenu={(e) => handleContextMenu(e, dispatch)}
                    onClick={(e) => handleContextMenu(e, dispatch)}
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchManifestContents(dispatch.dispatch_id, dispatch.dispatch_code);
                        }}
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

      {contextMenu.visible && contextMenu.dispatch && (
        <div 
          className="fixed bg-white border border-slate-200 rounded-lg shadow-xl z-[100] overflow-hidden w-48 transition-all"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 truncate">
              {contextMenu.dispatch.dispatch_code}
            </p>
          </div>
          <button 
            onClick={() => {
              setContextMenu({ ...contextMenu, visible: false });
              handleRenameBatch(contextMenu.dispatch);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center transition-colors"
          >
            <Edit2 className="w-4 h-4 mr-2" /> Rename Batch
          </button>
          <button 
            onClick={() => {
              setContextMenu({ ...contextMenu, visible: false });
              handleDeleteBatch(contextMenu.dispatch);
            }}
            className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete Batch
          </button>
        </div>
      )}
    </div>
  );
}

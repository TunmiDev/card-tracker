import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, Truck, AlertTriangle, CheckCircle, Search, 
  User, Calendar, MapPin, Key, X, Check, FileText
} from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLicence, setSelectedLicence] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut Ctrl+K
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

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/dashboard/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:5000/api/licences/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 1) {
        setSelectedLicence(data[0]);
      } else {
        setSelectedLicence(null);
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRefresh = async (licenceId) => {
    await fetchStats();
    // Refresh the specific licence
    try {
      const res = await fetch(`http://localhost:5000/api/licences/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
      const updated = data.find(l => l.licence_id === licenceId);
      if (updated) setSelectedLicence(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Card Tracker</h1>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-lg ml-8 relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search licence number or pickup code..." 
              className="w-full pl-9 pr-16 py-2 bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded">Ctrl</kbd>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded">K</kbd>
            </div>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-bounce z-50">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">{toastMessage}</span>
          </div>
        )}

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
          <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700">Search Results {searchResults.length > 0 && `(${searchResults.length})`}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isSearching ? (
                <div className="flex justify-center p-8 text-slate-400">Searching...</div>
              ) : searchResults.length === 0 ? (
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
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-full">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedLicence.applicant_name}</h2>
                    <div className="flex items-center text-sm text-slate-500 space-x-4">
                      <span className="flex items-center"><CreditCard className="w-4 h-4 mr-1" /> {selectedLicence.licence_number}</span>
                      <span className="flex items-center"><User className="w-4 h-4 mr-1" /> {selectedLicence.phone_number}</span>
                    </div>
                  </div>
                  <StatusBadge status={selectedLicence.status} size="lg" />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <InfoItem icon={<MapPin className="w-4 h-4 text-slate-400" />} label="Address" value={selectedLicence.address} />
                  <InfoItem icon={<Key className="w-4 h-4 text-slate-400" />} label="Pickup Code" value={selectedLicence.pickup_code} />
                  <InfoItem icon={<Truck className="w-4 h-4 text-slate-400" />} label="Dispatch Code" value={selectedLicence.dispatch_code} />
                  <InfoItem icon={<Calendar className="w-4 h-4 text-slate-400" />} label="Arrival Date" value={new Date(selectedLicence.date_received).toLocaleDateString()} />
                </div>

                {selectedLicence.status === 'Available' && (
                  <div className="mt-auto border-t border-slate-100 pt-6">
                    <button 
                      onClick={() => setShowModal(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition-colors flex justify-center items-center"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Record Collection
                    </button>
                  </div>
                )}
                
                {selectedLicence.status === 'Collected' && (
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mt-6">
                    <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Collection Record</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><span className="text-slate-500">Type:</span> {selectedLicence.collection_type}</p>
                      <p><span className="text-slate-500">Date:</span> {new Date(selectedLicence.collection_date).toLocaleDateString()}</p>
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
                  <div className="bg-rose-50 rounded-lg p-4 border border-rose-200 mt-6">
                    <h4 className="text-xs font-semibold uppercase text-rose-600 mb-2">Missing Record</h4>
                    <p className="text-sm text-rose-800"><span className="font-medium">Reason:</span> {selectedLicence.reason}</p>
                    <p className="text-sm text-rose-800"><span className="font-medium">Reported:</span> {new Date(selectedLicence.date_reported).toLocaleDateString()}</p>
                  </div>
                )}
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
      </main>

      {/* Collection Modal */}
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
          {/* Toggle */}
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

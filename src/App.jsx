import { useEffect, useState, Suspense, lazy } from 'react';
import { Bell, User, ChevronDown, Search, SlidersHorizontal, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info, AlertTriangle, XCircle, CheckCircle2, X } from 'lucide-react';
import useBookingStore from './store/useBookingStore';
import { addDays, format } from 'date-fns';
const CalendarBoard = lazy(() => import('./components/CalendarBoard/CalendarBoard'));
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'));
import './App.css';

const Toast = ({ type, message, onClose }) => {
  const config = {
    info: { Icon: Info, className: 'toast toast-info', title: 'Info' },
    warning: { Icon: AlertTriangle, className: 'toast toast-warning', title: 'Warning' },
    error: { Icon: XCircle, className: 'toast toast-error', title: 'Error' },
    success: { Icon: CheckCircle2, className: 'toast toast-success', title: 'Success' }
  };
  const { Icon, className, title } = config[type] || config.info;

  return (
    <div className={className}>
      <div className="toast-left">
        <Icon size={16} />
      </div>
      <div className="toast-body">
        <div className="toast-title">{title}: {message}</div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>
    </div>
  );
};

function App() {
  const { fetchData, error, currentDate, setDate, setSearchQuery } = useBookingStore();
  const toast = useBookingStore(state => state.toast);
  const clearToast = useBookingStore(state => state.clearToast);
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => clearToast(), 3000);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  return (
    <div className="app-container flex-col h-full w-full">
      <div className="toast-stack">
        {toast ? (
          <Toast type={toast.type} message={toast.message} onClose={clearToast} />
        ) : null}
      </div>
      <header className="top-navbar">
        <div className="logo-text">SPA Booking</div>
        
        <nav className="nav-links">
          <span className="nav-link active">Home</span>
          <span className="nav-link">Therapists</span>
          <span className="nav-link">Sales</span>
          <span className="nav-link">Clients</span>
          <span className="nav-link">Transactions</span>
          <span className="nav-link">Reports</span>
        </nav>

        <div className="nav-icons">
          <Bell size={18} fill="currentColor" />
          <div className="avatar">
            <User size={18} />
          </div>
        </div>
      </header>

      <div className="sub-header">
        <div className="sub-left">
          <div className="sub-location">Liat Towers <ChevronDown size={14} style={{display:'inline', verticalAlign:'middle', marginLeft:'2px'}}/></div>
          <div className="sub-display">
            Display : 15 Min <ChevronDown size={12} />
          </div>
        </div>

        <div className="search-container">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search Sales by phone/name" 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="sub-right">
          <button className="sub-btn">
            Filter <SlidersHorizontal size={14} />
          </button>
          
          <button 
            className="sub-btn" 
            style={{fontWeight: 'bold', minWidth: '70px', justifyContent: 'center'}}
            onClick={() => setDate(new Date())}
          >
            Today
          </button>

          <div className="date-controls">
            <ChevronLeft size={16} className="date-nav-icon" onClick={() => setDate(addDays(currentDate, -1))} />
            <span className="date-text">{format(currentDate, 'E, MMM d')}</span>
            <ChevronRight size={16} className="date-nav-icon" onClick={() => setDate(addDays(currentDate, 1))} />
          </div>

          <button className="sub-btn" style={{padding: '6px 8px'}}>
            <CalendarIcon size={16} />
          </button>
        </div>
      </div>
      
      <main className="app-main relative h-full flex" style={{ height: 'calc(100% - 120px)' }}>
        {error ? (
          <div className="p-4 text-red-500">Error loading data: {error}</div>
        ) : (
          <Suspense fallback={<div className="p-4">Loading calendar…</div>}>
            <CalendarBoard />
          </Suspense>
        )}
      </main>
      
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
    </div>
  );
}

export default App;

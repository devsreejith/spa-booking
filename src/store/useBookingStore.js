import { create } from 'zustand';
import { MockAPI } from '../api/mockBackend';
import { logEvent, logError } from '../utils/logger';
import { format as formatDate, parseISO } from 'date-fns';

const useBookingStore = create(
    (set, get) => ({
  bookingsByDate: {},
  therapists: [],
  isLoading: false,
  error: null,

  toast: null,
  showToast: (toast) => set({ toast: { id: String(Date.now()), ...toast } }),
  clearToast: () => set({ toast: null }),
  
  selectedBooking: null,
  draftBooking: null,
  isSidebarOpen: false,
  sidebarMode: 'view',
  
  currentDate: new Date(),
  searchQuery: '',
  calendarMode: 'daily',
  setCalendarMode: (mode) => set({ calendarMode: mode }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDate: (date) => {
    const newDate = date instanceof Date ? date : new Date(date);
    set({ currentDate: newDate });
    get().fetchData(newDate);
  },
  setDraftBooking: (booking) => set({ draftBooking: booking }),

  _updateIndex: (index, booking, action = 'add') => {
    const dateKey = formatDate(parseISO(booking.startTime), 'yyyy-MM-dd');
    const newIndex = { ...index };
    const dayBookings = [...(newIndex[dateKey] || [])];
    
    if (action === 'add') {
      dayBookings.push(booking);
    } else if (action === 'remove') {
      const idx = dayBookings.findIndex(b => b.id === booking.id);
      if (idx > -1) dayBookings.splice(idx, 1);
    } else if (action === 'update') {
      const idx = dayBookings.findIndex(b => b.id === booking.id);
      if (idx > -1) dayBookings[idx] = booking;
      else dayBookings.push(booking);
    }
    
    newIndex[dateKey] = dayBookings;
    return newIndex;
  },

  refreshIndex: (bookings) => {
    const index = {};
    if (!bookings) return index;
    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const d = formatDate(parseISO(b.startTime), 'yyyy-MM-dd');
      if (!index[d]) index[d] = [];
      index[d].push(b);
    }
    return index;
  },

  fetchData: async (date) => {
    const targetDate = date || get().currentDate;
    const dateKey = formatDate(targetDate instanceof Date ? targetDate : new Date(targetDate), 'yyyy-MM-dd');
    
    if (get().bookingsByDate[dateKey]) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const [bookings, therapists] = await Promise.all([
        MockAPI.getBookings(targetDate),
        get().therapists.length > 0 ? Promise.resolve(get().therapists) : MockAPI.getTherapists()
      ]);
      
      set((state) => ({ 
        therapists, 
        bookingsByDate: {
          ...state.bookingsByDate,
          [dateKey]: bookings
        },
        isLoading: false 
      }));
      logEvent('API.Success', { op: 'fetchData', date: dateKey, count: bookings.length });
    } catch (err) {
      logError('API.FetchData', err);
      set({ error: err.message, isLoading: false });
    }
  },

  createBooking: async (bookingData) => {
    const { _updateIndex } = get();
    set({ isLoading: true, error: null });
    const tempId = 'tmp-' + Date.now();
    const optimistic = { ...bookingData, id: tempId, status: bookingData.status || 'Confirmed' };
    
    set((state) => ({
      bookingsByDate: _updateIndex(state.bookingsByDate, optimistic, 'add')
    }));

    try {
      const newBooking = await MockAPI.createBooking(bookingData);
      set((state) => ({
        bookingsByDate: _updateIndex(
          _updateIndex(state.bookingsByDate, optimistic, 'remove'),
          newBooking,
          'add'
        ),
        isLoading: false,
        isSidebarOpen: false,
        draftBooking: null
      }));
      logEvent('Booking.Created', { id: newBooking.id });
      return newBooking;
    } catch (err) {
      set((state) => ({ 
        bookingsByDate: _updateIndex(state.bookingsByDate, optimistic, 'remove'),
        isLoading: false,
        error: err.message
      }));
      throw err;
    }
  },

  updateBooking: async (id, updates) => {
    const { _updateIndex } = get();
    set({ isLoading: true, error: null });
    
    const dateKey = Object.keys(get().bookingsByDate).find(key => 
      get().bookingsByDate[key].some(b => b.id === id)
    );
    const previous = get().bookingsByDate[dateKey]?.find(b => b.id === id);
    if (!previous) return;

    const updated = { ...previous, ...updates };

    set((state) => {
      let nextIndex = state.bookingsByDate;
      if (previous.startTime.slice(0, 10) !== updated.startTime.slice(0, 10)) {
        nextIndex = _updateIndex(nextIndex, previous, 'remove');
        nextIndex = _updateIndex(nextIndex, updated, 'add');
      } else {
        nextIndex = _updateIndex(nextIndex, updated, 'update');
      }
      return { bookingsByDate: nextIndex };
    });

    try {
      const serverUpdated = await MockAPI.updateBooking(id, updates);
      set((state) => {
        const final = { ...previous, ...serverUpdated };
        logEvent('Booking.Edited', { id: final.id });
        return {
          bookingsByDate: _updateIndex(state.bookingsByDate, final, 'update'),
          isLoading: false,
          selectedBooking: final,
          sidebarMode: 'view'
        };
      });
    } catch (err) {
      logError('Booking.UpdateFailed', err);
      set((state) => ({ 
        bookingsByDate: _updateIndex(state.bookingsByDate, previous, 'update'),
        isLoading: false,
        error: err.message
      }));
      throw err;
    }
  },

  deleteBooking: async (id) => {
    const { _updateIndex } = get();
    set({ isLoading: true, error: null });
    
    let removed = null;
    
    const currentIndex = get().bookingsByDate;
    for (const key in currentIndex) {
      const found = currentIndex[key].find(b => b.id === id);
      if (found) {
        removed = found;
        break;
      }
    }

    if (!removed) {
      set({ isLoading: false, isSidebarOpen: false, selectedBooking: null });
      return;
    }

    set((state) => ({
      bookingsByDate: _updateIndex(state.bookingsByDate, removed, 'remove')
    }));

    try {
      await MockAPI.deleteBooking(id);
      logEvent('Booking.Deleted', { id });
      set({ isLoading: false, isSidebarOpen: false, selectedBooking: null });
    } catch (err) {
      logError('Booking.DeletionFailed', err);
      set((state) => ({ 
        bookingsByDate: _updateIndex(state.bookingsByDate, removed, 'add'),
        isLoading: false,
        error: err.message
      }));
      throw err;
    }
  },

  openSidebar: (mode = 'view', booking = null) => set({ isSidebarOpen: true, sidebarMode: mode, selectedBooking: booking }),
  closeSidebar: () => set({ isSidebarOpen: false, selectedBooking: null, draftBooking: null }),
  })
);

export default useBookingStore;

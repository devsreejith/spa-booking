import { v4 as uuidv4 } from 'uuid';
import { startOfDay, addMinutes, format as formatDate, parseISO } from 'date-fns';

const SEEDED_THERAPISTS = [
  { name: 'Chacha', gender: 'Female' },
  { name: 'James', gender: 'Male' },
  { name: 'Laksa', gender: 'Female' },
  { name: 'Lily', gender: 'Female' },
  { name: 'Mozza', gender: 'Female' },
  { name: 'Nina', gender: 'Female' },
  { name: 'Philip', gender: 'Male' },
  { name: 'Sakura', gender: 'Female' },
  { name: 'Summer', gender: 'Female' },
  { name: 'Yashika', gender: 'Female' },
  { name: 'Glory', gender: 'Female' }
];

export const therapists = [
  ...SEEDED_THERAPISTS.map((t, i) => ({
    id: `t${i + 1}`,
    badgeNumber: i + 1,
    name: t.name,
    gender: t.gender,
    breaks: i % 5 === 0 ? [{ s: 12, e: 16 }] : []
  })),
  ...Array.from({ length: Math.max(0, 200 - SEEDED_THERAPISTS.length) }, (_, i) => {
    const idx = SEEDED_THERAPISTS.length + i;
    return {
      id: `t${idx + 1}`,
      badgeNumber: idx + 1,
      name: `Therapist ${idx + 1}`,
      gender: idx % 2 === 0 ? 'Female' : 'Male',
      breaks: idx % 5 === 0 ? [{ s: 12, e: 16 }] : []
    };
  })
];

const generateMockBookings = (baseDate) => {
  const bookingsForDay = [];
  const clients = [
    'Victoria Baker', 'Yashika Yoo', 'Gerald Tan', 'Phan Tan', 
    'Alice Chen', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
    'Ethan Hunt', 'Fiona Gallagher', 'George Costanza', 'Hannah Abbott'
  ];
  const services = [
    '90 Min Tui Na / Acupressure', '60 Min Slimming Massage', 
    '60 Min Tui Na for Kids', '90 Min Sundari Relaxing Massage',
    '60 Min Deep Tissue', '45 Min Foot Reflexology', '30 Min Express Facial'
  ];

  const isOverlap = (pStart, pEnd, existing) => {
    return existing.some(ext => {
      const extS = new Date(ext.startTime).getTime();
      const extE = new Date(ext.endTime).getTime();
      const pS = pStart.getTime();
      const pE = pEnd.getTime();
      return (pS < extE && pE > extS);
    });
  };

  const maleTherapists = therapists.filter(t => t.gender === 'Male');
  maleTherapists.forEach(t => {
    let attempts = 0;
    while (attempts < 5) {
      const startHour = 9 + (Math.random() * 5);
      const durationH = 1 + (Math.random() * 1);
      const pStart = addMinutes(baseDate, startHour * 60);
      const pEnd = addMinutes(baseDate, Math.min(16, startHour + durationH) * 60);
      
      if (!isOverlap(pStart, pEnd, bookingsForDay.filter(b => b.therapistId === t.id))) {
        bookingsForDay.push({
          id: uuidv4(),
          therapistId: t.id,
          startTime: pStart.toISOString(),
          endTime: pEnd.toISOString(),
          clientName: `${Math.floor(Math.random() * 90000000) + 10000000} ${clients[Math.floor(Math.random() * clients.length)]}`,
          service: services[Math.floor(Math.random() * services.length)],
          status: 'Confirmed',
          isBranded: true,
          isCollisionFree: true
        });
        break;
      }
      attempts++;
    }
  });

  const dailyCount = 2000;
  for (let i = bookingsForDay.length; i < dailyCount; i++) {
      const therapist = therapists[Math.floor(Math.random() * therapists.length)];
      const startHour = 9 + (Math.random() * 6.5); 
      const durationH = 0.25 + (Math.random() * 0.75);
      const pStart = addMinutes(baseDate, startHour * 60);
      const pEnd = addMinutes(baseDate, Math.min(16, startHour + durationH) * 60);

      bookingsForDay.push({
        id: uuidv4(),
        therapistId: therapist.id,
        startTime: pStart.toISOString(),
        endTime: pEnd.toISOString(),
        clientName: `${Math.floor(Math.random() * 90000000) + 10000000} ${clients[Math.floor(Math.random() * clients.length)]}`,
        service: services[Math.floor(Math.random() * services.length)],
        status: 'Confirmed',
        isBranded: Math.random() > 0.3,
        isCollisionFree: true,
        isStressTestData: true
      });
  }
  return bookingsForDay;
};

let dailyCache = {};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const MockAPI = {
  async getBookings(date = new Date()) {
    await delay(300);
    const dateKey = formatDate(date instanceof Date ? date : new Date(date), 'yyyy-MM-dd');
    if (!dailyCache[dateKey]) {
      dailyCache[dateKey] = generateMockBookings(startOfDay(date instanceof Date ? date : new Date(date)));
    }
    return [...dailyCache[dateKey]];
  },

  async getTherapists() {
    await delay(100);
    return [...therapists];
  },

  async createBooking(bookingData) {
    await delay(500);
    if (!bookingData.therapistId || !bookingData.startTime || !bookingData.endTime) {
      throw new Error("Missing required booking fields.");
    }
    const dateKey = formatDate(parseISO(bookingData.startTime), 'yyyy-MM-dd');
    const newBooking = { ...bookingData, id: uuidv4() };
    if (!dailyCache[dateKey]) dailyCache[dateKey] = [];
    dailyCache[dateKey].push(newBooking);
    return newBooking;
  },

  async updateBooking(id, updates) {
    await delay(400);
    for (const key in dailyCache) {
      const index = dailyCache[key].findIndex(b => b.id === id);
      if (index > -1) {
        const updated = { ...dailyCache[key][index], ...updates };
        const newDateKey = formatDate(parseISO(updated.startTime), 'yyyy-MM-dd');
        if (newDateKey !== key) {
           dailyCache[key].splice(index, 1);
           if (!dailyCache[newDateKey]) dailyCache[newDateKey] = [];
           dailyCache[newDateKey].push(updated);
        } else {
           dailyCache[key][index] = updated;
        }
        return updated;
      }
    }
    return { id, ...updates };
  },

  async deleteBooking(id) {
    await delay(400);
    for (const key in dailyCache) {
      const index = dailyCache[key].findIndex(b => b.id === id);
      if (index > -1) {
        dailyCache[key].splice(index, 1);
        break;
      }
    }
    return { success: true };
  }
};

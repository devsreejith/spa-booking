import React, { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import useBookingStore from '../../store/useBookingStore';
import { startOfDay, addMinutes, parseISO, format as formatDate } from 'date-fns';
import { CheckCircle2, DollarSign, FileText, LayoutGrid } from 'lucide-react';
import './CalendarBoard.css';

const ROW_HEIGHT = 40;
const START_HOUR = 9;
const ROWS_COUNT = 7 * 4;

const TimeColumn = ({ scrollRef, currentDate }) => {
  const times = useMemo(() => {
    const arr = [];
    const base = addMinutes(startOfDay(currentDate), START_HOUR * 60);
    for (let i = 0; i < ROWS_COUNT; i++) {
        const time = addMinutes(base, i * 15);
        if (i % 4 === 0) {
          arr.push({
            isHour: true,
            hour: formatDate(time, 'hh.mm'),
            ampm: formatDate(time, 'a'),
            sub: '23F 25M'
          });
        } else {
          arr.push(null);
        }
    }
    return arr;
  }, [currentDate]);

  return (
    <div className="time-column" ref={scrollRef}>
      {times.map((t, idx) => (
        <div key={idx} className="time-cell" style={{ height: ROW_HEIGHT }}>
          {t && (
            <div className="time-cell-content">
              <div>
                <span className="time-hour">{t.hour}</span>
                <span className="time-ampm">{t.ampm}</span>
              </div>
              <div className="time-sub">{t.sub}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CircleBadge = ({ char, color }) => (
  <div className="circle-badge" style={{ backgroundColor: color }}>
    {char}
  </div>
);

const toPlainBooking = (booking) => {
  const { top: _top, height: _height, ...rest } = booking || {};
  return rest;
};

const BookingBlock = React.memo(({ booking, openSidebar, therapist, onDragStart, isDragging }) => {
  const { top, height } = booking;
  const isFemale = therapist.gender === 'Female';
  const isCancelled = booking.status?.includes('Cancelled');
  const colorClass = isCancelled ? 'btn-cancelled' : (isFemale ? 'btn-female' : 'btn-male');

  return (
    <div 
      className={`booking-block ${colorClass}`}
      style={{ top, height, width: '100%', paddingLeft: isCancelled ? '10px' : '6px' }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          openSidebar('view', toPlainBooking(booking));
        }
      }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        onDragStart(e, booking, therapist.id);
      }}
    >
      {isCancelled && <div className="cancelled-indicator" />}
      <div className="booking-svc">{booking.service}</div>
      <div className="booking-phone">{booking.clientName.split(' ')[0]}</div>
      <div className="booking-title">{booking.clientName.split(' ').slice(1).join(' ')}</div>
      
      <div className="booking-footer">
        <div className="circle-badges">
          {booking.isBranded ? (
            <>
              <CircleBadge char="G" color="#10b981" />
              <CircleBadge char="S" color="#f59e0b" />
              <CircleBadge char="B" color="#3b82f6" />
              <CircleBadge char="P" color="#ec4899" />
              <CircleBadge char="T" color="#78350f" />
            </>
          ) : (
            <>
              <CircleBadge char="T" color="#10b981" />
              <CircleBadge char="M" color="#78350f" />
            </>
          )}
        </div>
        <div className="footer-icons">
           <FileText size={12} color="#6b7280" />
           <LayoutGrid size={12} color="#6b7280" />
        </div>
      </div>
    </div>
  );
});

const DraftBlock = ({ booking }) => {
  const start = parseISO(booking.startTime);
  const end = parseISO(booking.endTime);
  const base = addMinutes(startOfDay(start), START_HOUR * 60);
  const startMins = (start.getTime() - base.getTime()) / 60000;
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  
  const top = (startMins / 15) * ROW_HEIGHT;
  const height = (durationMins / 15) * ROW_HEIGHT;

  return (
    <div 
      className="booking-draft"
      style={{ top, height, width: 'calc(100% - 4px)', left: '2px', position: 'absolute' }}
    >
      Booking in <br/> progress
    </div>
  );
};

const TherapistColumn = React.memo(({ index, style, data, isScrolling }) => {
  const { therapists, bookingsByTherapist, openSidebar, currentDate, draftBooking, setDraftBooking, onDragStart, isDragging } = data;
  const therapist = therapists[index];
  const therapistBookings = bookingsByTherapist[therapist.id] || [];
  
  const gridCells = useMemo(() => {
    const cells = [];
    const breaks = therapist.breaks || [];
    for (let i = 0; i < ROWS_COUNT; i++) {
      const isBreak = breaks.some(b => i >= b.s && i < b.e);
      cells.push(<div key={i} className="grid-cell" style={{ height: ROW_HEIGHT, backgroundColor: isBreak ? '#eef0f3' : 'transparent', borderColor: isBreak ? '#eef0f3' : '#f0f0f0' }} />);
    }
    return cells;
  }, [therapist.breaks]);

  const handleGridClick = (e) => {
    if (e.target.closest('.booking-block') || e.target.closest('.booking-draft')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowIdx = Math.floor(y / ROW_HEIGHT);
    const breaks = therapist.breaks || [];
    if (breaks.some(b => rowIdx >= b.s && rowIdx < b.e)) return;
    
    const startOfAppt = addMinutes(addMinutes(startOfDay(currentDate), START_HOUR * 60), rowIdx * 15);
    const endOfAppt = addMinutes(startOfAppt, 60);
    
    const draft = {
      id: 'draft-' + Date.now(),
      therapistId: therapist.id,
      startTime: startOfAppt.toISOString(),
      endTime: endOfAppt.toISOString(),
      isDraft: true
    };
    
    setDraftBooking(draft);
    openSidebar('create', draft);
  };

  const hasDraft = draftBooking && draftBooking.therapistId === therapist.id;

  return (
    <div className="therapist-column-wrapper" style={style}>
      <div className="therapist-header">
         <div className={`therapist-circle ${therapist.gender === 'Female' ? 'bg-pink' : 'bg-blue'}`}>
           {therapist.badgeNumber}
         </div>
         <div className="therapist-info">
           <div className="therapist-name">{therapist.name}</div>
           <div className="therapist-gender">{therapist.gender}</div>
         </div>
      </div>
      <div className="therapist-day" data-therapist-id={therapist.id} style={{ height: ROWS_COUNT * ROW_HEIGHT }} onClick={handleGridClick}>
        <div className="grid-bg">
          {gridCells}
        </div>
        {isScrolling ? (
          <>
            <div className="booking-block booking-skeleton" style={{ top: (index % 6) * ROW_HEIGHT * 2, height: ROW_HEIGHT * 3 }} />
            <div className="booking-block booking-skeleton" style={{ top: ((index + 2) % 8) * ROW_HEIGHT, height: ROW_HEIGHT * 2 }} />
            <div className="booking-block booking-skeleton" style={{ top: ((index + 5) % 10) * ROW_HEIGHT, height: ROW_HEIGHT * 2 }} />
          </>
        ) : (
          therapistBookings.map((b) => (
            <BookingBlock key={b.id} booking={b} openSidebar={openSidebar} therapist={therapist} onDragStart={onDragStart} isDragging={isDragging} />
          ))
        )}
        {hasDraft && <DraftBlock booking={draftBooking} />}
        {data.isToday && data.showCurrentTimeLine && (
          <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', backgroundColor: '#3b82f6', zIndex: 20, pointerEvents: 'none', top: data.currentTimeTop }}>
            {index === 0 && <div style={{ position: 'absolute', left: -6, top: -3, width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />}
          </div>
        )}
      </div>
    </div>
  );
});

const CalendarBoard = () => {
  const currentDate = useBookingStore(state => state.currentDate);
  const bookingsByDate = useBookingStore(state => state.bookingsByDate);
  const therapists = useBookingStore(state => state.therapists);
  const searchQuery = useBookingStore(state => state.searchQuery);
  const openSidebar = useBookingStore(state => state.openSidebar);
  const draftBooking = useBookingStore(state => state.draftBooking);
  const setDraftBooking = useBookingStore(state => state.setDraftBooking);
  const updateBooking = useBookingStore(state => state.updateBooking);

  const [listWidth, setListWidth] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const listRef = useRef(null);
  const timeScrollRef = useRef(null);
  const containerRef = useRef(null);
  const columnsWrapperRef = useRef(null);
  const dragStateRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const outerScrollRef = useRef(null);

  const CustomInnerElement = useMemo(() => forwardRef((props, ref) => <div ref={ref} className="list-inner" {...props} />), []);

  const CustomOuterElement = useMemo(() => forwardRef((props, ref) => {
    const { onScroll, ...rest } = props;
    const handleScroll = (e) => {
      if (onScroll) onScroll(e);
      const event = new CustomEvent('calendar-scroll', { detail: e.target.scrollTop });
      window.dispatchEvent(event);
    };
    return (
      <div 
        ref={(el) => {
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
          outerScrollRef.current = el;
        }} 
        {...rest} 
        onScroll={handleScroll} 
        className="list-outer" 
      />
    );
  }), []);

  useEffect(() => {
    const handleSyncScroll = (e) => {
      if (timeScrollRef.current) {
        timeScrollRef.current.scrollTop = e.detail;
      }
    };
    window.addEventListener('calendar-scroll', handleSyncScroll);
    return () => window.removeEventListener('calendar-scroll', handleSyncScroll);
  }, []);

  const [now, setNow] = useState(new Date());

  const dynamicColWidth = Math.max(listWidth / Math.max(therapists.length, 1), 80);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setListWidth(entry.contentRect.width - 80);
        setListHeight(entry.contentRect.height);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  const dayBookings = useMemo(() => {
    if (!bookingsByDate) return [];
    const dateKey = formatDate(currentDate instanceof Date ? currentDate : new Date(currentDate), 'yyyy-MM-dd');
    return bookingsByDate[dateKey] || [];
  }, [bookingsByDate, currentDate]);

  const bookingsByTherapist = useMemo(() => {
    const map = {};
    dayBookings.forEach(b => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const clientMatch = b.clientName?.toLowerCase().includes(q);
        const serviceMatch = b.service?.toLowerCase().includes(q);
        if (!clientMatch && !serviceMatch) return;
      }

      const start = parseISO(b.startTime);
      const end = parseISO(b.endTime);
      const base = addMinutes(startOfDay(start), START_HOUR * 60);
      const startMins = (start.getTime() - base.getTime()) / 60000;
      const durationMins = (end.getTime() - start.getTime()) / 60000;
      
      const enrichedBooking = {
        ...b,
        top: (startMins / 15) * ROW_HEIGHT,
        height: (durationMins / 15) * ROW_HEIGHT
      };

      if (!map[b.therapistId]) map[b.therapistId] = [];
      map[b.therapistId].push(enrichedBooking);
    });
    return map;
  }, [dayBookings, searchQuery]);

  const onDragMove = useCallback((e) => {
    const st = dragStateRef.current;
    if (!st || !columnsWrapperRef.current) return;
    
    if (!st.hasMoved) {
      const dx = Math.abs(e.clientX - st.baseX);
      const dy = Math.abs(e.clientY - st.baseY);
      if (dx > 3 || dy > 3) {
        st.hasMoved = true;
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
      } else {
        return;
      }
    }

    const wrapperRect = columnsWrapperRef.current.getBoundingClientRect();
    const scrollLeft = outerScrollRef.current ? outerScrollRef.current.scrollLeft : 0;
    const scrollTop = outerScrollRef.current ? outerScrollRef.current.scrollTop : 0;

    const xInWrapper = e.clientX - wrapperRect.left;
    const xAbsolute = xInWrapper + scrollLeft;
    const colIdx = Math.max(0, Math.min(therapists.length - 1, Math.floor(xAbsolute / dynamicColWidth)));
    const targetTherapistId = therapists[colIdx].id;

    const yInWrapper = e.clientY - wrapperRect.top;
    const yAbsolute = yInWrapper + scrollTop;
    const slotIdx = Math.max(0, Math.min(ROWS_COUNT - 1, Math.floor(yAbsolute / ROW_HEIGHT)));
    
    const left = (colIdx * dynamicColWidth) - scrollLeft + 2;
    const top = (slotIdx * ROW_HEIGHT) - scrollTop;
    
    st.targetTherapistId = targetTherapistId;
    st.top = top;
    st.left = left;

    setDragPreview({ 
      id: st.booking.id,
      therapistId: targetTherapistId, 
      top, 
      left,
      height: ((st.end.getTime() - st.start.getTime()) / 60000 / 15) * ROW_HEIGHT,
      width: dynamicColWidth - 4 
    });
  }, [therapists, dynamicColWidth]);

  const onDragEnd = useCallback(async () => {
    const st = dragStateRef.current;
    dragStateRef.current = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    document.body.style.cursor = '';
    
    if (!st || !st.hasMoved || typeof st.top !== 'number') {
      setDragPreview(null);
      setIsDragging(false);
      return;
    }
    
    const top = st.top;
    const scrollTop = outerScrollRef.current ? outerScrollRef.current.scrollTop : 0;
    const slotsFromBaseline = Math.round((top + scrollTop) / ROW_HEIGHT);
    const dayStart = startOfDay(currentDate);
    const newStart = addMinutes(addMinutes(dayStart, START_HOUR * 60), slotsFromBaseline * 15);
    const durationMins = (st.end.getTime() - st.start.getTime()) / 60000;
    const newEnd = addMinutes(newStart, durationMins);
    const targetTherapist = st.targetTherapistId;
    
    try {
      await updateBooking(st.booking.id, {
        therapistId: targetTherapist,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString()
      });
    } finally {
      setDragPreview(null);
      setIsDragging(false);
    }
  }, [currentDate, updateBooking, onDragMove]);

  const onDragStart = useCallback((e, booking, therapistId) => {
    const baseX = e.clientX;
    const baseY = e.clientY;
    const start = parseISO(booking.startTime);
    if (start < new Date()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const end = parseISO(booking.endTime);
    const idx = therapists.findIndex(t => t.id === therapistId);
    const scrollLeft = outerScrollRef.current ? outerScrollRef.current.scrollLeft : 0;
    const scrollTop = outerScrollRef.current ? outerScrollRef.current.scrollTop : 0;
    const left = (idx * dynamicColWidth) - scrollLeft + 2;
    const dayStartWithOffset = addMinutes(startOfDay(start), START_HOUR * 60);
    const top = (((start.getTime() - dayStartWithOffset.getTime()) / 60000 / 15) * ROW_HEIGHT) - scrollTop;

    dragStateRef.current = {
      booking,
      therapistId,
      targetTherapistId: therapistId,
      baseX,
      baseY,
      start,
      end,
      top,
      left,
      hasMoved: false
    };

    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
  }, [therapists, dynamicColWidth, onDragMove, onDragEnd]);

  const itemData = useMemo(() => ({
    therapists,
    bookingsByTherapist,
    openSidebar,
    currentDate,
    draftBooking,
    setDraftBooking,
    onDragStart,
    isDragging,
    isToday: startOfDay(currentDate).getTime() === startOfDay(now).getTime(),
    showCurrentTimeLine: (() => {
      const minutes = now.getHours() * 60 + now.getMinutes();
      return minutes >= START_HOUR * 60 && minutes <= (START_HOUR + 7) * 60;
    })(),
    currentTimeTop: (() => {
      const minutes = now.getHours() * 60 + now.getMinutes();
      return ((minutes - (START_HOUR * 60)) / 15) * ROW_HEIGHT;
    })()
  }), [therapists, bookingsByTherapist, openSidebar, currentDate, draftBooking, setDraftBooking, onDragStart, isDragging, now]);

  return (
    <div className="calendar-board-container" ref={containerRef}>
      <div className="time-column-wrapper">
         <div className="top-left-corner">
           Time
         </div>
         <TimeColumn scrollRef={timeScrollRef} currentDate={currentDate} />
      </div>
      <div className="columns-wrapper" ref={columnsWrapperRef}>
         {listWidth > 100 && (
           <List
             ref={listRef}
             height={listHeight}
             itemCount={therapists.length}
             itemSize={dynamicColWidth}
             layout="horizontal"
             width={listWidth}
             useIsScrolling
             itemData={itemData}
             innerElementType={CustomInnerElement}
             outerElementType={CustomOuterElement}
           >
             {TherapistColumn}
           </List>
         )}
         {dragPreview && (
           <div className="drag-preview" style={{ top: dragPreview.top, left: dragPreview.left, height: dragPreview.height, width: dragPreview.width }}>
             <div className="drag-preview-inner">Move</div>
           </div>
         )}
      </div>
    </div>
  );
};

export default CalendarBoard;

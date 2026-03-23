import React, { useState, useEffect } from 'react';
import { 
  X, Pencil, ChevronDown, CheckSquare, Info, 
  Trash2, PlusCircle, MoreHorizontal 
} from 'lucide-react';
import useBookingStore from '../../store/useBookingStore';
import { format as formatDate, parseISO } from 'date-fns';
import './Sidebar.css';
import CancelModal from './CancelModal';

const Sidebar = () => {
  const isSidebarOpen = useBookingStore(state => state.isSidebarOpen);
  const sidebarMode = useBookingStore(state => state.sidebarMode);
  const selectedBooking = useBookingStore(state => state.selectedBooking);
  const therapists = useBookingStore(state => state.therapists);
  const openSidebar = useBookingStore(state => state.openSidebar);
  const closeSidebar = useBookingStore(state => state.closeSidebar);
  const updateBooking = useBookingStore(state => state.updateBooking);
  const createBooking = useBookingStore(state => state.createBooking);
  const deleteBooking = useBookingStore(state => state.deleteBooking);
  const showToast = useBookingStore(state => state.showToast);

  const [formData, setFormData] = useState({});
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDotsMenu, setShowDotsMenu] = useState(false);

  useEffect(() => {
    if (!selectedBooking && sidebarMode !== 'create') return;

    const base = selectedBooking || {};
    const defaultStartTime = base.startTime || new Date().toISOString();
    const duration = Number(base.duration) || 60;
    const computeEndTime = (startIso, durationMins) => {
      const start = new Date(startIso);
      const endMs = start.getTime() + (Number(durationMins) || 0) * 60_000;
      return new Date(endMs).toISOString();
    };

    setFormData({
      ...base,
      therapistId: base.therapistId || therapists[0]?.id,
      startTime: defaultStartTime,
      duration,
      endTime: base.endTime || computeEndTime(defaultStartTime, duration),
      clientName: base.clientName || '',
      service: base.service || '60 Min Deep Tissue',
      room: base.room || '806 Couples Room',
      status: base.status || 'Confirmed',
      requests: base.requests || '',
      source: base.source || 'By Phone',
      pax: base.pax ?? 1,
      notes: base.notes || 'I have an allergy to eucalyptus, lavender, and citrus oils. Please avoid using them in my body massage.',
      applyMembershipDiscount: base.applyMembershipDiscount ?? false,
      additionalServices: Array.isArray(base.additionalServices) ? base.additionalServices : []
    });
  }, [selectedBooking, therapists, sidebarMode]);

  if (!isSidebarOpen) return null;

  const isCreate = sidebarMode === 'create';
  const isEdit = sidebarMode === 'edit';
  const isEditable = isCreate || isEdit;

  const therapist = therapists.find(t => t.id === formData.therapistId) || therapists[0];
  const therapistName = therapist?.name || 'Unknown';
  const isFemale = therapist?.gender === 'Female';
  const startIso = formData.startTime || selectedBooking?.startTime;
  const displayDate = startIso ? formatDate(parseISO(startIso), 'eee, MMM d') : '...';
  const displayTime = startIso ? formatDate(parseISO(startIso), 'h:mm a') : '...';
  const computeEndTime = (startIsoValue, durationMins) => {
    const start = new Date(startIsoValue);
    const endMs = start.getTime() + (Number(durationMins) || 0) * 60_000;
    return new Date(endMs).toISOString();
  };
  const serviceOptions = [
    '90 Min Tui Na / Acupressure',
    '60 Min Slimming Massage',
    '60 Min Deep Tissue',
    '45 Min Foot Reflexology',
    '30 Min Express Facial',
    '60 Mins Body Therapy',
    '120 Mins Body Therapy'
  ];

  const handleSave = async () => {
    const payload = {
      therapistId: formData.therapistId,
      startTime: formData.startTime,
      endTime: formData.endTime,
      clientName: formData.clientName,
      service: formData.service,
      status: formData.status || 'Confirmed',
      duration: Number(formData.duration) || 60,
      room: formData.room,
      requests: formData.requests,
      source: formData.source,
      pax: Number(formData.pax) || 1,
      notes: formData.notes,
      applyMembershipDiscount: !!formData.applyMembershipDiscount,
      additionalServices: Array.isArray(formData.additionalServices) ? formData.additionalServices : []
    };

    try {
      if (sidebarMode === 'create') {
        await createBooking(payload);
        showToast({ type: 'success', message: 'Booking created successfully' });
      } else {
        await updateBooking(selectedBooking.id, payload);
      }
      closeSidebar();
    } catch (err) {
      showToast({ type: 'error', message: err?.message || 'Something went wrong' });
    }
  };

  const statusText = formData.status || 'Confirmed';
  const statusDotColor = statusText.includes('Cancelled')
    ? '#f97316'
    : statusText.includes('Checked in')
      ? '#ec4899'
      : statusText.includes('Completed')
        ? '#10b981'
        : '#3b82f6';

  const statusActionLabel = statusText.includes('Checked in')
    ? 'Checkout'
    : statusText.includes('Confirmed')
      ? 'Check-in'
      : null;

  const handleStatusAction = async () => {
    if (!selectedBooking) return;
    if (statusText.includes('Confirmed')) {
      await updateBooking(selectedBooking.id, { status: 'Checked in' });
      return;
    }
    if (statusText.includes('Checked in')) {
      await updateBooking(selectedBooking.id, { status: 'Completed' });
    }
  };

  const handleCancelConfirm = async (cancelType) => {
    try {
      if (cancelType === 'Just Delete It') {
        await deleteBooking(selectedBooking.id);
        showToast({ type: 'success', message: 'Booking deleted successfully' });
      } else {
        await updateBooking(selectedBooking.id, {
          status: `Cancelled (${cancelType})`,
          cancelledAt: new Date().toISOString(),
          cancelledType: cancelType
        });
      }
      setShowCancelModal(false);
      closeSidebar();
    } catch (err) {
      showToast({ type: 'error', message: err?.message || 'Something went wrong' });
    }
  };

  const timeOptions = [];
  const baseTime = startIso ? new Date(startIso) : new Date();
  baseTime.setHours(9, 0, 0, 0);
  const endTime = startIso ? new Date(startIso) : new Date();
  endTime.setHours(15, 45, 0, 0);

  while (baseTime <= endTime) {
    timeOptions.push({
      value: formatDate(baseTime, 'HH:mm'),
      label: formatDate(baseTime, 'h:mm a'),
      iso: baseTime.toISOString()
    });
    baseTime.setMinutes(baseTime.getMinutes() + 15);
  }

  const clientDisplay = (formData.clientName || '').trim();
  const clientParts = clientDisplay.split(/\s+/).filter(Boolean);
  const clientPhone = clientParts[0] && /^\d{6,}$/.test(clientParts[0]) ? clientParts[0] : '';
  const clientNameOnly = clientPhone ? clientParts.slice(1).join(' ') : clientDisplay;
  const initials = (clientNameOnly || 'Client')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || 'C';

  return (
    <>
      <div className="sidebar-overlay" onClick={(e) => e.target.className === 'sidebar-overlay' && closeSidebar()}>
        <div className="sidebar-container slide-in">
          <div className="sidebar-header">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-gray-800">
                {isCreate ? 'New Booking' : (isEdit ? 'Update Booking' : (formData.status?.includes('Cancelled') ? formData.status : 'Appointment'))}
              </span>
            </div>
            <div className="flex items-center gap-4">
               {isCreate ? (
                 <button className="action-btn-outline !py-1.5 !px-4 text-[13px]" onClick={closeSidebar}>Cancel</button>
               ) : isEdit ? (
                 <button className="action-btn-outline !py-1.5 !px-4 text-[13px]" onClick={() => openSidebar('view', selectedBooking)}>Cancel</button>
               ) : (
                 <>
                   <div className="relative">
                     <MoreHorizontal size={20} className="cursor-pointer hover:opacity-80" style={{ color: '#4a2e21' }} onClick={() => setShowDotsMenu(!showDotsMenu)} />
                     {showDotsMenu && (
                       <div className="absolute right-0 mt-2 bg-white shadow-xl border rounded-md z-60 overflow-hidden" style={{ right: '0', transform: 'translateX(-20px)' }}>
                          <div className="px-6 py-2-5 text-16 hover:bg-gray-50 cursor-pointer text-gray-700 font-bold text-nowrap" onClick={() => { setShowCancelModal(true); setShowDotsMenu(false); }}>Cancel / Delete</div>
                       </div>
                     )}
                   </div>
                   <button className="btn-icon-clear" onClick={() => openSidebar('edit', selectedBooking)} title="Edit Booking"><Pencil size={20} className="text-gray-700" /></button>
                   <button className="btn-icon-clear" onClick={closeSidebar}><X size={22} className="text-gray-400" /></button>
                 </>
               )}
            </div>
          </div>

          <div className="sidebar-content">
            {!isEditable && (
              <div className="status-bar">
                <div className="status-dot-text">
                  <span className="status-dot" style={{ backgroundColor: statusDotColor }} />
                  <span>{statusText}</span>
                </div>
                {statusActionLabel ? (
                  <button className="action-btn-brown" onClick={handleStatusAction}>
                    {statusActionLabel}
                  </button>
                ) : null}
              </div>
            )}

            <div className="bg-white border-b px-6 py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="label-tiny">Outlet</span>
                  <span className="text-[14px] font-bold text-gray-800">Liat Towers</span>
                </div>
                <div className="flex border-t pt-4">
                  <div className="flex-1 border-r pr-4">
                    <span className="label-tiny">On</span>
                    <span className="text-[14px] font-bold text-gray-800 block mt-1">
                      {displayDate}
                    </span>
                  </div>
                  <div className="flex-1 pl-6">
                    <span className="label-tiny">At</span>
                    <span className="text-[14px] font-bold text-gray-800 block mt-1">
                      {displayTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white px-6 py-6 border-b">
              {isCreate ? (
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="flex items-center gap-2">
                      <input
                        className="sidebar-input"
                        placeholder="Search or create client"
                        value={formData.clientName || ''}
                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      />
                      <PlusCircle size={18} className="text-gray-300" />
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#f0f0f0] group-hover:bg-[#4a2e21] transition-colors" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-gray-500 font-medium">Apply membership discount</div>
                    <input
                      type="checkbox"
                      checked={!!formData.applyMembershipDiscount}
                      onChange={(e) => setFormData({ ...formData, applyMembershipDiscount: e.target.checked })}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-full bg-[#f1a06a] flex items-center justify-center relative shadow-sm shrink-0">
                    <span className="text-white font-bold text-[18px]">{initials}</span>
                    <div className="absolute top-0 right-0 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[10px] text-white">★</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[16px] font-bold text-gray-800 mb-0.5">
                      {clientDisplay || '—'}
                    </div>
                    <div className="text-[12px] text-gray-400 mb-1">Client since December 2023</div>
                    <div className="text-[12px] text-gray-500 font-medium">
                      Phone: <span className="text-gray-800">{clientPhone || '—'}</span>
                    </div>
                  </div>
                  {isEditable && (
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-gray-500 font-medium">Discount</span>
                      <input
                        type="checkbox"
                        checked={!!formData.applyMembershipDiscount}
                        onChange={(e) => setFormData({ ...formData, applyMembershipDiscount: e.target.checked })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white px-6 py-6 border-b">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-2 ${isEdit ? 'group cursor-pointer' : ''}`}>
                    {isEditable ? (
                      <select
                        className="sidebar-select !font-bold"
                        value={formData.service || ''}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                      >
                        {serviceOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <>
                        <span className="text-[15px] font-bold text-gray-800">{formData.service}</span>
                        <ChevronDown size={14} className="text-gray-400" />
                      </>
                    )}
                  </div>
                  {!isCreate && !isEdit && (
                    <Trash2 size={16} className="text-gray-300 hover:text-red-500 cursor-pointer" onClick={() => setShowCancelModal(true)} />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="label-tiny">With:</span>
                    {isEditable ? (
                      <select
                        className="sidebar-select !font-bold w-48"
                        value={formData.therapistId || ''}
                        onChange={(e) => setFormData({ ...formData, therapistId: e.target.value })}
                      >
                        {therapists.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5 font-bold text-[14px]">
                        <div className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px]" style={{ backgroundColor: isFemale ? '#ec4899' : '#3b82f6' }}>{therapistName.charAt(0)}</div>
                        {therapistName}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-gray-800 fill-gray-800" />
                    <span className="text-[13px] font-medium text-gray-600">Requested Therapist</span>
                    <Info size={14} className="text-gray-400" />
                  </div>
                </div>

                <div className="flex gap-10">
                  <div className="flex items-center gap-2">
                    <span className="label-tiny">For:</span>
                    {isEditable ? (
                      <select
                        className="sidebar-select !font-bold"
                        value={Number(formData.duration) || 60}
                        onChange={(e) => {
                          const nextDuration = Number(e.target.value);
                          const nextEnd = formData.startTime ? computeEndTime(formData.startTime, nextDuration) : formData.endTime;
                          setFormData({ ...formData, duration: nextDuration, endTime: nextEnd });
                        }}
                      >
                        {[30, 45, 60, 75, 90, 105, 120].map(m => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-bold text-[14px] text-gray-800">{formData.duration} min</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="label-tiny">At:</span>
                    <div className={`flex items-center gap-1 font-bold text-[14px] text-gray-800 ${isEdit ? 'group cursor-pointer' : ''}`}>
                       {isEditable ? (
                         <select
                           className="sidebar-select !font-bold"
                           value={formData.startTime || ''}
                           onChange={(e) => {
                             const nextStart = e.target.value;
                             const nextEnd = computeEndTime(nextStart, formData.duration);
                             setFormData({ ...formData, startTime: nextStart, endTime: nextEnd });
                           }}
                         >
                           {timeOptions.map(opt => (
                             <option key={opt.iso} value={opt.iso}>{opt.label}</option>
                           ))}
                         </select>
                       ) : (
                         <>
                           {formData.startTime ? formatDate(parseISO(formData.startTime), 'h:mm a') : '...'}
                           <ChevronDown size={12} className="text-gray-400" />
                         </>
                       )}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[13px] text-gray-400 italic mb-3">Adjusted Commission (S$) <strong className="text-gray-800 font-bold">$ 52.00</strong></div>
                  
                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="label-tiny">Using:</span>
                      <div className="flex items-center gap-2 font-bold text-[14px] text-gray-800">
                        {isEditable ? (
                          <input
                            className="sidebar-input"
                            value={formData.room || ''}
                            onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                          />
                        ) : (
                          <>
                            {formData.room}
                            <Pencil size={12} className="text-gray-400 cursor-pointer" />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="label-tiny">Select request(s)</span>
                      <div className="flex items-center gap-2 font-bold text-[14px] text-gray-800">
                        {isEditable ? (
                          <input
                            className="sidebar-input"
                            value={formData.requests || ''}
                            onChange={(e) => setFormData({ ...formData, requests: e.target.value })}
                            placeholder="Soft, China"
                          />
                        ) : (
                          <>
                            {formData.requests || '—'}
                            <Pencil size={12} className="text-gray-400 cursor-pointer" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {!isEditable && Array.isArray(formData.additionalServices) && formData.additionalServices.length > 0 && (
              <div className="bg-white px-6 py-6 border-b">
                <div className="space-y-6">
                  {formData.additionalServices.map((svc, idx) => {
                    const svcTherapist = therapists.find(t => t.id === svc.therapistId);
                    const svcTherapistName = svcTherapist?.name || '—';
                    const svcStart = svc.startTime ? formatDate(parseISO(svc.startTime), 'h:mm a') : '—';
                    return (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[15px] font-bold text-gray-800">{svc.service}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="label-tiny">With:</span>
                            <span className="font-bold text-[14px] text-gray-800">{svcTherapistName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="label-tiny">At:</span>
                            <span className="font-bold text-[14px] text-gray-800">{svcStart}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="label-tiny">For:</span>
                          <span className="font-bold text-[14px] text-gray-800">{Number(svc.duration) || 60} min</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isEditable && (
              <div className="px-6 py-4 border-b bg-white flex items-center justify-between gap-2 text-[14px] text-gray-400 font-medium">
                <div className="flex items-center gap-2">
                  <PlusCircle size={18} className="text-gray-300" />
                  <span>Add service</span>
                </div>
                <button
                  className="action-btn-outline !py-1.5 !px-4 text-[13px]"
                  onClick={() => {
                    const next = Array.isArray(formData.additionalServices) ? [...formData.additionalServices] : [];
                    const startTimeForNext = formData.endTime || formData.startTime;
                    const duration = 60;
                    next.push({
                      service: serviceOptions[0],
                      duration,
                      therapistId: formData.therapistId,
                      startTime: startTimeForNext,
                      endTime: startTimeForNext ? computeEndTime(startTimeForNext, duration) : undefined
                    });
                    setFormData({ ...formData, additionalServices: next });
                  }}
                >
                  Add
                </button>
              </div>
            )}

            {isEditable && Array.isArray(formData.additionalServices) && formData.additionalServices.length > 0 && (
              <div className="bg-white px-6 py-4 border-b">
                <div className="space-y-4">
                  {formData.additionalServices.map((svc, idx) => (
                    <div key={idx} className="flex gap-4 items-center">
                      <select
                        className="sidebar-select !font-bold flex-1"
                        value={svc.service}
                        onChange={(e) => {
                          const next = [...formData.additionalServices];
                          next[idx] = { ...next[idx], service: e.target.value };
                          setFormData({ ...formData, additionalServices: next });
                        }}
                      >
                        {serviceOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        className="sidebar-select !font-bold w-48"
                        value={svc.therapistId || formData.therapistId || ''}
                        onChange={(e) => {
                          const next = [...formData.additionalServices];
                          next[idx] = { ...next[idx], therapistId: e.target.value };
                          setFormData({ ...formData, additionalServices: next });
                        }}
                      >
                        {therapists.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <select
                        className="sidebar-select !font-bold"
                        value={Number(svc.duration) || 60}
                        onChange={(e) => {
                          const next = [...formData.additionalServices];
                          const nextDuration = Number(e.target.value);
                          const nextEnd = svc.startTime ? computeEndTime(svc.startTime, nextDuration) : svc.endTime;
                          next[idx] = { ...next[idx], duration: nextDuration, endTime: nextEnd };
                          setFormData({ ...formData, additionalServices: next });
                        }}
                      >
                        {[30, 45, 60, 75, 90, 105, 120].map(m => (
                          <option key={m} value={m}>{m} min</option>
                        ))}
                      </select>
                      <select
                        className="sidebar-select !font-bold"
                        value={svc.startTime || formData.endTime || formData.startTime || ''}
                        onChange={(e) => {
                          const nextStart = e.target.value;
                          const nextEnd = computeEndTime(nextStart, svc.duration);
                          const next = [...formData.additionalServices];
                          next[idx] = { ...next[idx], startTime: nextStart, endTime: nextEnd };
                          setFormData({ ...formData, additionalServices: next });
                        }}
                      >
                        {timeOptions.map(opt => (
                          <option key={opt.iso} value={opt.iso}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        className="btn-icon-clear"
                        onClick={() => {
                          const next = [...formData.additionalServices];
                          next.splice(idx, 1);
                          setFormData({ ...formData, additionalServices: next });
                        }}
                        title="Remove service"
                      >
                        <Trash2 size={16} className="text-gray-300 hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isEditable && (
              <div className="px-6 py-6 border-b bg-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="label-tiny">Add pax</span>
                  <input
                    className="sidebar-input"
                    style={{ width: 120, textAlign: 'right' }}
                    type="number"
                    min={1}
                    value={Number(formData.pax) || 1}
                    onChange={(e) => setFormData({ ...formData, pax: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {isEditable && (
              <div className="px-6 py-6 border-b bg-white">
                 <div className="relative group">
                    <select className="sidebar-select !font-bold pr-10" value={formData.source || 'By Phone'} onChange={(e) => setFormData({...formData, source: e.target.value})}>
                      <option>By Phone</option>
                      <option>Online Booking</option>
                      <option>Walk-in</option>
                      <option>WhatsApp</option>
                    </select>
                    <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#f0f0f0] group-hover:bg-[#4a2e21] transition-colors" />
                 </div>
              </div>
            )}

            {isEditable && (
              <div className="bg-white px-6 py-6 border-b">
                <div className="relative group">
                  <textarea
                    className="sidebar-input"
                    style={{ resize: 'vertical', minHeight: 72 }}
                    placeholder="Notes (Optional)"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                  <div className="absolute bottom-0 left-0 w-full h-[1.5px] bg-[#f0f0f0] group-hover:bg-[#4a2e21] transition-colors" />
                </div>
              </div>
            )}

            {!!formData.notes && (
              <div className="note-box shadow-sm mb-6">
                 {formData.notes}
              </div>
            )}

            {!isEditable && selectedBooking && !selectedBooking.isDraft && (
              <div className="audit-section px-6 py-6">
                 <h3 className="text-[14px] font-bold text-gray-800 mb-4 border-b pb-2">Booking Details</h3>
                 <div className="audit-row"><span className="audit-label">Booked on:</span><span className="audit-value">{displayDate} at {displayTime}</span></div>
                 <div className="audit-row"><span className="audit-label">Booked by:</span><span className="audit-value">{clientNameOnly || '—'}</span></div>
                 <div className="audit-row"><span className="audit-label">Updated on:</span><span className="audit-value">{displayDate} at {displayTime}</span></div>
                 <div className="audit-row"><span className="audit-label">Updated by:</span><span className="audit-value">—</span></div>
                 <div className="audit-row"><span className="audit-label">Source:</span><span className="audit-value">{formData.source || '—'}</span></div>
                 {String(formData.status || '').includes('Cancelled') && (
                   <>
                     <div className="audit-row">
                       <span className="audit-label">Cancelled:</span>
                       <span className="audit-value">
                         {formData.cancelledAt ? formatDate(parseISO(formData.cancelledAt), 'eee, MMM d h:mm a') : '—'}
                       </span>
                     </div>
                     <div className="audit-row">
                       <span className="audit-label">Type:</span>
                       <span className="audit-value">
                         {formData.cancelledType || (String(formData.status).match(/\((.*)\)/)?.[1] ?? '—')}
                       </span>
                     </div>
                   </>
                 )}
               </div>
            )}
          </div>

          {isEditable && (
            <div className="sidebar-footer">
               <button onClick={handleSave}>{isCreate ? 'Create Booking' : 'Save Changes'}</button>
            </div>
          )}
        </div>
      </div>

      {showCancelModal && (
        <CancelModal onCancel={() => setShowCancelModal(false)} onConfirm={handleCancelConfirm} />
      )}
    </>
  );
};

export default Sidebar;

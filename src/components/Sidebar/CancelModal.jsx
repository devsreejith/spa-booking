import React from 'react';

const CancelModal = ({ onCancel, onConfirm }) => {
  const [cancelType, setCancelType] = React.useState('Normal Cancellation');

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black-60 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-500 overflow-hidden border border-gray-200">
        <div className="h-1-5 w-full bg-gray-100 flex">
          <div className="h-full bg-green-500" style={{ width: '15%' }} />
        </div>

        <div className="p-8">
          <h2 className="text-22 font-bold text-gray-800 mb-2">Cancel / Delete Booking</h2>
          <p className="text-14 text-gray-500 mb-8">Please select the cancellation type.</p>
          
          <div className="space-y-6">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0" style={{ borderColor: cancelType === 'Normal Cancellation' ? '#f97316' : '#e5e7eb' }}>
                {cancelType === 'Normal Cancellation' && <div className="w-2-5 h-2-5 rounded-full" style={{ backgroundColor: '#f97316' }} />}
              </div>
              <input 
                type="radio" 
                className="hidden" 
                name="cancelType" 
                checked={cancelType === 'Normal Cancellation'} 
                onChange={() => setCancelType('Normal Cancellation')} 
              />
              <span className={`text-15 font-bold transition-colors ${cancelType === 'Normal Cancellation' ? 'text-gray-800' : 'text-gray-400'}`}>Normal Cancellation</span>
            </label>

            <label className="flex items-center gap-4 cursor-not-allowed opacity-40">
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#e5e7eb' }} />
              <input type="radio" className="hidden" disabled />
              <span className="text-15 font-bold text-gray-400">No Show</span>
            </label>

            <div className="pt-2">
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center transition-colors shrink-0" style={{ borderColor: cancelType === 'Just Delete It' ? '#f97316' : '#e5e7eb' }}>
                   {cancelType === 'Just Delete It' && <div className="w-2-5 h-2-5 rounded-full" style={{ backgroundColor: '#f97316' }} />}
                </div>
                <input 
                  type="radio" 
                  className="hidden" 
                  name="cancelType" 
                  checked={cancelType === 'Just Delete It'} 
                  onChange={() => setCancelType('Just Delete It')} 
                />
                <div className="flex flex-col">
                  <span className={`text-15 font-bold transition-colors ${cancelType === 'Just Delete It' ? 'text-gray-800' : 'text-gray-400'}`}>Just Delete It</span>
                  <p className="text-13 text-gray-400 mt-1 leading-relaxed">
                    Bookings with a deposit cannot be deleted. Please cancel instead to retain a proper record.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-12">
            <button 
              className="flex-1 py-3-5 border rounded-md text-15 font-bold bg-white hover:bg-orange-50 transition-colors"
              style={{ borderColor: '#f97316', color: '#f97316' }}
              onClick={onCancel}
            >
              Cancel
            </button>
            <button 
              className="flex-1 py-3-5 bg-[#4a2e21] text-white rounded-md text-15 font-bold hover:bg-[#3d251a] transition-all"
              style={{ backgroundColor: '#4a2e21' }}
              onClick={() => onConfirm(cancelType)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelModal;

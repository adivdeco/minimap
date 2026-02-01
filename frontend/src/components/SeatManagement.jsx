import React, { useState, useEffect } from 'react';
import { RefreshCw, User, Armchair, AlertCircle, Wrench, Smartphone, LayoutGrid, Map } from 'lucide-react';
import { getLibrarySeats, updateSeatStatus } from '../api/seat';
import { toast } from 'react-toastify';
import SeatCanvas from './SeatCanvas';

const SeatManagement = ({ libraryId, userRole, isOwner }) => { // Assuming props pass permissions
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('canvas'); // 'grid' or 'canvas'
  const [isEditMode, setIsEditMode] = useState(false); // Lifted state to control refresh

  const fetchSeats = async () => {
    // Only set loading on initial load to avoid flickering on refresh
    if (seats.length === 0) setLoading(true);
    try {
      const data = await getLibrarySeats(libraryId);
      setSeats(data);
    } catch (err) {
      console.error("Failed to fetch seats", err);
      toast.error("Failed to load seat map");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeats();
    // Pause auto-refresh if in edit mode to prevent layout reset
    if (isEditMode) return;

    const interval = setInterval(fetchSeats, 30000);
    return () => clearInterval(interval);
  }, [libraryId, refreshTrigger, isEditMode]);

  const handleSeatUpdate = async (seatId, newStatus) => {
    try {
      await updateSeatStatus(seatId, newStatus);
      toast.success(`Seat marked as ${newStatus}`);
      setRefreshTrigger(prev => prev + 1); // Trigger refresh
      setSelectedSeat(null); // Close modal
    } catch (error) {
      toast.error("Failed to update seat status");
    }
  };

  const stats = {
    total: seats.length,
    occupied: seats.filter(s => s.status === 'Occupied').length,
    available: seats.filter(s => s.status === 'Available').length,
    maintenance: seats.filter(s => s.status === 'Maintenance').length,
  };

  const categories = ['All', ...new Set(seats.map(s => s.category))];
  const displayedSeats = filter === 'All'
    ? seats
    : seats.filter(s => s.category === filter);

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">

      {/* --- HEADER & STATS --- */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Live Seat Monitor</h1>

          <div className="flex gap-3">
            {/* View Toggles */}
            <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
              <button
                onClick={() => setViewMode('canvas')}
                className={`p-2 rounded-md transition ${viewMode === 'canvas' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Layout View"
                disabled={isEditMode} // Disable toggle while editing
              >
                <Map size={20} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
                disabled={isEditMode} // Disable toggle while editing
              >
                <LayoutGrid size={20} />
              </button>
            </div>

            <button
              onClick={fetchSeats}
              disabled={isEditMode}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition ${isEditMode ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <RefreshCw size={18} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Capacity" value={stats.total} color="bg-gray-100" />
          <StatCard label="Available" value={stats.available} color="bg-green-100 text-green-800" />
          <StatCard label="Occupied" value={stats.occupied} color="bg-red-100 text-red-800" />
          <StatCard label="Maintenance" value={stats.maintenance} color="bg-yellow-100 text-yellow-800" />
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading seat map...</div>
      ) : viewMode === 'canvas' ? (
        /* CANVAS VIEW */
        <SeatCanvas
          seats={displayedSeats}
          libraryId={libraryId}
          onUpdate={setSelectedSeat}
          isOwner={isOwner || true}
          refreshSeats={fetchSeats}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
        />
      ) : (
        /* GRID VIEW */
        <>
          {/* --- FILTER TABS --- */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 pb-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${filter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {displayedSeats.map((seat) => (
              <div
                key={seat._id}
                onClick={() => setSelectedSeat(seat)}
                className={`
                    relative p-2 rounded-xl border-2 cursor-pointer transition transform hover:scale-105
                    flex flex-col items-center justify-center h-20 shadow-sm
                    ${getStatusColor(seat.status)}
                `}
              >
                <span className="text-[10px] font-bold uppercase opacity-70 mb-0.5 truncate w-full text-center">{seat.category}</span>
                <span className="text-lg font-bold">{seat.seatNumber}</span>

                {seat.status === 'Occupied' && (
                  <div className="absolute top-1 right-1">
                    <User size={12} className="text-red-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* --- MODAL: SEAT DETAILS --- */}
      {selectedSeat && (
        <SeatDetailModal
          seat={selectedSeat}
          onClose={() => setSelectedSeat(null)}
          onUpdate={handleSeatUpdate}
        />
      )}
    </div>
  );
};

// --- HELPER COMPONENTS ---

const StatCard = ({ label, value, color }) => (
  <div className={`p-4 rounded-xl ${color} flex flex-col items-center justify-center`}>
    <span className="text-3xl font-bold">{value}</span>
    <span className="text-xs uppercase tracking-wide opacity-70 text-center">{label}</span>
  </div>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'Available': return 'bg-white border-green-500 text-green-700 hover:bg-green-50';
    case 'Occupied': return 'bg-red-50 border-red-500 text-red-700';
    case 'Reserved': return 'bg-blue-50 border-blue-500 text-blue-700';
    case 'Maintenance': return 'bg-gray-200 border-gray-400 text-gray-500 opacity-60';
    default: return 'bg-white border-gray-200';
  }
};

const SeatDetailModal = ({ seat, onClose, onUpdate }) => {
  const occupant = seat.currentOccupant || { name: "Unknown", email: "N/A" };
  const isOccupied = seat.status === 'Occupied';
  const isMaintenance = seat.status === 'Maintenance';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className={`p-6 text-center ${isOccupied ? 'bg-red-600' : isMaintenance ? 'bg-amber-500' : 'bg-green-600'}`}>
          <Armchair className="text-white mx-auto mb-2" size={48} />
          <h2 className="text-2xl font-bold text-white">Seat {seat.seatNumber}</h2>
          <span className="text-white/90 font-medium text-sm uppercase tracking-wider">{seat.status}</span>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold">Category</label>
              <p className="text-gray-900 font-medium">{seat.category}</p>
            </div>

            {isOccupied ? (
              <>
                <div className="border-t pt-4">
                  <label className="text-xs text-gray-500 uppercase font-bold mb-3 block">Occupied By</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {occupant.avatar ? (
                      <img src={occupant.avatar} alt={occupant.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                        {occupant.name ? occupant.name[0] : 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{occupant.name}</p>
                      <p className="text-xs text-gray-500 truncate">{occupant.email}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                  <span>In: {seat.occupiedSince ? new Date(seat.occupiedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                  <span>Out: {seat.expectedEndTime ? new Date(seat.expectedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm font-medium">Ready to be assigned via QR Scan</span>
              </div>
            )}

            {/* Maintenance Toggle */}
            {!isOccupied && (
              <button
                onClick={() => onUpdate(seat._id, isMaintenance ? 'Available' : 'Maintenance')}
                className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${isMaintenance ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <Wrench size={18} />
                {isMaintenance ? 'Mark as Available' : 'Mark for Maintenance'}
              </button>
            )}

            {/* Force Vacate (Only if occupied - Admin/Owner override) */}
            {isOccupied && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to force vacate this seat?')) {
                    onUpdate(seat._id, 'Available');
                  }
                }}
                className="w-full py-2 px-4 rounded-xl font-medium text-red-600 hover:bg-red-50 text-sm border border-transparent hover:border-red-100 transition-colors"
              >
                Force Vacate Seat
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-400 hover:text-gray-600 py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatManagement;
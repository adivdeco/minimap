import React, { useState, useEffect } from 'react';
import { RefreshCw, User, Armchair, AlertCircle, Wrench, Smartphone, LayoutGrid, Map } from 'lucide-react';
import { getLibrarySeats, updateSeatStatus, reserveSeat, cancelReservation } from '../api/seat';
import axiosClient from '../api/axiosClient';
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

  const [users, setUsers] = useState([]);

  const fetchSeats = async () => {
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

  const fetchUsers = async () => {
    if (!libraryId) return;
    try {
      const response = await axiosClient.get(`/library/${libraryId}/users?limit=1000`);
      // Adapt based on backend response structure (might be response.data or response.data.users)
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      console.error("Failed to fetch library users for reservation logic", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [libraryId]);

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

  const handleSeatReservation = async (seatId, reservationData) => {
    try {
      await reserveSeat(seatId, reservationData);
      toast.success("Seat reserved successfully");
      setRefreshTrigger(prev => prev + 1);
      setSelectedSeat(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reserve seat");
    }
  };

  const handleCancelReservation = async (seatId) => {
    try {
      await cancelReservation(seatId);
      toast.success("Reservation cancelled");
      setRefreshTrigger(prev => prev + 1);
      setSelectedSeat(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel reservation");
    }
  };

  const stats = {
    total: seats.length,
    occupied: seats.filter(s => s.status === 'Occupied').length,
    available: seats.filter(s => s.status === 'Available').length,
    maintenance: seats.filter(s => s.status === 'Maintenance').length,
    reserved: seats.filter(s => s.status === 'Reserved').length,
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
          <StatCard label="Reserved" value={stats.reserved} color="bg-blue-100 text-blue-800" />
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
          onReserve={handleSeatReservation}
          onCancelReservation={handleCancelReservation}
          users={users}
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

const SeatDetailModal = ({ seat, onClose, onUpdate, onReserve, onCancelReservation, users }) => {
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    userId: '',
    reservationType: 'FullDay',
    startTime: '09:00',
    endTime: '17:00'
  });

  const occupant = seat.currentOccupant || { name: "Unknown", email: "N/A" };
  const reserver = seat.reservedBy || { name: "Unknown", email: "N/A" };
  const isOccupied = seat.status === 'Occupied';
  const isMaintenance = seat.status === 'Maintenance';
  const isReserved = seat.status === 'Reserved';

  const handleReserveSubmit = (e) => {
    e.preventDefault();
    onReserve(seat._id, reservationForm);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className={`p-6 text-center ${isOccupied ? 'bg-red-600' : isMaintenance ? 'bg-amber-500' : isReserved ? 'bg-blue-600' : 'bg-green-600'}`}>
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
            ) : isReserved ? (
              <div className="border-t pt-4">
                <label className="text-xs text-blue-500 uppercase font-bold mb-3 block">Reserved For</label>
                <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  {reserver.avatar ? (
                    <img src={reserver.avatar} alt={reserver.name} className="w-10 h-10 rounded-full object-cover border border-blue-200" />
                  ) : (
                    <div className="w-10 h-10 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold">
                      {reserver.name ? reserver.name[0] : 'U'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-gray-900 truncate">{reserver.name}</p>
                    <p className="text-xs text-blue-600 mt-0.5">{seat.reservationType} (Daily)</p>
                  </div>
                </div>
                {seat.reservationType === 'TimeSlot' && seat.reservedTimeSlots?.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>Slots:</strong> {seat.reservedTimeSlots.map(s => `${s.startTime}-${s.endTime}`).join(', ')}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this reservation?')) {
                      onCancelReservation(seat._id);
                    }
                  }}
                  className="w-full mt-4 py-2 px-4 rounded-xl font-medium text-red-600 hover:bg-red-50 text-sm border border-transparent hover:border-red-100 transition-colors"
                >
                  Cancel Reservation
                </button>
              </div>
            ) : !isOccupied && !showReserveForm ? (
              <div className="flex flex-col gap-3 border-t pt-4">
                <div className="flex items-center gap-3 text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 text-sm font-medium">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>Ready to be assigned via QR Scan</span>
                </div>
                <button
                  onClick={() => setShowReserveForm(true)}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm border border-blue-200"
                >
                  Reserve this Seat
                </button>
              </div>
            ) : null}

            {showReserveForm && !isReserved && !isOccupied && (
              <form onSubmit={handleReserveSubmit} className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Select Member</label>
                  <select
                    required
                    value={reservationForm.userId}
                    onChange={(e) => setReservationForm({ ...reservationForm, userId: e.target.value })}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Choose Member --</option>
                    {users.map(u => (
                      <option key={u.userId || u._id} value={u.userId || u._id}>{u.userName || u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Type (Recurs Daily)</label>
                    <select
                      value={reservationForm.reservationType}
                      onChange={(e) => setReservationForm({ ...reservationForm, reservationType: e.target.value })}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                    >
                      <option value="FullDay">Full Day</option>
                      <option value="TimeSlot">Time Slot</option>
                    </select>
                  </div>
                </div>

                {reservationForm.reservationType === 'TimeSlot' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Start Time</label>
                      <input
                        type="time"
                        required
                        value={reservationForm.startTime}
                        onChange={(e) => setReservationForm({ ...reservationForm, startTime: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">End Time</label>
                      <input
                        type="time"
                        required
                        value={reservationForm.endTime}
                        onChange={(e) => setReservationForm({ ...reservationForm, endTime: e.target.value })}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReserveForm(false)}
                    className="flex-1 py-2 text-sm text-gray-500 font-medium hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-2 text-sm text-white font-bold bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    Confirm Reservation
                  </button>
                </div>
              </form>
            )}

            {/* Maintenance Toggle */}
            {!isOccupied && !isReserved && !showReserveForm && (
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
import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, User, Armchair, AlertCircle, Wrench, Clock, LayoutGrid, Map, ChevronDown, Trash2, Plus, X } from 'lucide-react';
import { getLibrarySeats, updateSeatStatus, reserveSeat, cancelReservation } from '../api/seat';
import axiosClient from '../api/axiosClient';
import { toast } from 'react-toastify';
import SeatCanvas from './SeatCanvas';

// --- HELPER: Check if a seat has a reservation overlapping a given time range ---
const hasReservationInRange = (seat, startTime, endTime) => {
  if (!seat.reservations || seat.reservations.length === 0) return false;
  return seat.reservations.some(r =>
    r.startTime < endTime && r.endTime > startTime
  );
};

// --- HELPER: Get the reservations overlapping a given time range ---
const getReservationsInRange = (seat, startTime, endTime) => {
  if (!seat.reservations || seat.reservations.length === 0) return [];
  return seat.reservations.filter(r =>
    r.startTime < endTime && r.endTime > startTime
  );
};

// --- HELPER: Compute seat display status based on selected time range ---
const computeDisplayStatus = (seat, filterStart, filterEnd) => {
  if (seat.status === 'Maintenance') return 'Maintenance';
  if (seat.status === 'Occupied') return 'Occupied';
  if (filterStart && filterEnd && hasReservationInRange(seat, filterStart, filterEnd)) {
    return 'Reserved';
  }
  if (seat.reservations && seat.reservations.length > 0) {
    // Has reservations but not in the current filter range
    if (!filterStart || !filterEnd) return 'Reserved';
    return 'Available';
  }
  return 'Available';
};

const SeatManagement = ({ libraryId, userRole, isOwner }) => {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('canvas');
  const [isEditMode, setIsEditMode] = useState(false);

  const [users, setUsers] = useState([]);

  // --- Time Range Filter ---
  const now = new Date();
  const currentHHMM = now.toTimeString().substring(0, 5);
  const [filterStartTime, setFilterStartTime] = useState(currentHHMM);
  const [filterEndTime, setFilterEndTime] = useState('22:00');
  const [showTimeFilter, setShowTimeFilter] = useState(false);

  const fetchSeats = async () => {
    if (seats.length === 0) setLoading(true);
    try {
      const data = await getLibrarySeats(libraryId);
      setSeats(data);
    } catch (err) {
      toast.error("Failed to load seat map");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!libraryId) return;
    try {
      const response = await axiosClient.get(`/library/${libraryId}/users?limit=1000`);
      setUsers(response.data.users || response.data || []);
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [libraryId]);

  useEffect(() => {
    fetchSeats();
    if (isEditMode) return;
    const interval = setInterval(fetchSeats, 30000);
    return () => clearInterval(interval);
  }, [libraryId, refreshTrigger, isEditMode]);

  const handleSeatUpdate = async (seatId, newStatus) => {
    try {
      await updateSeatStatus(seatId, newStatus);
      toast.success(`Seat marked as ${newStatus}`);
      setRefreshTrigger(prev => prev + 1);
      setSelectedSeat(null);
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

  const handleCancelReservation = async (seatId, reservationIndex) => {
    try {
      await cancelReservation(seatId, reservationIndex);
      toast.success("Reservation cancelled");
      setRefreshTrigger(prev => prev + 1);
      setSelectedSeat(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel reservation");
    }
  };

  // Compute stats based on time filter
  const stats = useMemo(() => {
    const total = seats.length;
    let occupied = 0, available = 0, maintenance = 0, reserved = 0;
    for (const s of seats) {
      const ds = computeDisplayStatus(s, filterStartTime, filterEndTime);
      if (ds === 'Occupied') occupied++;
      else if (ds === 'Maintenance') maintenance++;
      else if (ds === 'Reserved') reserved++;
      else available++;
    }
    return { total, occupied, available, maintenance, reserved };
  }, [seats, filterStartTime, filterEndTime]);

  const categories = ['All', ...new Set(seats.map(s => s.category))];
  const displayedSeats = filter === 'All'
    ? seats
    : seats.filter(s => s.category === filter);

  return (
    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">

      {/* --- HEADER & STATS --- */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Live Seat Monitor</h1>

          <div className="flex flex-wrap gap-3 items-center">

            {/* View Toggles */}
            <div className="bg-white p-1 rounded-lg border border-gray-200 flex shadow-sm">
              <button
                onClick={() => setViewMode('canvas')}
                className={`p-2 rounded-md transition ${viewMode === 'canvas' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Layout View"
                disabled={isEditMode}
              >
                <Map size={20} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                title="Grid View"
                disabled={isEditMode}
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

        {/* Time Slot Quick Buttons (Always Visible) */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">View Time:</span>
            {[
              { label: '6–11 AM', emoji: '🌅', start: '06:00', end: '11:00' },
              { label: '11 AM–4 PM', emoji: '☀️', start: '11:00', end: '16:00' },
              { label: '4–9 PM', emoji: '🌇', start: '16:00', end: '21:00' },
              { label: '9 PM–5 AM', emoji: '🌙', start: '21:00', end: '05:00' },
              { label: 'All Day', emoji: '📅', start: '00:00', end: '23:59' },
            ].map((slot) => {
              const isActive = filterStartTime === slot.start && filterEndTime === slot.end;
              return (
                <button
                  key={slot.label}
                  onClick={() => {
                    setFilterStartTime(slot.start);
                    setFilterEndTime(slot.end);
                    setShowTimeFilter(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border ${isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                >
                  <span className="mr-1">{slot.emoji}</span>
                  {slot.label}
                </button>
              );
            })}

            {/* Custom Time Toggle */}
            <button
              onClick={() => setShowTimeFilter(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border flex items-center gap-1.5 ${showTimeFilter
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
            >
              <Clock size={14} />
              Custom
              <ChevronDown size={12} className={`transition ${showTimeFilter ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Custom Time Range Picker (Collapsible) */}
          {showTimeFilter && (
            <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={filterStartTime}
                  onChange={(e) => setFilterStartTime(e.target.value)}
                  className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-400 outline-none font-mono"
                />
                <span className="text-indigo-400 font-bold">→</span>
                <input
                  type="time"
                  value={filterEndTime}
                  onChange={(e) => setFilterEndTime(e.target.value)}
                  className="px-3 py-1.5 border border-indigo-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-400 outline-none font-mono"
                />
              </div>
              <button
                onClick={() => {
                  const n = new Date();
                  setFilterStartTime(n.toTimeString().substring(0, 5));
                  setFilterEndTime('22:00');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
              >
                Reset to Now
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total Capacity" value={stats.total} color="bg-gray-100" />
          <StatCard label="Available" value={stats.available} color="bg-green-100 text-green-800" />
          <StatCard label="Occupied" value={stats.occupied} color="bg-red-100 text-red-800" />
          <StatCard label="Reserved" value={stats.reserved} color="bg-blue-100 text-blue-800" />
          <StatCard label="Maintenance" value={stats.maintenance} color="bg-amber-100 text-amber-800" />
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
          filterStartTime={filterStartTime}
          filterEndTime={filterEndTime}
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
            {displayedSeats.map((seat) => {
              const displayStatus = computeDisplayStatus(seat, filterStartTime, filterEndTime);
              const reservationsNow = getReservationsInRange(seat, filterStartTime, filterEndTime);
              const reserverName = reservationsNow.length > 0
                ? (reservationsNow[0].userId?.name || 'Reserved')
                : null;

              return (
                <div
                  key={seat._id}
                  onClick={() => setSelectedSeat(seat)}
                  className={`
                    relative p-2 rounded-xl border-2 cursor-pointer transition transform hover:scale-105
                    flex flex-col items-center justify-center h-20 shadow-sm
                    ${getStatusColor(displayStatus)}
                `}
                >
                  <span className="text-[10px] font-bold uppercase opacity-70 mb-0.5 truncate w-full text-center">{seat.category}</span>
                  <span className="text-lg font-bold">{seat.seatNumber}</span>

                  {displayStatus === 'Occupied' && (
                    <div className="absolute top-1 right-1">
                      <User size={12} className="text-red-700" />
                    </div>
                  )}
                  {displayStatus === 'Reserved' && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      <User size={12} className="text-blue-700" />
                      {reservationsNow.length > 1 && (
                        <span className="text-[9px] font-bold text-blue-600">+{reservationsNow.length - 1}</span>
                      )}
                    </div>
                  )}

                  {displayStatus === 'Occupied' && seat.currentOccupant?.name ? (
                    <span className="absolute bottom-1 w-full text-center text-[9px] font-bold truncate px-1 opacity-80">
                      {seat.currentOccupant.name}
                    </span>
                  ) : reserverName ? (
                    <span className="absolute bottom-1 w-full text-center text-[9px] font-bold truncate px-1 opacity-80 text-blue-800">
                      {reserverName}
                    </span>
                  ) : null}
                </div>
              )
            })}
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
          filterStartTime={filterStartTime}
          filterEndTime={filterEndTime}
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

const SeatDetailModal = ({ seat, onClose, onUpdate, onReserve, onCancelReservation, users, filterStartTime, filterEndTime }) => {
  const [showReserveForm, setShowReserveForm] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    userId: '',
    startTime: '09:00',
    endTime: '17:00'
  });

  const occupant = seat.currentOccupant || { name: "Unknown", email: "N/A" };
  const isOccupied = seat.status === 'Occupied';
  const isMaintenance = seat.status === 'Maintenance';
  const reservations = seat.reservations || [];
  const hasReservations = reservations.length > 0;

  const handleReserveSubmit = (e) => {
    e.preventDefault();
    onReserve(seat._id, {
      userId: reservationForm.userId,
      startTime: reservationForm.startTime,
      endTime: reservationForm.endTime
    });
  };

  // Header color based on state
  const getHeaderColor = () => {
    if (isOccupied) return 'bg-red-600';
    if (isMaintenance) return 'bg-amber-500';
    if (hasReservations) return 'bg-blue-600';
    return 'bg-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className={`p-6 text-center shrink-0 ${getHeaderColor()}`}>
          <Armchair className="text-white mx-auto mb-2" size={48} />
          <h2 className="text-2xl font-bold text-white">Seat {seat.seatNumber}</h2>
          <span className="text-white/90 font-medium text-sm uppercase tracking-wider">
            {isOccupied ? 'Occupied' : isMaintenance ? 'Maintenance' : hasReservations ? `${reservations.length} Reservation${reservations.length > 1 ? 's' : ''}` : 'Available'}
          </span>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold">Category</label>
              <p className="text-gray-900 font-medium">{seat.category}</p>
            </div>

            {/* --- Current Occupant --- */}
            {isOccupied && (
              <>
                <div className="border-t pt-4">
                  <label className="text-xs text-gray-500 uppercase font-bold mb-3 block">Occupied By</label>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    {occupant.avatar ? (
                      <img src={occupant.avatar} alt={occupant.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
                        {occupant.name ? occupant.name[0] : 'U'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-gray-900 truncate">{occupant.name}</p>
                      <p className="text-xs text-gray-500 truncate">{occupant.email}</p>
                      {occupant.phone && <p className="text-xs text-gray-500 truncate mt-0.5">Ph: {occupant.phone}</p>}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 space-y-1 bg-white p-2 border border-gray-100 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Checked In:</span>
                    <span>{seat.occupiedSince ? new Date(seat.occupiedSince).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Expected Out:</span>
                    <span>{seat.expectedEndTime ? new Date(seat.expectedEndTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span>
                  </div>
                </div>
              </>
            )}

            {/* --- Reservations Schedule (Multi-User) --- */}
            {hasReservations && (
              <div className="border-t pt-4">
                <label className="text-xs text-blue-600 uppercase font-bold mb-3 block flex items-center gap-2">
                  <Clock size={14} />
                  Reservation Schedule ({reservations.length} slot{reservations.length > 1 ? 's' : ''})
                </label>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {reservations.map((res, index) => {
                    const resUser = res.userId || {};
                    const isInCurrentRange = filterStartTime && filterEndTime
                      ? (res.startTime < filterEndTime && res.endTime > filterStartTime)
                      : true;

                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition ${isInCurrentRange
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-100 opacity-60'
                          }`}
                      >
                        {/* Time Badge */}
                        <div className="shrink-0 text-center">
                          <div className="text-xs font-mono font-bold text-blue-700">{res.startTime}</div>
                          <div className="text-[9px] text-gray-400">to</div>
                          <div className="text-xs font-mono font-bold text-blue-700">{res.endTime}</div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 overflow-hidden">
                          {resUser.avatar ? (
                            <div className="flex items-center gap-2">
                              <img src={resUser.avatar} alt={resUser.name} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-blue-200" />
                              <div className="overflow-hidden">
                                <p className="font-semibold text-sm text-gray-900 truncate">{resUser.name || 'Unknown'}</p>
                                <p className="text-[10px] text-gray-500 truncate">{resUser.email || ''}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs">
                                {resUser.name ? resUser.name[0] : 'U'}
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-semibold text-sm text-gray-900 truncate">{resUser.name || 'Unknown'}</p>
                                <p className="text-[10px] text-gray-500 truncate">{resUser.email || ''}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cancel Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Cancel reservation for ${resUser.name || 'this user'} (${res.startTime} – ${res.endTime})?`)) {
                              onCancelReservation(seat._id, index);
                            }
                          }}
                          className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Cancel this reservation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* --- "Available" Message + Reserve Button (when not occupied or maintenance) --- */}
            {!isOccupied && !isMaintenance && !showReserveForm && (
              <div className="flex flex-col gap-3 border-t pt-4">
                {!hasReservations && (
                  <div className="flex items-center gap-3 text-green-700 bg-green-50 p-3 rounded-xl border border-green-100 text-sm font-medium">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>Ready to be assigned via QR Scan</span>
                  </div>
                )}
                <button
                  onClick={() => setShowReserveForm(true)}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm border border-blue-200 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add Reservation
                </button>
              </div>
            )}

            {/* --- Reservation Form --- */}
            {showReserveForm && !isOccupied && !isMaintenance && (
              <form onSubmit={handleReserveSubmit} className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-blue-600 uppercase font-bold">New Reservation</label>
                  <button type="button" onClick={() => setShowReserveForm(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>

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

                {/* Show existing reservations for reference */}
                {hasReservations && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-xs text-amber-800">
                    <strong>Existing slots:</strong>{' '}
                    {reservations.map(r => `${r.startTime}–${r.endTime}`).join(', ')}
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
            {!isOccupied && !showReserveForm && (
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
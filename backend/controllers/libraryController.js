const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Attendance = require('../models/Attendance');

// @desc    Add a new library (Admin/Co-Admin only)
// @route   POST /api/library/add
const addLibrary = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;

        // Only admin or co-admin can add libraries
        if (role !== 'co-admin' && role !== 'admin') {
            return res.status(403).json({
                message: "Forbidden: You do not have access to add library"
            });
        }

        const randomString = crypto.randomBytes(8).toString('hex');
        const qrData = `${process.env.APP_URL}/scan/lib_${randomString}`;

        const {
            libraryName,
            description,
            location,
            contact,
            amenities,
            seatCategories,
            totalSeats,
            plans,
            businessHours,
            image,
            images,
            // Owner details
            ownerName,
            ownerEmail,
            ownerPhone,
            ownerPassword
        } = req.body;

        // Validate required fields
        if (!libraryName || !location?.coordinates || !contact?.phone || !totalSeats) {
            return res.status(400).json({
                message: "Missing required fields: libraryName, location.coordinates, contact.phone, totalSeats are required"
            });
        }

        if (!location?.address?.city || !location?.address?.state || !location?.address?.pincode) {
            return res.status(400).json({
                message: "Missing required address fields: city, state, pincode are required"
            });
        }

        // Check for existing library with same name and contact
        const existingLibrary = await Library.findOne({
            libraryName,
            'contact.phone': contact.phone
        });

        if (existingLibrary) {
            return res.status(409).json({
                message: "A library with this name and phone already exists"
            });
        }

        // Handle owner user - find or create
        let ownerUser = null;
        const searchEmail = ownerEmail || contact.email;
        const searchPhone = ownerPhone || contact.phone;

        ownerUser = await User.findOne({
            $or: [
                { email: searchEmail },
                { phone: searchPhone }
            ]
        });

        if (!ownerUser) {
            // Create new library owner user
            if (!ownerPassword) {
                return res.status(400).json({
                    message: "ownerPassword is required when creating a new library owner"
                });
            }

            const hashedPassword = await bcrypt.hash(ownerPassword, 10);

            const newUserPayload = {
                name: ownerName || libraryName + ' Owner',
                email: searchEmail,
                phone: searchPhone,
                password: hashedPassword,
                role: 'library_owner',
                loginProvider: 'email',
                addresses: [{
                    label: 'library',
                    street: location.address?.street,
                    city: location.address.city,
                    state: location.address.state,
                    pincode: location.address.pincode,
                    coordinates: {
                        latitude: location.coordinates[1],
                        longitude: location.coordinates[0]
                    },
                    isDefault: true
                }],
                libraryOwnerDetails: {
                    isVerified: false,
                    ownedLibraries: []
                }
            };

            ownerUser = await User.create(newUserPayload);
        } else {
            // Update existing user to library_owner if not already
            if (ownerUser.role !== 'library_owner' && ownerUser.role !== 'admin') {
                ownerUser = await User.findByIdAndUpdate(ownerUser._id, {
                    $set: {
                        role: 'library_owner',
                        libraryOwnerDetails: {
                            isVerified: false,
                            ownedLibraries: ownerUser.libraryOwnerDetails?.ownedLibraries || []
                        }
                    }
                }, { new: true, runValidators: true });
            }
        }

        // Create the library
        const newLibraryPayload = {
            libraryName,
            description,
            ownerId: ownerUser._id,
            location: {
                type: 'Point',
                coordinates: location.coordinates,
                address: location.address
            },
            accessConfig: {
                qrCodeData: qrData,
                qrVersion: 1
            },
            contact,
            amenities: amenities || [],
            seatCategories: seatCategories || [{ name: 'General', totalCount: totalSeats, priceMultiplier: 1 }],
            totalSeats,
            plans: plans || [],
            businessHours: businessHours || {},
            image: image || "",
            images: images || [],
            isActive: true,
            isVerified: false
        };

        const newLibrary = await Library.create(newLibraryPayload);

        // Update owner's ownedLibraries array
        await User.findByIdAndUpdate(ownerUser._id, {
            $addToSet: {
                'libraryOwnerDetails.ownedLibraries': newLibrary._id
            }
        }, { new: true });

        // Auto-generate seats
        try {
            await syncLibrarySeats(newLibrary);
        } catch (seatError) {
            console.error("Failed to auto-generate seats:", seatError);
        }

        res.status(201).json({
            message: "Library added successfully",
            library: newLibrary,
            owner: {
                _id: ownerUser._id,
                email: ownerUser.email,
                name: ownerUser.name,
                phone: ownerUser.phone
            }
        });

    } catch (error) {
        console.error('Error in adding library:', error);

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Library with similar details already exists'
            });
        }

        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Update a library
// @route   PUT /api/library/update/:id
const updateLibrary = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { id } = req.params;

        // Find the library
        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Check permissions: admin, co-admin, or the library owner
        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to update this library"
            });
        }

        const updateData = req.body;

        // Prevent changing ownerId unless admin
        if (updateData.ownerId && role !== 'admin') {
            delete updateData.ownerId;
        }

        // RESTRICTED FIELDS: Library Owners cannot change totalSeats or seatCategories
        if (role === 'library_owner') {
            delete updateData.totalSeats;
            delete updateData.seatCategories;
        }

        // Handle location update properly
        if (updateData.location) {
            updateData.location = {
                type: 'Point',
                coordinates: updateData.location.coordinates || library.location.coordinates,
                address: { ...library.location.address, ...updateData.location.address }
            };
        }

        // --- AUTO-SYNC LOGIC: If totalSeats changes but categories aren't provided ---
        // We assume simple mode: Update "General" category to match totalSeats
        if (updateData.totalSeats !== undefined && !updateData.seatCategories) {
            updateData.seatCategories = [{
                name: 'General',
                totalCount: updateData.totalSeats
            }];
        }
        // --------------------------------------------------------------------------

        const updatedLibrary = await Library.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Auto-sync seats if categories changed
        // Optimization: checking if plans/amenities changed might be overkill, but let's just sync safely
        // The helper wipes seats, which is risky for updates if people are seated. 
        // Ideally we only run this if seatCategories changed.
        // For now, we only run if 'seatCategories' was in the body.
        if (req.body.seatCategories || req.body.plans || req.body.totalSeats !== undefined) {
            // Note: totalSeats change should trigger sync (e.g. 50 -> 60 seats)
            try {
                await syncLibrarySeats(updatedLibrary);
            } catch (seatError) {
                console.error("Failed to auto-sync seats on update:", seatError);
            }
        }

        res.status(200).json({
            message: "Library updated successfully",
            library: updatedLibrary
        });

    } catch (error) {
        console.error('Error updating library:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Get all libraries (with filters)
// @route   GET /api/library/all
const getAllLibraries = async (req, res) => {
    try {
        const {
            page = 1,
            limit: reqLimit = 20,
            city,
            state,
            isActive,
            isVerified,
            minRating,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Enforce max limit for security
        const limit = Math.min(parseInt(reqLimit) || 20, 100);
        const skip = (parseInt(page) - 1) * limit;

        // Build filter query
        const filter = {};

        if (city) filter['location.address.city'] = new RegExp(city, 'i');
        if (state) filter['location.address.state'] = new RegExp(state, 'i');
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
        if (minRating) filter['rating.average'] = { $gte: parseFloat(minRating) };
        if (search) {
            // Using MongoDB $text index for optimal searching
            // Note: Make sure the text index is built via LibrarySchema
            filter.$text = { $search: search };

            // Note: If you want substring matches where words are incomplete, regex is needed
            // But for performance on large DBs, $text is better. 
            // If strictly needing substring, keeping regex but with limits is the way. We assume $text here.
        }

        // Sort configuration
        const sortConfig = {};
        sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const totalLibraries = await Library.countDocuments(filter);
        const libraries = await Library.find(filter)
            .populate('ownerId', 'name email phone avatar')
            .sort(sortConfig)
            .skip(skip)
            .limit(parseInt(limit));

        res.status(200).json({
            message: "Libraries retrieved successfully",
            libraries,
            pagination: {
                total: totalLibraries,
                totalPages: Math.ceil(totalLibraries / limit),
                currentPage: parseInt(page),
                hasNextPage: parseInt(page) * limit < totalLibraries,
                hasPrevPage: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Error fetching libraries:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Get single library by ID
// @route   GET /api/library/:id
const getLibraryById = async (req, res) => {
    try {
        const { id } = req.params;

        const library = await Library.findById(id)
            .populate('ownerId', 'name email phone avatar')
            .populate({
                path: 'rating.reviews.userId',
                select: 'name avatar'
            });

        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        res.status(200).json({
            message: "Library retrieved successfully",
            library
        });

    } catch (error) {
        console.error('Error fetching library:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Get libraries owned by current user
// @route   GET /api/library/my-libraries
const getMyLibraries = async (req, res) => {
    try {
        const userId = req.finduser._id;

        const libraries = await Library.find({ ownerId: userId })
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Your libraries retrieved successfully",
            libraries,
            count: libraries.length
        });

    } catch (error) {
        console.error('Error fetching my libraries:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Get nearby libraries (Geospatial query)
// @route   GET /api/library/nearby
const getNearbyLibraries = async (req, res) => {
    try {
        const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters

        if (!longitude || !latitude) {
            return res.status(400).json({
                message: "longitude and latitude are required"
            });
        }

        const libraries = await Library.aggregate([
            {
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    distanceField: "dist.calculated", // Added exact distance
                    maxDistance: parseInt(maxDistance),
                    spherical: true,
                    query: { isActive: true }
                }
            }
        ]);

        // Populate ownerId since aggregate doesn't do it automatically like find()
        await User.populate(libraries, { path: 'ownerId', select: 'name email phone' });

        res.status(200).json({
            message: "Nearby libraries retrieved successfully",
            libraries,
            count: libraries.length
        });

    } catch (error) {
        console.error('Error fetching nearby libraries:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Delete a library
// @route   DELETE /api/library/delete/:id
const deleteLibrary = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { id } = req.params;

        // Find the library
        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Check permissions: only admin or co-admin can delete
        if (role !== 'admin' && role !== 'co-admin') {
            return res.status(403).json({
                message: "Forbidden: Only admin can delete libraries"
            });
        }

        const ownerId = library.ownerId;

        // Delete the library
        await Library.findByIdAndDelete(id);

        // Remove library from owner's ownedLibraries array
        await User.findByIdAndUpdate(ownerId, {
            $pull: {
                'libraryOwnerDetails.ownedLibraries': id
            }
        });

        // Check if owner has no more libraries, downgrade role
        const remainingLibraries = await Library.countDocuments({ ownerId });
        if (remainingLibraries === 0) {
            await User.findByIdAndUpdate(ownerId, {
                $set: { role: 'student' }
            });
        }

        res.status(200).json({
            message: "Library deleted successfully",
            deletedLibrary: {
                _id: library._id,
                libraryName: library.libraryName
            }
        });

    } catch (error) {
        console.error('Error deleting library:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Toggle library active status
// @route   PATCH /api/library/toggle-status/:id
const toggleLibraryStatus = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { id } = req.params;

        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Check permissions
        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to modify this library"
            });
        }

        library.isActive = !library.isActive;
        await library.save();

        res.status(200).json({
            message: `Library ${library.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: library.isActive
        });

    } catch (error) {
        console.error('Error toggling library status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Rate a library
// @route   POST /api/library/rate/:id
const rateLibrary = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Please provide a valid rating between 1 and 5" });
        }

        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Check if user already rated
        const existingReviewIndex = library.rating.reviews.findIndex(
            r => r.userId.toString() === userId.toString()
        );

        if (existingReviewIndex !== -1) {
            return res.status(400).json({ message: "You have already reviewed this library" });
        } else {
            // Add new review
            library.rating.reviews.push({
                userId: userId,
                rating: Number(rating),
                comment: comment || '',
                createdAt: Date.now()
            });
        }

        // Recalculate average rating
        const totalRating = library.rating.reviews.reduce((acc, item) => acc + item.rating, 0);
        library.rating.average = totalRating / library.rating.reviews.length;
        library.rating.count = library.rating.reviews.length;

        await library.save();

        // Populate user details for the response
        await library.populate({
            path: 'rating.reviews.userId',
            select: 'name avatar'
        });

        res.status(200).json({
            message: "Library rated successfully",
            rating: library.rating
        });

    } catch (error) {
        console.error('Error rating library:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/library/review/:libraryId/:reviewId
const deleteReview = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const userRole = req.finduser.role;
        const { libraryId, reviewId } = req.params;

        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const review = library.rating.reviews.id(reviewId);
        if (!review) {
            return res.status(404).json({ message: "Review not found" });
        }

        // Permissions: Admin, Co-admin, Library Owner, or Review Author
        const isOwner = library.ownerId.toString() === userId.toString();
        const isAuthor = review.userId.toString() === userId.toString();
        const isAdmin = userRole === 'admin' || userRole === 'co-admin';

        if (!isAdmin && !isOwner && !isAuthor) {
            return res.status(403).json({ message: "Not authorized to delete this review" });
        }

        // Remove review
        review.deleteOne();

        // Recalculate stats
        if (library.rating.reviews.length > 0) {
            const totalRating = library.rating.reviews.reduce((acc, item) => acc + item.rating, 0);
            library.rating.average = totalRating / library.rating.reviews.length;
        } else {
            library.rating.average = 0;
        }
        library.rating.count = library.rating.reviews.length;

        await library.save();

        res.status(200).json({
            message: "Review deleted successfully",
            rating: library.rating
        });

    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Regenerate Library QR Code
// @route   PATCH /api/library/regenerate-qr/:id
const regenerateQRCode = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const userRole = req.finduser.role;
        const { id } = req.params;

        const library = await Library.findById(id);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Check permissions (Owner or Admin)
        const isOwner = library.ownerId.toString() === userId.toString();
        const isAdmin = userRole === 'admin' || userRole === 'co-admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to regenerate QR code" });
        }

        // Generate new QR data
        const randomString = crypto.randomBytes(8).toString('hex');
        const newQrData = `${process.env.APP_URL}/scan/lib_${randomString}`;

        // Update library
        library.accessConfig.qrCodeData = newQrData;
        library.accessConfig.qrVersion = (library.accessConfig.qrVersion || 0) + 1;

        await library.save();

        res.status(200).json({
            message: "QR Code regenerated successfully",
            accessConfig: library.accessConfig
        });

    } catch (error) {
        console.error('Error regenerating QR:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};



// Helper function to sync seats (Smart Sync)
const syncLibrarySeats = async (library) => {
    // 1. Determine Target Configuration
    let targetConfig = [];
    if (library.seatCategories && library.seatCategories.length > 0) {
        targetConfig = library.seatCategories;
    } else {
        // Fallback: Use totalSeats with default category
        targetConfig = [{ name: 'General', totalCount: library.totalSeats || 0 }];
    }

    // 2. Build Desired Set of Seats
    // We want to know exactly which seats SHOULD exist.
    // Format: "Category:Number" -> { category, seatNumber }
    const desiredSeatsMap = new Map();
    targetConfig.forEach(cat => {
        for (let i = 1; i <= cat.totalCount; i++) {
            const key = `${cat.name}:${i}`;
            desiredSeatsMap.set(key, {
                libraryId: library._id,
                seatNumber: i.toString(), // Ensure string for consistency
                category: cat.name,
                status: 'Available' // Default for NEW seats
            });
        }
    });

    // 3. Fetch Existing Seats
    const existingSeats = await Seat.find({ libraryId: library._id });
    const existingSeatsMap = new Map();
    existingSeats.forEach(seat => {
        const key = `${seat.category}:${seat.seatNumber}`;
        existingSeatsMap.set(key, seat);
    });

    // 4. Calculate Operations
    const toInsert = [];
    const toDeleteIds = [];

    // Identify New Seats (In Desired but not Existing)
    desiredSeatsMap.forEach((val, key) => {
        if (!existingSeatsMap.has(key)) {
            toInsert.push(val);
        }
    });

    // Identify Seats to Remove (In Existing but not Desired)
    existingSeatsMap.forEach((val, key) => {
        if (!desiredSeatsMap.has(key)) {
            toDeleteIds.push(val._id);
        }
    });

    // 5. Execute Updates
    if (toInsert.length > 0) {
        await Seat.insertMany(toInsert);
        // console.log(`[Sync] Created ${toInsert.length} new seats for library ${library._id}`);
    }

    if (toDeleteIds.length > 0) {
        // Optional safety: only delete if status is 'Available' or force delete?
        // User expects capacity reduction -> deletion.
        await Seat.deleteMany({ _id: { $in: toDeleteIds } });
        // console.log(`[Sync] Deleted ${toDeleteIds.length} excess seats for library ${library._id}`);
    }

    // Existing seats remain untouched (preserving Occupied/Maintenance status)
    return desiredSeatsMap.size;
};

const generateSeatsForLibrary = async (req, res) => {
    try {
        const { libraryId } = req.body;

        const library = await Library.findById(libraryId);
        if (!library) return res.status(404).json({ msg: "Library not found" });

        const count = await syncLibrarySeats(library);

        res.json({
            success: true,
            msg: `Successfully generated ${count} seats for ${library.libraryName}`
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
};

// ============================================
// LIBRARY OWNER - USER ANALYTICS ENDPOINTS
// ============================================


const getLibraryUsers = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { libraryId } = req.params;

        // Find the library
        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        // Permission check: Only library owner, admin, or co-admin can view users
        const isOwner = library.ownerId.toString() === userId.toString();

        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to view library users"
            });
        }

        // Pagination & Filtering
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const searchQuery = req.query.search || '';
        const statusFilter = req.query.status; // 'active', 'expired', 'cancelled', 'all'
        const sortBy = req.query.sortBy || 'createdAt'; // 'name', 'createdAt', 'lastSeen'
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

        let subscriptionFilter = { libraryId };

        if (statusFilter && statusFilter !== 'all') {
            subscriptionFilter.status = statusFilter;
        }

        const subscriptions = await Subscription.find(subscriptionFilter)
            .populate('userId', 'name email phone avatar createdAt');

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(200).json({
                message: "No users found for this library",
                users: [],
                summary: {
                    totalUsers: 0,
                    activeSubscriptions: 0,
                    expiredSubscriptions: 0,
                    cancelledSubscriptions: 0
                },
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: page,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        }

        // Filter out orphaned subscriptions (where userId is null due to deleted user)
        const validSubscriptions = subscriptions.filter(sub => sub.userId);

        // Extract unique user IDs and apply search filter
        let userIds = validSubscriptions.map(sub => sub.userId._id);

        if (searchQuery) {
            const searchFilter = new RegExp(searchQuery, 'i');
            const filteredSubs = validSubscriptions.filter(sub =>
                searchFilter.test(sub.userId.name) ||
                searchFilter.test(sub.userId.email)
            );
            userIds = filteredSubs.map(sub => sub.userId._id);
        }

        // If search filtered everything out
        if (userIds.length === 0 && searchQuery) {
            return res.status(200).json({
                message: "No users matching search found",
                users: [],
                summary: {
                    totalUsers: validSubscriptions.length,
                    activeSubscriptions: validSubscriptions.filter(s => s.status === 'active').length,
                    expiredSubscriptions: validSubscriptions.filter(s => s.status === 'expired').length,
                    cancelledSubscriptions: validSubscriptions.filter(s => s.status === 'cancelled').length
                },
                pagination: {
                    total: 0,
                    totalPages: 0,
                    currentPage: page,
                    hasNextPage: false,
                    hasPrevPage: false
                }
            });
        }

        // Get attendance summary for each user
        const attendanceData = await Attendance.aggregate([
            {
                $match: {
                    userId: { $in: userIds },
                    libraryId: library._id
                }
            },
            {
                $group: {
                    _id: '$userId',
                    totalSessions: { $sum: '$sessionCount' },
                    totalMinutes: { $sum: '$totalDurationToday' },
                    lastVisit: { $max: '$date' },
                    firstVisit: { $min: '$date' }
                }
            }
        ]);

        // Convert to map for easy lookup
        const attendanceMap = new Map();
        attendanceData.forEach(record => {
            attendanceMap.set(record._id.toString(), record);
        });

        // Prepare detailed user data
        // Only process subs that match the search (if any)
        const relevantSubs = validSubscriptions.filter(sub =>
            userIds.some(uid => uid.toString() === sub.userId._id.toString())
        );

        // Group subscriptions by user to avoid duplicates
        const userMap = new Map();

        relevantSubs.forEach(sub => {
            const userIdStr = sub.userId._id.toString();
            const existingEntry = userMap.get(userIdStr);

            // Determine if we should use this subscription over the existing one
            // Priority: Active > Expired > Cancelled
            // Tie-breaker: Latest startDate
            let useThisSub = false;

            if (!existingEntry) {
                useThisSub = true;
            } else {
                const currentStatus = sub.status;
                const existingStatus = existingEntry.subscription.status;

                if (currentStatus === 'active' && existingStatus !== 'active') {
                    useThisSub = true;
                } else if (currentStatus === existingStatus) {
                    // If status is same, pick the one with later start date
                    if (new Date(sub.startDate) > new Date(existingEntry.subscription.startDate)) {
                        useThisSub = true;
                    }
                }
            }

            if (useThisSub) {
                const attendance = attendanceMap.get(userIdStr) || {
                    totalSessions: 0,
                    totalMinutes: 0
                };

                const planDetails = library.plans.find(p => p._id.toString() === sub.planId.toString());

                userMap.set(userIdStr, {
                    userId: sub.userId._id,
                    userName: sub.userId.name,
                    email: sub.userId.email,
                    phone: sub.userId.phone || 'N/A',
                    avatar: sub.userId.avatar || '',
                    subscription: {
                        subscriptionId: sub._id,
                        planName: sub.planName || planDetails?.name || 'Unknown Plan',
                        planId: sub.planId,
                        startDate: sub.startDate,
                        expiryDate: sub.expiryDate,
                        status: sub.status,
                        pricePaid: sub.pricePaid,
                        gracePeriodAllowed: sub.gracePeriodAllowed,
                        graceDaysAllowed: sub.graceDaysAllowed,
                        graceDaysUsed: sub.graceDaysUsed,
                        graceStartDate: sub.graceStartDate
                    },
                    attendance: {
                        totalSessions: attendance.totalSessions || 0,
                        totalMinutesUsed: attendance.totalMinutes || 0,
                        totalHoursUsed: Math.round((attendance.totalMinutes || 0) / 60 * 100) / 100,
                        firstVisit: attendance.firstVisit || null,
                        lastVisit: attendance.lastVisit || null
                    },
                    joinedAt: sub.userId.createdAt
                });
            }
        });

        const usersData = Array.from(userMap.values());

        // Apply sorting
        usersData.sort((a, b) => {
            let compareValue = 0;

            if (sortBy === 'name') {
                compareValue = a.userName.localeCompare(b.userName);
            } else if (sortBy === 'createdAt') {
                const dateA = new Date(a.joinedAt || 0);
                const dateB = new Date(b.joinedAt || 0);
                compareValue = dateA - dateB;
            } else if (sortBy === 'lastSeen') {
                const dateA = a.attendance.lastVisit ? new Date(a.attendance.lastVisit) : new Date(0);
                const dateB = b.attendance.lastVisit ? new Date(b.attendance.lastVisit) : new Date(0);
                compareValue = dateA - dateB;
            } else if (sortBy === 'sessionsCount') {
                compareValue = a.attendance.totalSessions - b.attendance.totalSessions;
            }

            return compareValue * sortOrder;
        });

        const total = usersData.length;
        const paginatedUsers = usersData.slice(skip, skip + limit);

        res.status(200).json({
            message: "Users retrieved successfully",
            users: paginatedUsers,
            summary: {
                totalUsers: total,
                activeSubscriptions: validSubscriptions.filter(s => s.status === 'active').length,
                expiredSubscriptions: validSubscriptions.filter(s => s.status === 'expired').length,
                cancelledSubscriptions: validSubscriptions.filter(s => s.status === 'cancelled').length
            },
            pagination: {
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                hasNextPage: page * limit < total,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching library users:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get detailed analytics for a specific user in library
// @route   GET /api/library/:libraryId/user/:userId/analytics
const getUserAnalytics = async (req, res) => {
    try {
        const ownerId = req.finduser._id;
        const ownerRole = req.finduser.role;
        const { libraryId, userId } = req.params;

        // Verify library ownership
        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === ownerId.toString();
        if (ownerRole !== 'admin' && ownerRole !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to view user analytics"
            });
        }

        // Fetch user data
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch subscription data
        const Subscription = require('../models/Subscription');
        const subscriptions = await Subscription.find({
            userId,
            libraryId
        }).sort({ createdAt: -1 });

        if (!subscriptions || subscriptions.length === 0) {
            return res.status(404).json({
                message: "This user has no subscription in this library"
            });
        }

        // Determine the "current" subscription (prioritize active, otherwise use the latest)
        let currentSubscription = subscriptions.find(sub => sub.status === 'active');
        if (!currentSubscription) {
            currentSubscription = subscriptions[0]; // fallback to the most recent one
        }

        // Fetch all attendance records for this user
        const Attendance = require('../models/Attendance');
        const attendanceRecords = await Attendance.find({
            userId,
            libraryId
        }).sort({ date: -1 });

        // Calculate analytics
        const totalSessions = attendanceRecords.reduce((acc, record) => acc + record.sessionCount, 0);
        const totalMinutes = attendanceRecords.reduce((acc, record) => acc + (record.totalDurationToday || 0), 0);
        const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

        // Average session duration
        const avgSessionDuration = totalSessions > 0 ? Math.round((totalMinutes / totalSessions) * 100) / 100 : 0;

        // Get latest 10 sessions
        const detailedSessions = [];
        attendanceRecords.forEach(record => {
            record.sessions.forEach(session => {
                if (session.checkOutTime) {
                    detailedSessions.push({
                        date: record.date,
                        seatNumber: session.seatNumber,
                        checkInTime: session.checkInTime,
                        checkOutTime: session.checkOutTime,
                        durationMinutes: session.durationMinutes
                    });
                }
            });
        });

        // Sort by date descending and take latest 10
        const latestSessions = detailedSessions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        // Plan details
        const planDetails = library.plans.find(p => p._id.toString() === currentSubscription.planId.toString());

        // Format subscription history
        const subscriptionHistory = subscriptions.map(sub => {
            const plan = library.plans.find(p => p._id.toString() === sub.planId.toString());
            return {
                _id: sub._id,
                planName: sub.planName || plan?.name || 'Unknown Plan',
                planId: sub.planId,
                startDate: sub.startDate,
                expiryDate: sub.expiryDate,
                status: sub.status,
                pricePaid: sub.pricePaid
            };
        });

        res.status(200).json({
            message: "User analytics retrieved successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || 'N/A',
                avatar: user.avatar || '',
                joinedAt: user.createdAt
            },
            subscription: {
                planName: currentSubscription.planName || planDetails?.name || 'Unknown',
                planId: currentSubscription.planId,
                startDate: currentSubscription.startDate,
                expiryDate: currentSubscription.expiryDate,
                status: currentSubscription.status,
                pricePaid: currentSubscription.pricePaid,
                daysRemaining: currentSubscription.status === 'active'
                    ? Math.ceil((new Date(currentSubscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
                    : 0
            },
            subscriptionHistory,
            planDetails: {
                name: planDetails?.name || 'Unknown',
                hoursPerDay: planDetails?.hoursPerDay || 5,
                totalDays: planDetails?.totalDays || 30,
                price: planDetails?.price || 0
            },
            analytics: {
                totalSessions,
                totalMinutesUsed: totalMinutes,
                totalHoursUsed: totalHours,
                averageSessionDuration: avgSessionDuration,
                totalVisitDays: attendanceRecords.length,
                firstVisit: attendanceRecords.length > 0 ? attendanceRecords[attendanceRecords.length - 1].date : null,
                lastVisit: attendanceRecords.length > 0 ? attendanceRecords[0].date : null
            },
            recentSessions: latestSessions,
            allAttendance: attendanceRecords.map(record => ({
                date: record.date,
                sessionCount: record.sessionCount,
                totalDurationMinutes: record.totalDurationToday,
                sessions: record.sessions
            }))
        });

    } catch (error) {
        console.error('Error fetching user analytics:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get library statistics and insights
// @route   GET /api/library/:libraryId/statistics
const getLibraryStatistics = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { libraryId } = req.params;

        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to library statistics"
            });
        }

        const Subscription = require('../models/Subscription');
        const Attendance = require('../models/Attendance');

        // Get all subscriptions
        const allSubscriptions = await Subscription.find({ libraryId });

        // Get today's attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayAttendance = await Attendance.find({
            libraryId,
            date: today
        });

        // Get last 30 days attendance
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        last30Days.setHours(0, 0, 0, 0);

        const last30DaysAttendance = await Attendance.find({
            libraryId,
            date: { $gte: last30Days }
        });

        // Calculate metrics
        const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active').length;
        const expiredSubscriptions = allSubscriptions.filter(s => s.status === 'expired').length;
        const cancelledSubscriptions = allSubscriptions.filter(s => s.status === 'cancelled').length;

        const totalRevenue = allSubscriptions.reduce((acc, sub) => acc + (sub.pricePaid || 0), 0);

        const todayVisitors = new Set(todayAttendance.map(a => a.userId.toString())).size;
        const todaySessions = todayAttendance.reduce((acc, record) => acc + record.sessionCount, 0);

        const last30DaysUniqueUsers = new Set(last30DaysAttendance.map(a => a.userId.toString())).size;
        const last30DaysSessions = last30DaysAttendance.reduce((acc, record) => acc + record.sessionCount, 0);
        const last30DaysMinutes = last30DaysAttendance.reduce((acc, record) => acc + (record.totalDurationToday || 0), 0);

        // Revenue trend - last 30 days
        const revenueByDate = {};
        allSubscriptions.forEach(sub => {
            const date = new Date(sub.startDate);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];

            if (!revenueByDate[dateKey]) {
                revenueByDate[dateKey] = 0;
            }
            revenueByDate[dateKey] += sub.pricePaid || 0;
        });

        // Get average rating
        const avgRating = library.rating?.averageRating || 0;
        const totalReviews = library.rating?.reviews?.length || 0;

        res.status(200).json({
            message: "Library statistics retrieved successfully",
            library: {
                _id: library._id,
                name: library.libraryName,
                totalSeats: library.totalSeats,
                rating: avgRating,
                totalReviews
            },
            subscriptionMetrics: {
                totalSubscriptions: allSubscriptions.length,
                activeSubscriptions,
                expiredSubscriptions,
                cancelledSubscriptions,
                conversionRate: allSubscriptions.length > 0
                    ? `${Math.round((activeSubscriptions / allSubscriptions.length) * 100)}%`
                    : '0%'
            },
            financialMetrics: {
                totalRevenue,
                averageRevenuePerSubscription: allSubscriptions.length > 0
                    ? Math.round((totalRevenue / allSubscriptions.length) * 100) / 100
                    : 0
            },
            attendanceMetrics: {
                today: {
                    visitors: todayVisitors,
                    sessions: todaySessions
                },
                last30Days: {
                    uniqueUsers: last30DaysUniqueUsers,
                    totalSessions: last30DaysSessions,
                    totalMinutesUsed: last30DaysMinutes,
                    totalHoursUsed: Math.round((last30DaysMinutes / 60) * 100) / 100,
                    averageSessionDuration: last30DaysSessions > 0
                        ? Math.round((last30DaysMinutes / last30DaysSessions) * 100) / 100
                        : 0
                }
            },
            revenueByDate: Object.entries(revenueByDate)
                .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
                .slice(0, 30)
                .reduce((acc, [date, revenue]) => {
                    acc[date] = revenue;
                    return acc;
                }, {})
        });

    } catch (error) {
        console.error('Error fetching library statistics:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};

    addLibrary,
    updateLibrary,
    getAllLibraries,
    getLibraryById,
    getMyLibraries,
    getNearbyLibraries,
    deleteLibrary,
    toggleLibraryStatus,
    rateLibrary,
    deleteReview,
    regenerateQRCode,
    generateSeatsForLibrary,
    getLibraryUsers,
    getUserAnalytics,
    getLibraryStatistics

// @desc    Update user contact info in a library
// @route   PUT /api/library/:libraryId/user/:userId/contact
const updateUserContactInfo = async (req, res) => {
    try {
        const ownerId = req.finduser._id;
        const ownerRole = req.finduser.role;
        const { libraryId, userId } = req.params;
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // Verify library ownership
        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === ownerId.toString();
        if (ownerRole !== 'admin' && ownerRole !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to update user details in this library"
            });
        }

        // Fetch user data
        const user = await User.findByIdAndUpdate(userId, { phone }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "User contact updated successfully",
            phone: user.phone
        });

    } catch (error) {
        console.error('Error updating user contact info:', error);
        res.status(500).json({
            message: 'Internal server error',
            error: error.message
        });
    }
};
// @desc    Get detailed attendance chart data for a specific month
// @route   GET /api/library/:libraryId/attendance-chart
const getLibraryAttendanceChart = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { libraryId } = req.params;
        const { month, year } = req.query;

        // Basic validation
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required query parameters" });
        }

        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to library statistics"
            });
        }

        const Attendance = require('../models/Attendance');

        // Parse dates for the requested month
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of the month
        endDate.setHours(23, 59, 59, 999);

        // Fetch attendance records for this library within the date range
        const attendanceRecords = await Attendance.find({
            libraryId,
            date: { $gte: startDate, $lte: endDate }
        });

        // Initialize a map for all days in the month
        const daysInMonth = endDate.getDate();
        const dailyDataMap = new Map();

        for (let i = 1; i <= daysInMonth; i++) {
            // Create a standardized date string (YYYY-MM-DD) for keys
            const dateStr = new Date(parseInt(year), parseInt(month) - 1, i).toISOString().split('T')[0];
            dailyDataMap.set(dateStr, {
                date: dateStr,
                totalSessions: 0,
                totalDurationMinutes: 0
            });
        }

        // Aggregate data
        attendanceRecords.forEach(record => {
            const dateStr = new Date(record.date).toISOString().split('T')[0];
            if (dailyDataMap.has(dateStr)) {
                const dayData = dailyDataMap.get(dateStr);
                // 1 Record = 1 Unique User per Day (due to compound index on Attendance)
                dayData.totalSessions += 1; 
                dayData.totalDurationMinutes += record.totalDurationToday || 0;
            }
        });

        // Convert map to array and sort by date
        const chartData = Array.from(dailyDataMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            success: true,
            message: "Attendance chart data retrieved successfully",
            chartData
        });

    } catch (error) {
        console.error('Error fetching attendance chart data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get shift attendance analytics for a specific day
// @route   GET /api/library/:libraryId/attendance-shifts
const getLibraryShiftAnalytics = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { libraryId } = req.params;
        const { date } = req.query; // YYYY-MM-DD format

        // Basic validation
        if (!date) {
            return res.status(400).json({ message: "Date query parameter is required (YYYY-MM-DD)" });
        }

        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({
                message: "Forbidden: You do not have access to library statistics"
            });
        }

        // Because production servers map dates differently via timezone logic, we widen the 
        // boundary to safely cover any UTC drifts (+/- 24 hours), then strictly filter in memory.
        const [yStr, mStr, dStr] = date.split('-');
        const baseDate = new Date(Date.UTC(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr)));
        
        const targetStartDate = new Date(baseDate.getTime() - (24 * 60 * 60 * 1000));
        const targetEndDate = new Date(baseDate.getTime() + (48 * 60 * 60 * 1000));

        // Fetch attendance records for this library surrounding this date bucket
        const attendanceRecords = await Attendance.find({
            libraryId,
            date: { $gte: targetStartDate, $lte: targetEndDate }
        });

        const shiftCounts = {
            Morning: 0,   
            Afternoon: 0, 
            Evening: 0,   
            Night: 0      
        };

        // Categorize sessions explicitly extracting India Local Time
        attendanceRecords.forEach(record => {
            if (record.sessions && record.sessions.length > 0) {
                const firstSession = record.sessions.find(session => session.checkInTime);
                if (firstSession) {
                    const checkInDate = new Date(firstSession.checkInTime);
                    
                    // Force the check to match Indian local time explicitly
                    const formatterDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
                    const formatterHour = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
                    
                    const sessionLocalStr = formatterDate.format(checkInDate); // YYYY-MM-DD
                    const hour = parseInt(formatterHour.format(checkInDate));  // 0 - 23

                    if (sessionLocalStr === date) {
                        if (hour >= 6 && hour < 11) shiftCounts.Morning++;
                        else if (hour >= 11 && hour < 16) shiftCounts.Afternoon++;
                        else if (hour >= 16 && hour < 21) shiftCounts.Evening++;
                        else shiftCounts.Night++;
                    }
                }
            }
        });

        // Format for recharts
        const chartData = [
            { shift: "Morning (6 AM - 11 AM)", visitors: shiftCounts.Morning },
            { shift: "(11-4PM)", visitors: shiftCounts.Afternoon },
            { shift: "Evening (4 PM - 9 PM)", visitors: shiftCounts.Evening },
            { shift: "(9-6AM)", visitors: shiftCounts.Night }
        ];

        res.status(200).json({
            success: true,
            message: "Shift analytics retrieved successfully",
            chartData,
            totalVisitors: shiftCounts.Morning + shiftCounts.Afternoon + shiftCounts.Evening + shiftCounts.Night
        });

    } catch (error) {
        console.error('Error fetching shift analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

// @desc    Get detailed user attendance for a specific day
// @route   GET /api/library/:libraryId/attendance-day-details
const getLibraryAttendanceDayDetails = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const role = req.finduser.role;
        const { libraryId } = req.params;
        const { date } = req.query; // YYYY-MM-DD

        if (!date) {
            return res.status(400).json({ message: "Date query parameter is required (YYYY-MM-DD)" });
        }

        const library = await Library.findById(libraryId);
        if (!library) {
            return res.status(404).json({ message: "Library not found" });
        }

        const isOwner = library.ownerId.toString() === userId.toString();
        if (role !== 'admin' && role !== 'co-admin' && !isOwner) {
            return res.status(403).json({ message: "Forbidden: You do not have access" });
        }

        const Attendance = require('../models/Attendance');
        const Subscription = require('../models/Subscription');

        // Sync local UTC mapping with charting endpoint
        const targetStartDate = new Date(`${date}T00:00:00.000Z`);
        const targetEndDate = new Date(`${date}T23:59:59.999Z`);

        // Fetch attendance records and populate user details
        const records = await Attendance.find({ 
            libraryId, 
            date: { $gte: targetStartDate, $lte: targetEndDate } 
        }).populate('userId', 'name email avatar phone');

        const validRecords = records.filter(r => r.userId); // filter out deleted users
        const userIds = validRecords.map(r => r.userId._id);

        // Fetch active subscriptions to get plan information
        const subscriptions = await Subscription.find({
            libraryId,
            userId: { $in: userIds },
            status: 'active'
        });

        // Map sub by userId
        const subMap = new Map();
        subscriptions.forEach(sub => {
            subMap.set(sub.userId.toString(), sub);
        });

        // Format data
        const detailedUsers = validRecords.map(record => {
            const uidStr = record.userId._id.toString();
            const sub = subMap.get(uidStr);

            // Build session details
            const sessionDetails = [];
            if (record.sessions) {
                record.sessions.forEach(session => {
                    if (session.checkInTime) {
                        const inTime = new Date(session.checkInTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                        const outTime = session.checkOutTime 
                            ? new Date(session.checkOutTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                            : 'On Seat Now';
                        const seatNumber = session.seatNumber || 'N/A';
                        sessionDetails.push({ inTime, outTime, seatNumber });
                    }
                });
            }

            return {
                id: uidStr,
                name: record.userId.name,
                email: record.userId.email,
                avatar: record.userId.avatar || '',
                phone: record.userId.phone || 'N/A',
                planName: sub ? (sub.planName || 'Active Plan') : 'No Active Plan',
                totalSessions: record.sessionCount,
                totalMinutes: record.totalDurationToday || 0,
                sessions: sessionDetails
            };
        });

        res.status(200).json({
            success: true,
            message: "Day details retrieved successfully",
            date,
            users: detailedUsers
        });

    } catch (error) {
        console.error('Error fetching attendance day details:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = {
    addLibrary,
    updateLibrary,
    getAllLibraries,
    getLibraryById,
    getMyLibraries,
    getNearbyLibraries,
    deleteLibrary,
    toggleLibraryStatus,
    rateLibrary,
    deleteReview,
    regenerateQRCode,
    generateSeatsForLibrary,
    getLibraryUsers,
    getUserAnalytics,
    getLibraryStatistics,
    updateUserContactInfo,
    getLibraryAttendanceChart,
    getLibraryShiftAnalytics,
    getLibraryAttendanceDayDetails
};

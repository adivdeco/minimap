const Library = require('../models/LibrarySchema');
const Seat = require('../models/Seat');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

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
            limit = 20,
            city,
            state,
            isActive,
            isVerified,
            minRating,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter query
        const filter = {};

        if (city) filter['location.address.city'] = new RegExp(city, 'i');
        if (state) filter['location.address.state'] = new RegExp(state, 'i');
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
        if (minRating) filter['rating.average'] = { $gte: parseFloat(minRating) };
        if (search) {
            filter.$or = [
                { libraryName: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
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
                totalPages: Math.ceil(totalLibraries / parseInt(limit)),
                currentPage: parseInt(page),
                hasNextPage: parseInt(page) * parseInt(limit) < totalLibraries,
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

        const libraries = await Library.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            },
            isActive: true
        }).populate('ownerId', 'name email phone');

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
        console.log(`[Sync] Created ${toInsert.length} new seats for library ${library._id}`);
    }

    if (toDeleteIds.length > 0) {
        // Optional safety: only delete if status is 'Available' or force delete?
        // User expects capacity reduction -> deletion.
        await Seat.deleteMany({ _id: { $in: toDeleteIds } });
        console.log(`[Sync] Deleted ${toDeleteIds.length} excess seats for library ${library._id}`);
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
    generateSeatsForLibrary
};

const Plan = require('../models/Plan');
const Library = require('../models/LibrarySchema');

// Helper to sync plans to the parent Library document (Denormalization)
const syncLibraryPlans = async (libraryId) => {
    try {
        const plans = await Plan.find({ libraryId }).sort({ order: 1, price: 1 });

        // Map to the embedded format expected by LibrarySchema
        const embeddedPlans = plans.map(p => ({
            _id: p._id, // Keep the same ID
            title: p.name, // Map name -> title
            durationInDays: p.durationInDays,
            hoursPerDay: p.hoursPerDay, // Map hoursPerDay
            trialDays: p.trialDays, // Map trialDays
            price: p.price,
            features: p.features
        }));

        await Library.findByIdAndUpdate(libraryId, {
            $set: { plans: embeddedPlans }
        });
    } catch (err) {
        console.error("Failed to sync plans to library:", err);
    }
};

// @desc    Get all plans for a library
// @route   GET /api/plans/library/:libraryId
// @access  Public (Users need to see plans to buy)
exports.getLibraryPlans = async (req, res) => {
    try {
        const { libraryId } = req.params;
        const plans = await Plan.find({ libraryId }).sort({ order: 1, price: 1 });
        res.json(plans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Create a new plan
// @route   POST /api/plans
// @access  Private (Admin/Owner)
exports.createPlan = async (req, res) => {
    try {
        const { libraryId, name, price, durationInDays, hoursPerDay, trialDays, description, features, isPopular } = req.body;
        const userId = req.user._id;
        const role = req.user.role;

        // Verify Ownership
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(libraryId);
            if (!library) return res.status(404).json({ message: "Library not found" });
            if (role !== 'library_owner' || library.ownerId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        const newPlan = await Plan.create({
            libraryId,
            name,
            price,
            durationInDays,
            hoursPerDay: hoursPerDay || 24, // Default to 24 if not provided
            trialDays: trialDays || 0,
            description,
            features,
            isPopular
        });

        // Sync to Library
        await syncLibraryPlans(libraryId);

        res.status(201).json(newPlan);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update a plan
// @route   PUT /api/plans/:id
// @access  Private (Admin/Owner)
exports.updatePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const userId = req.user._id;
        const role = req.user.role;

        const plan = await Plan.findById(id);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        // Verify Ownership (via Library)
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(plan.libraryId);
            if (!library || (role !== 'library_owner' || library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        const updatedPlan = await Plan.findByIdAndUpdate(id, updateData, { new: true });

        // Sync to Library
        await syncLibraryPlans(plan.libraryId);

        res.json(updatedPlan);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Delete a plan
// @route   DELETE /api/plans/:id
// @access  Private (Admin/Owner)
exports.deletePlan = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const role = req.user.role;

        const plan = await Plan.findById(id);
        if (!plan) return res.status(404).json({ message: "Plan not found" });

        // Verify Ownership
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(plan.libraryId);
            if (!library || (role !== 'library_owner' || library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: "Access denied" });
            }
        }

        const libraryId = plan.libraryId; // Save ID before delete
        await Plan.findByIdAndDelete(id);

        // Sync to Library
        await syncLibraryPlans(libraryId);

        res.json({ message: "Plan deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

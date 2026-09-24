const FloorElement = require('../models/FloorElement');
const Library = require('../models/LibrarySchema');

// @desc    Get all floor elements for a library
// @route   GET /api/floor-elements/library/:libraryId
const getFloorElements = async (req, res) => {
    try {
        const { libraryId } = req.params;
        const elements = await FloorElement.find({ libraryId }).lean();
        res.json(elements);
    } catch (err) {
        console.error('Error fetching floor elements:', err);
        res.status(500).json({ message: 'Failed to fetch floor elements' });
    }
};

// @desc    Add a new floor element
// @route   POST /api/floor-elements
const addFloorElement = async (req, res) => {
    try {
        const { libraryId, type, x, y, width, height, rotation, label } = req.body;
        const userId = req.user._id;
        const role = req.user.role;

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const element = await FloorElement.create({
            libraryId,
            type,
            x: x || 0,
            y: y || 0,
            width: width || 80,
            height: height || 20,
            rotation: rotation || 0,
            label: label || ''
        });

        res.status(201).json(element);
    } catch (err) {
        console.error('Error adding floor element:', err);
        res.status(500).json({ message: 'Failed to add floor element' });
    }
};

// @desc    Update floor element positions/properties in bulk
// @route   PUT /api/floor-elements/positions
const updateFloorElementPositions = async (req, res) => {
    try {
        const { elements } = req.body; // Array of { id, x, y, width, height, rotation, label }
        const userId = req.user._id;
        const role = req.user.role;

        if (!Array.isArray(elements) || elements.length === 0) {
            return res.status(400).json({ message: 'No element data provided' });
        }

        // Permission check on first element
        const firstElement = await FloorElement.findById(elements[0].id);
        if (!firstElement) return res.status(404).json({ message: 'Element not found' });

        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(firstElement.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        const bulkOps = elements.map(el => ({
            updateOne: {
                filter: { _id: el.id },
                update: {
                    $set: {
                        x: el.x,
                        y: el.y,
                        ...(el.width !== undefined && { width: el.width }),
                        ...(el.height !== undefined && { height: el.height }),
                        ...(el.rotation !== undefined && { rotation: el.rotation }),
                        ...(el.label !== undefined && { label: el.label })
                    }
                }
            }
        }));

        await FloorElement.bulkWrite(bulkOps);
        res.json({ success: true, message: 'Floor elements saved' });
    } catch (err) {
        console.error('Error updating floor element positions:', err);
        res.status(500).json({ message: 'Failed to save floor elements' });
    }
};

// @desc    Delete a floor element
// @route   DELETE /api/floor-elements/:id
const deleteFloorElement = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const role = req.user.role;

        const element = await FloorElement.findById(id);
        if (!element) return res.status(404).json({ message: 'Element not found' });

        // Permission check
        if (role !== 'admin' && role !== 'co-admin') {
            const library = await Library.findById(element.libraryId);
            if (!library || (role === 'library_owner' && library.ownerId.toString() !== userId.toString())) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }

        await FloorElement.findByIdAndDelete(id);
        res.json({ success: true, message: 'Element deleted' });
    } catch (err) {
        console.error('Error deleting floor element:', err);
        res.status(500).json({ message: 'Failed to delete element' });
    }
};

module.exports = {
    getFloorElements,
    addFloorElement,
    updateFloorElementPositions,
    deleteFloorElement
};

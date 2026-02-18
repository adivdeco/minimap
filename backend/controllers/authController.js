const User = require('../models/User');
const bcrypt = require('bcryptjs');
const validateuser = require('../utils/validators');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "secretkey";
const JWT_EXPIRY = 60 * 60 * 24 * 7; // ~16 days

// Cookie options
// Cookie options
const getCookieOptions = () => {
    return {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
        path: '/'
    };
};

// @desc    Register new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        validateuser(req.body);

        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email is already registered, try with different email"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: 'User',
            loginProvider: 'local',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
        });

        const token = jwt.sign(
            { userId: user._id, email: email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        // Cookie options
        const options = getCookieOptions();
        res.cookie('token', token, options);

        res.status(200).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            message: "Registration successful"
        });

    } catch (error) {
        console.error('Error in registerUser:', error);
        res.status(500).json({ message: error.message || 'Internal server error' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required",
                field: !email ? "email" : "password"
            });
        }

        // IMPORTANT: Must select('+password') because password has select: false in schema
        const user = await User.findOne({ email }).select('+password')
            .populate({
                path: 'studentDetails.currentSubscription.libraryId',
                select: 'libraryName location'
            })
            .populate({
                path: 'studentDetails.currentSubscription.subscriptionId',
                select: 'planId planName pricePaid status startDate expiryDate',
                populate: {
                    path: 'planId',
                    model: 'Plan',
                    select: 'name durationInDays'
                }
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "No account found with this email",
                field: "email"
            });
        }

        // Check if user logged in with social provider (not local/email)
        // const isLocalProvider = user.loginProvider !== 'local' || user.loginProvider === 'email';
        if (!user.password) {
            return res.status(401).json({
                success: false,
                error: "This account uses Google login. Please use Google to sign in.",
                field: "password"
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({
                success: false,
                error: "Incorrect password",
                field: "password"
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        const options = getCookieOptions();
        res.cookie('token', token, options);

        res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar || '',
                studentDetails: user.studentDetails,
                createdAt: user.createdAt
            },
            message: "Login successful"
        });

    } catch (error) {
        console.error('Error in loginUser:', error);
        res.status(500).json({
            success: false,
            error: "An unexpected error occurred during login"
        });
    }
};

// @desc    Social/Google login
// @route   POST /api/auth/google
const { OAuth2Client } = require('google-auth-library');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "dummy_client_id";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

if (!process.env.GOOGLE_CLIENT_ID) {
    console.warn("WARNING: GOOGLE_CLIENT_ID is not set in .env. Google Auth will not work.");
}

const socialLogin = async (req, res) => {
    try {
        const { credential, clientId, auth0User } = req.body;

        let email, name, picture, googleId, email_verified;

        if (auth0User) {
            // AUTH0 FLOW
            email = auth0User.email;
            name = auth0User.name;
            picture = auth0User.picture;
            googleId = auth0User.sub; // Auth0 sub is unique ID (e.g., "google-oauth2|123456")
            email_verified = auth0User.email_verified;
        } else if (credential) {
            // GOOGLE DIRECT FLOW
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            email = payload.email;
            name = payload.name;
            picture = payload.picture;
            googleId = `google|${payload.sub}`;
            email_verified = payload.email_verified;
        } else {
            return res.status(400).json({ message: "No credential or user data provided" });
        }

        let user = await User.findOne({
            $or: [{ auth0Id: googleId }, { email: email }]
        });

        if (user) {
            // Update existing user with Google/Auth0 info if missing
            if (!user.auth0Id) {
                user.auth0Id = googleId;
                user.loginProvider = 'google'; // or 'auth0'
                if (!user.avatar && picture) user.avatar = picture;
                await user.save();
            }
        } else {
            // Create new user
            user = await User.create({
                name,
                email,
                auth0Id: googleId,
                avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
                loginProvider: 'google',
                role: 'User',
                password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
                emailVerified: email_verified
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        const options = getCookieOptions();
        res.cookie('token', token, options);

        res.status(200).json({
            success: true,
            message: "Social login successful",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar
            }
        });

    } catch (error) {
        console.error('Error in socialLogin:', error);
        res.status(401).json({ message: 'Authentication failed', error: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logoutUser = async (req, res) => {
    try {
        res.cookie('token', null, { expires: new Date(Date.now()), path: '/' });

        res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Error: " + err.message
        });
    }
};

// @desc    Check if user is logged in
// @route   GET /api/auth/check-session
const checkSession = async (req, res) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(200).json({ user: null });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate({
                path: 'studentDetails.currentSubscription.libraryId',
                select: 'libraryName location'
            })
            .populate({
                path: 'studentDetails.currentSubscription.subscriptionId',
                select: 'planId planName pricePaid status startDate expiryDate',
                populate: {
                    path: 'planId',
                    model: 'Plan',
                    select: 'name durationInDays'
                }
            });

        if (!user) {
            return res.status(200).json({ user: null });
        }

        res.status(200).json({ user });
    } catch (error) {
        res.status(200).json({ user: null });
    }
};

// @desc    Get all users (Admin/Co-Admin only)
// @route   GET /api/auth/users
const allUsers = async (req, res) => {
    try {
        const role = req.finduser.role;

        if (role !== 'co-admin' && role !== 'admin') {
            return res.status(403).json({
                message: "Forbidden: You do not have access to view all users"
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Filter options
        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        if (req.query.search) {
            filter.$or = [
                { name: new RegExp(req.query.search, 'i') },
                { email: new RegExp(req.query.search, 'i') }
            ];
        }

        const totalUsers = await User.countDocuments(filter);
        const users = await User.find(filter)
            .select('-password')
            .populate('studentDetails.currentSubscription.libraryId', 'libraryName')
            .populate('studentDetails.assignedSeat.seatId', 'seatNumber category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            message: "Users retrieved successfully",
            users,
            pagination: {
                total: totalUsers,
                totalPages: Math.ceil(totalUsers / limit),
                currentPage: page,
                hasNextPage: page * limit < totalUsers,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

// @desc    Update user (Admin/Co-Admin only)
// @route   PUT /api/auth/users/:id
const updateUser = async (req, res) => {
    try {
        const role = req.finduser.role;

        if (role !== 'co-admin' && role !== 'admin') {
            return res.status(403).json({
                message: "Forbidden: You do not have access to update users"
            });
        }

        const { id } = req.params;
        const updateData = req.body;

        // Only admin can change roles
        if (updateData.role && req.finduser.role !== 'admin') {
            return res.status(403).json({
                message: 'Forbidden: Only admin can change user roles'
            });
        }

        // Don't allow password update through this route
        delete updateData.password;

        // Flatten studentDetails to allow partial updates (preserve idCardImage etc)
        if (updateData.studentDetails) {
            const details = updateData.studentDetails;
            delete updateData.studentDetails;

            // Helper to flatten specifically for this known structure
            if (details.currentSubscription) {
                updateData['studentDetails.currentSubscription'] = details.currentSubscription;
            }
            if (details.assignedSeat) {
                updateData['studentDetails.assignedSeat'] = details.assignedSeat;
            }
        }

        const user = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
            .select('-password')
            .populate('studentDetails.currentSubscription.libraryId', 'libraryName')
            .populate('studentDetails.assignedSeat.seatId', 'seatNumber category');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: "User updated successfully",
            user
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
};

// @desc    Delete user (Admin/Co-Admin only)
// @route   DELETE /api/auth/users/:id
const deleteUser = async (req, res) => {
    try {
        const role = req.finduser.role;

        if (role !== 'co-admin' && role !== 'admin') {
            return res.status(403).json({
                message: "Forbidden: You do not have access to delete users"
            });
        }

        const { id } = req.params;

        // Prevent deleting yourself
        if (id === req.finduser._id.toString()) {
            return res.status(400).json({ message: "You cannot delete your own account" });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only admin can delete other admins
        if (user.role === 'admin' && req.finduser.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Only admin can delete admin accounts" });
        }

        await User.findByIdAndDelete(id);

        res.status(200).json({
            message: "User deleted successfully",
            deletedUser: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};

// @desc    Update own profile
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const updateData = req.body;

        // Fields that users can update themselves
        const allowedFields = ['name', 'phone', 'avatar', 'addresses', 'preferences'];
        const filteredData = {};

        for (const key of allowedFields) {
            if (updateData[key] !== undefined) {
                filteredData[key] = updateData[key];
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: filteredData },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            message: "Profile updated successfully",
            user
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: "Error updating profile", error: error.message });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
const changePassword = async (req, res) => {
    try {
        const userId = req.finduser._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters" });
        }

        const user = await User.findById(userId).select('+password');

        if (!user.password) {
            return res.status(400).json({ message: "This account uses social login. Password cannot be changed." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.status(200).json({ message: "Password changed successfully" });

    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: "Error changing password", error: error.message });
    }
};

module.exports = {
    registerUser,
    loginUser,
    socialLogin,
    logoutUser,
    checkSession,
    allUsers,
    updateUser,
    deleteUser,
    updateProfile,
    changePassword
};

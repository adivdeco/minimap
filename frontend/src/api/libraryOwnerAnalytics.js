/**
 * Library Owner Analytics API Client
 * Utility functions for managing library users and analytics
 */

import axiosClient from './axiosClient';


/**
 * Get all users in a library with pagination and filtering
 */
export const getLibraryUsers = async (libraryId, filters = {}) => {
    try {
        const params = {
            page: filters.page || 1,
            limit: filters.limit || 20,
            status: filters.status || 'all',
            sortBy: filters.sortBy || 'createdAt',
            sortOrder: filters.sortOrder || 'desc',
            ...(filters.search && { search: filters.search })
        };

        const response = await axiosClient.get(`/library/${libraryId}/users`, {
            params
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get detailed analytics for a specific user in a library
 */
export const getUserAnalytics = async (libraryId, userId) => {
    try {
        const response = await axiosClient.get(
            `/library/${libraryId}/user/${userId}/analytics`
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get comprehensive library statistics
 */
export const getLibraryStatistics = async (libraryId) => {
    try {
        const response = await axiosClient.get(
            `/library/${libraryId}/statistics`
        );
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * Export user data to CSV format
 */
export const exportUsersToCSV = (users, libraryName) => {
    const headers = [
        'User Name',
        'Email',
        'Phone',
        'Plan',
        'Subscription Status',
        'Start Date',
        'Expiry Date',
        'Total Sessions',
        'Total Hours',
        'First Visit',
        'Last Visit',
        'Amount Paid'
    ];

    const csvContent = [
        headers.join(','),
        ...users.map(user =>
            [
                `"${user.userName}"`,
                `"${user.email}"`,
                `"${user.phone}"`,
                `"${user.subscription.planName}"`,
                user.subscription.status,
                new Date(user.subscription.startDate).toLocaleDateString(),
                new Date(user.subscription.expiryDate).toLocaleDateString(),
                user.attendance.totalSessions,
                user.attendance.totalHoursUsed,
                user.attendance.firstVisit ? new Date(user.attendance.firstVisit).toLocaleDateString() : 'N/A',
                user.attendance.lastVisit ? new Date(user.attendance.lastVisit).toLocaleDateString() : 'N/A',
                user.subscription.pricePaid
            ].join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${libraryName}_users_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

/**
 * Export analytics to PDF format (requires jsPDF library)
 */
export const exportAnalyticsToPDF = (analytics, libraryName) => {
    try {
        // This requires jsPDF library to be installed
        // npm install jspdf
        // import jsPDF from 'jspdf';

        const doc = new window.jsPDF();

        // Title
        doc.setFontSize(16);
        doc.text(`${libraryName} - User Analytics`, 20, 20);

        // User Info
        doc.setFontSize(12);
        doc.text(`User: ${analytics.user.name}`, 20, 40);
        doc.text(`Email: ${analytics.user.email}`, 20, 50);
        doc.text(`Phone: ${analytics.user.phone}`, 20, 60);

        // Subscription Info
        doc.text(`Plan: ${analytics.subscription.planName}`, 20, 80);
        doc.text(`Status: ${analytics.subscription.status}`, 20, 90);
        doc.text(`Amount Paid: ₹${analytics.subscription.pricePaid}`, 20, 100);

        // Analytics
        doc.text(`Total Sessions: ${analytics.analytics.totalSessions}`, 20, 120);
        doc.text(`Total Hours: ${analytics.analytics.totalHoursUsed}`, 20, 130);
        doc.text(`Average Session Duration: ${analytics.analytics.averageSessionDuration} mins`, 20, 140);

        doc.save(`${analytics.user.name}_analytics.pdf`);
    } catch (error) {
        console.error('PDF export requires jsPDF library:', error);
        alert('Please install jsPDF library to export to PDF: npm install jspdf');
    }
};

/**
 * Format currency to Indian Rupees
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
};

/**
 * Format hours from minutes
 */
export const formatHours = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
};

/**
 * Get status badge color
 */
export const getStatusColor = (status) => {
    const colors = {
        active: '#10b981',
        expired: '#ef4444',
        cancelled: '#6b7280'
    };
    return colors[status] || '#9ca3af';
};

/**
 * Get subscription status information
 */
export const getSubscriptionInfo = (subscription) => {
    const now = new Date();
    const expiryDate = new Date(subscription.expiryDate);
    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    return {
        isActive: subscription.status === 'active' && daysRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        isExpiringSoon: daysRemaining > 0 && daysRemaining <= 7,
        isExpired: daysRemaining <= 0 || subscription.status !== 'active'
    };
};

/**
 * Calculate user engagement score (0-100)
 */
export const calculateEngagementScore = (user) => {
    let score = 0;

    // Sessions score (max 30)
    const sessionsScore = Math.min(30, (user.attendance.totalSessions / 20) * 30);

    // Hours score (max 30)
    const hoursScore = Math.min(30, (user.attendance.totalHoursUsed / 100) * 30);

    // Consistency score (max 40) - based on visit frequency
    const daysSinceFirstVisit = user.attendance.firstVisit
        ? Math.ceil((new Date() - new Date(user.attendance.firstVisit)) / (1000 * 60 * 60 * 24))
        : 1;

    const visitFrequency = daysSinceFirstVisit > 0
        ? user.attendance.totalSessions / daysSinceFirstVisit
        : 0;

    const consistencyScore = Math.min(40, visitFrequency * 10);

    score = sessionsScore + hoursScore + consistencyScore;

    return Math.round(Math.min(100, Math.max(0, score)));
};

/**
 * Get engagement level label
 */
export const getEngagementLevel = (score) => {
    if (score >= 80) return { label: 'Excellent', color: '#10b981' };
    if (score >= 60) return { label: 'Good', color: '#3b82f6' };
    if (score >= 40) return { label: 'Fair', color: '#f59e0b' };
    if (score >= 20) return { label: 'Poor', color: '#ef4444' };
    return { label: 'Very Low', color: '#6b7280' };
};

/**
 * Generate insights from user data
 */
export const generateUserInsights = (analytics) => {
    const insights = [];

    // Session frequency insight
    if (analytics.analytics.totalSessions > 15) {
        insights.push({
            type: 'positive',
            message: 'Highly engaged user with frequent visits'
        });
    } else if (analytics.analytics.totalSessions < 3) {
        insights.push({
            type: 'warning',
            message: 'User has minimal engagement - consider reaching out'
        });
    }

    // Session duration insight
    if (analytics.analytics.averageSessionDuration > 120) {
        insights.push({
            type: 'info',
            message: 'User typically stays for longer sessions (2+ hours)'
        });
    } else if (analytics.analytics.averageSessionDuration < 30) {
        insights.push({
            type: 'info',
            message: 'User prefers shorter study sessions'
        });
    }

    // Subscription status insight
    if (analytics.subscription.status === 'active' && analytics.subscription.daysRemaining <= 7) {
        insights.push({
            type: 'warning',
            message: `Subscription expiring in ${analytics.subscription.daysRemaining} days`
        });
    }

    // Attendance pattern
    const daysSinceLastVisit = analytics.analytics.lastVisit
        ? Math.floor((new Date() - new Date(analytics.analytics.lastVisit)) / (1000 * 60 * 60 * 24))
        : null;

    if (daysSinceLastVisit && daysSinceLastVisit > 7) {
        insights.push({
            type: 'warning',
            message: `User hasn't visited in ${daysSinceLastVisit} days`
        });
    }

    return insights;
};

/**
 * Create comparison between two users
 */
export const compareUsers = (user1, user2) => {
    return {
        sessions: {
            user1: user1.attendance.totalSessions,
            user2: user2.attendance.totalSessions,
            difference: user1.attendance.totalSessions - user2.attendance.totalSessions
        },
        hours: {
            user1: user1.attendance.totalHoursUsed,
            user2: user2.attendance.totalHoursUsed,
            difference: user1.attendance.totalHoursUsed - user2.attendance.totalHoursUsed
        },
        engagement: {
            user1: calculateEngagementScore(user1),
            user2: calculateEngagementScore(user2)
        }
    };
};

export default {
    getLibraryUsers,
    getUserAnalytics,
    getLibraryStatistics,
    exportUsersToCSV,
    exportAnalyticsToPDF,
    formatCurrency,
    formatHours,
    getStatusColor,
    getSubscriptionInfo,
    calculateEngagementScore,
    getEngagementLevel,
    generateUserInsights,
    compareUsers
};

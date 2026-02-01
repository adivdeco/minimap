import { z } from "zod";

export const UserUpdateSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    role: z.enum(["User", "admin", "co-admin", "library_owner"]),
    address: z.object({
        street: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        pincode: z.string().optional(),
        country: z.string().optional(),
    }).optional(),
    // We will just validate that if Library Owner details are present, they are objects/strings as expected
    // but not strictly require them since they are optional based on role
    libraryOwnerDetails: z.object({
        gstNumber: z.string().optional(),
        businessPan: z.string().optional(),
    }).optional(),
    avatar: z.string().optional(),
    // Access Control & Subscription for Admins
    studentDetails: z.object({
        currentSubscription: z.object({
            status: z.enum(['active', 'expired', 'pending', 'cancelled']).optional(),
            startDate: z.string().optional().or(z.date().optional()), // Form might pass string
            expiryDate: z.string().optional().or(z.date().optional()),
            planId: z.string().optional(),
        }).optional(),
        assignedSeat: z.object({
            seatNumber: z.string().optional(),
        }).optional(),
    }).optional(),
});

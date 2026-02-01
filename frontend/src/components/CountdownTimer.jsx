import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const CountdownTimer = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = new Date(targetDate) - new Date();

        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                hours: Math.floor((difference / (1000 * 60 * 60))),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        } else {
            return null; // Expired
        }

        return timeLeft;
    }

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (!remaining) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    if (!timeLeft) {
        return <span className="text-red-500 font-bold">Time Expired</span>;
    }

    // Format numbers to always have 2 digits
    const pad = (n) => n.toString().padStart(2, '0');

    return (
        <div className="flex items-center gap-2 text-2xl font-mono font-bold text-white bg-black/20 px-4 py-2 rounded-lg border border-white/10">
            <Clock className="text-purple-400 animate-pulse" size={24} />
            <div className="flex items-baseline gap-1">
                <span>{pad(timeLeft.hours)}</span>
                <span className="text-sm text-gray-400">h</span>
                <span>:</span>
                <span>{pad(timeLeft.minutes)}</span>
                <span className="text-sm text-gray-400">m</span>
                <span>:</span>
                <span>{pad(timeLeft.seconds)}</span>
                <span className="text-sm text-gray-400">s</span>
            </div>
        </div>
    );
};

export default CountdownTimer;

import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import CoordinatorDailyTodo from './CoordinatorDailyTodo';
import CoordinatorGreeting from './CoordinatorGreeting';
import CoordinatorOverviewInsights from './CoordinatorOverviewInsights';

const DedicatedCoordinatorOverview = ({ selectedBusiness, selectedBatch }) => {
    const [loading, setLoading] = useState(false);
    const [syncKey, setSyncKey] = useState(0);

    const handleSync = async () => {
        setLoading(true);
        try {
            setSyncKey(k => k + 1);
        } finally {
            setTimeout(() => setLoading(false), 600);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-10 max-h-screen overflow-y-auto custom-scrollbar pb-32 bg-[#020617] min-h-screen">
            {/* Greeting (replaces the old Command Center header + coordinator name card) */}
            <CoordinatorGreeting
                businessId={selectedBusiness}
                batchId={selectedBatch}
                onSync={handleSync}
                syncing={loading}
            />

            {/* Campaign tiles 4: Row 1 (After Seminar CRM | Free Seminar CRM), Row 2 (Open Seminar | New Inquiries) */}
            <div className="relative z-10">
                <CoordinatorDailyTodo selectedBusiness={selectedBusiness} selectedBatch={selectedBatch} hideHeader />
            </div>

            {/* Today · pending · performance · 7-day calls · messages (all charts, my data only) */}
            <CoordinatorOverviewInsights
                selectedBusiness={selectedBusiness}
                selectedBatch={selectedBatch}
                refreshKey={syncKey}
            />
        </div>
    );
};

export default DedicatedCoordinatorOverview;


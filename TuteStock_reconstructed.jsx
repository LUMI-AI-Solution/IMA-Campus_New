                lecs.get(lecName).businesses.add(bizName);
                lecs.get(lecName).subjects.add(subName);
            }
        });

        // Merge from MasterTutes
        masterTutes.forEach(mt => {
            if (lecs.has(mt.name)) {
                const existing = lecs.get(mt.name);
                existing.masterId = mt.id;
                if (!existing.image || existing.image === 'null' || existing.image === 'default.png') {
                    existing.image = mt.image;
                }
            } else {
                lecs.set(mt.name, {
                    name: mt.name,
                    image: mt.image,
                    businesses: new Set(),
                    subjects: new Set(),
                    masterId: mt.id
                });
            }
        });
        
        return Array.from(lecs.values()).map(l => ({
            ...l,
            businessText: Array.from(l.businesses).join(', '),
            subjectText: Array.from(l.subjects).join(', ')
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [globalStock, masterTutes]);

            setMasterTutes(tuteRes.data || []);
        } catch { toast.error("Failed to load data"); } 
        finally { setLoading(false); }
    };

    // Derived Data for Drill-Down
    const lecturers = useMemo(() => {
        const lecs = new Map();
        
        // Add all from globalStock
        globalStock.forEach(s => {
            const lecName = s.course?.lecturerName || "Unknown Lecturer";
            const bizName = s.course?.group?.batch?.business?.name || "Unknown Business";
            const subName = s.course?.name || "Unknown Subject";
            
            if (!lecs.has(lecName)) {
                let lecImg = null;
                const gpArr = typeof s.course?.groupPrices === 'string' ? JSON.parse(s.course.groupPrices) : (s.course?.groupPrices || []);
                const match = gpArr.find(g => g.groupId == s.course?.group?.id);
                if (match?.lecturerImage) lecImg = match.lecturerImage;
                else lecImg = gpArr.find(g => g.lecturerImage)?.lecturerImage;
                
                lecs.set(lecName, { 
                    name: lecName, 
                    image: lecImg,
                    businesses: new Set([bizName]),
                    subjects: new Set([subName]),
                    masterId: null // will be linked if matches
                });
            } else {
                lecs.get(lecName).businesses.add(bizName);

    const paymentGroups = useMemo(() => {
        if (viewLevel < 2 || !selectedLecturer || !globalStock.length) return [];
        const pgs = new Set();
        globalStock.forEach(s => {
            const lec = s.course?.lecturerName || "Unknown Lecturer";
            if (lec === selectedLecturer.name) {
                pgs.add(s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown');
            }
        });
        return Array.from(pgs).sort();
    }, [globalStock, selectedLecturer, viewLevel]);

    const finalStocks = useMemo(() => {
        if (viewLevel < 3 || !selectedPaymentGroup || !globalStock.length) return [];
        return globalStock.filter(s => {
            const lec = s.course?.lecturerName || "Unknown Lecturer";
            const pg = s.course?.group?.type === 1 ? 'Monthly' : s.course?.group?.type === 2 ? 'Full Payment' : 'Unknown';
            return lec === selectedLecturer.name && pg === selectedPaymentGroup;
        });
    }, [globalStock, selectedLecturer, selectedPaymentGroup, viewLevel]);

    // Navigation Handlers
    const handleLecturerClick = (lec) => {
        setSelectedLecturer(lec);
        setSelectedPaymentGroup(null);
        setViewLevel(2);
    };

    const handlePaymentGroupClick = (pg) => {
        setSelectedPaymentGroup(pg);

const fs = require('fs');
const filePath = '/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. handleCreateMonth
const createMonthOld = `  const handleCreateMonth = () => {
    if (!newMonthName) return toast.error("Month name required (e.g. June 2026)");
    setMonths([newMonthName, ...months]);
    setSelectedMonth(newMonthName);
    setNewMonthName('');
    setShowNewMonthModal(false);
  };`;

const createMonthNew = `  const handleCreateMonth = async () => {
    if (!newMonthName) return toast.error("Month name required (e.g. June 2026)");
    try {
        await api.post('/ai-verification/months', { month: newMonthName });
        toast.success("Month created successfully");
        setNewMonthName('');
        setShowNewMonthModal(false);
        fetchMonths();
        setSelectedMonth(newMonthName);
    } catch(err) {
        toast.error("Failed to create month");
    }
  };
  
  const handleDeleteMonth = async () => {
      if (!selectedMonth) return toast.error("Please select a month to delete");
      if (!window.confirm(\`Are you sure you want to delete \${selectedMonth} and its configuration?\`)) return;
      try {
          await api.delete(\`/ai-verification/months/\${selectedMonth}\`);
          toast.success("Month deleted successfully");
          setSelectedMonth('');
          fetchMonths();
      } catch(err) {
          toast.error("Failed to delete month");
      }
  };`;

content = content.replace(createMonthOld, createMonthNew);

// 2. Add Delete icon next to "+ New Month" button
// Wait, the "New Month" button is at the top right of Bank Statement Vault.
const newMonthBtnOld = `<button onClick={() => setShowNewMonthModal(true)} className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-2 bg-gray-800 text-gray-300 hover:bg-gray-700 transition border border-gray-700">
                            <Plus size={14} /> New Month
                        </button>`;
const newMonthBtnNew = `<button onClick={() => setShowNewMonthModal(true)} className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-2 bg-gray-800 text-gray-300 hover:bg-gray-700 transition border border-gray-700">
                            <Plus size={14} /> New Month
                        </button>
                        {selectedMonth && (
                            <button onClick={handleDeleteMonth} className="text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-2 bg-red-900/40 text-red-400 hover:bg-red-800/60 transition border border-red-900/50" title="Delete Selected Month">
                                <Trash2 size={14} /> Delete Month
                            </button>
                        )}`;
content = content.replace(newMonthBtnOld, newMonthBtnNew);

// 3. REMOVE RESULTS SECTION
const resultsStartStr = '{/* RESULTS SECTION */}';
const resultsEndStr = '{/* --- END RIGHT COLUMN --- */}';

const startIndex = content.indexOf(resultsStartStr);
const endIndex = content.indexOf(resultsEndStr);

if (startIndex !== -1 && endIndex !== -1) {
    content = content.slice(0, startIndex) + content.slice(endIndex);
    console.log("Successfully removed RESULTS SECTION");
} else {
    console.error("Could not find RESULTS SECTION boundaries");
}

fs.writeFileSync(filePath, content);
console.log('UI updated for month management.');

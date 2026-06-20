const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

// I will insert states for tree
const stateInsert = `
  const [gsheetTree, setGsheetTree] = useState({ "Default Folder": {} });
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newMonthName, setNewMonthName] = useState('');
  const [newSheetLink, setNewSheetLink] = useState('');

  const fetchGsheetTree = async () => {
    try {
      const res = await api.get('/ai-verification/gsheet-config/tree');
      setGsheetTree(res.data && Object.keys(res.data).length > 0 ? res.data : { "Default Folder": {} });
    } catch (err) {
      console.error(err);
    }
  };

  const saveGsheetTree = async (tree) => {
    try {
      await api.post('/ai-verification/gsheet-config/tree', { configs: tree });
      toast.success("Saved Google Sheets configuration");
    } catch(err) {
      toast.error("Failed to save config");
    }
  };

  useEffect(() => {
    fetchGsheetTree();
  }, []);
`;

if (!code.includes('fetchGsheetTree')) {
    code = code.replace(/const \[activeTab, setActiveTab\] = useState\('pending'\);/, "const [activeTab, setActiveTab] = useState('pending');\n" + stateInsert);
}

// Now replace the tab content
// Search for \`{activeTab === 'settings' && (\` and the Gsheet part inside.
// Actually, it might be better to find the Google Sheets Setup section.
// It starts with something like: <div className="space-y-4"> for GSheet links?
// Let's just output this script to see what we can do.
fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', code);

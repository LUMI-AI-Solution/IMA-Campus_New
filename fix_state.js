const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', 'utf8');

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
    code = code.replace(/const \[activeSettingsTab, setActiveSettingsTab\] = useState\('banks'\);/, "const [activeSettingsTab, setActiveSettingsTab] = useState('banks');\n" + stateInsert);
    fs.writeFileSync('/root/IMA-Campus/frontend/src/components/admin/AISlipVerification.jsx', code);
    console.log("State injected");
} else {
    console.log("State already injected");
}

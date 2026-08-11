const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', 'utf8');

// 1. Add imports
if (!code.includes('import downloadManager')) {
    code = code.replace("import COLORS from '../constants/colors';", "import COLORS from '../constants/colors';\nimport downloadManager from '../services/downloadManager';\nimport { DeviceEventEmitter } from 'react-native';");
}

// 2. Add useEffect for DeviceEventEmitter
const useEffectPattern = `const [downloadingItems, setDownloadingItems] = useState({});`;
const useEffectReplacement = `const [downloadingItems, setDownloadingItems] = useState({});
    
    useEffect(() => {
        // Load active downloads
        const initialDownloads = downloadManager.getActiveDownloads();
        const initialItems = {};
        Object.keys(initialDownloads).forEach(id => {
            initialItems[id] = initialDownloads[id].progress;
        });
        setDownloadingItems(initialItems);

        const onProgress = (data) => {
            setDownloadingItems(prev => ({ ...prev, [data.itemId]: data.progress }));
        };

        const onComplete = (data) => {
            setDownloadingItems(prev => {
                const newState = { ...prev };
                delete newState[data.itemId];
                return newState;
            });
            onShowAlert({ title: "Download Complete", msg: "Video has been saved successfully.", type: "success" });
        };

        const onError = (data) => {
            setDownloadingItems(prev => {
                const newState = { ...prev };
                delete newState[data.itemId];
                return newState;
            });
            onShowAlert({ title: "Download Error", msg: data.errorMsg || "Failed to download the video.", type: "error" });
        };
        
        const onExists = (data) => {
            onShowAlert({ title: "Already Downloaded", msg: "You can find this video in My Downloads section or Play Offline.", type: "warning" });
        };

        const progressSub = DeviceEventEmitter.addListener('DOWNLOAD_PROGRESS', onProgress);
        const completeSub = DeviceEventEmitter.addListener('DOWNLOAD_COMPLETE', onComplete);
        const errorSub = DeviceEventEmitter.addListener('DOWNLOAD_ERROR', onError);
        const existsSub = DeviceEventEmitter.addListener('DOWNLOAD_ALREADY_EXISTS', onExists);

        return () => {
            progressSub.remove();
            completeSub.remove();
            errorSub.remove();
            existsSub.remove();
        };
    }, []);
`;
if (!code.includes("const initialDownloads = downloadManager.getActiveDownloads()")) {
    code = code.replace(useEffectPattern, useEffectReplacement);
}

// 3. Replace handleVideoDownload
const startIdx = code.indexOf('const handleVideoDownload = async (item) => {');
const endString = '} finally {\n            \n            setDownloadingItems(prev => {\n                const newState = { ...prev };\n                delete newState[item.id];\n                return newState;\n            });\n        }\n    };';
const endIdx = code.indexOf(endString, startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const fullEndIdx = endIdx + endString.length;
    
    const newHandleVideoDownload = `const handleVideoDownload = async (item) => {
        downloadManager.startDownload(item, courseTitle);
    };`;
    
    code = code.substring(0, startIdx) + newHandleVideoDownload + code.substring(fullEndIdx);
} else {
    console.error("Could not find handleVideoDownload block!");
    // fallback logic, let's just write what we can or wait.
}

// 4. Add GlobalDownloadWidget
if (!code.includes('<GlobalDownloadWidget />')) {
    if (!code.includes("import GlobalDownloadWidget")) {
        code = code.replace("import COLORS from '../constants/colors';", "import COLORS from '../constants/colors';\nimport GlobalDownloadWidget from '../components/GlobalDownloadWidget';");
    }
    
    // Add right before </SafeAreaView>
    code = code.replace("</SafeAreaView>", "    <GlobalDownloadWidget />\n        </SafeAreaView>");
}

fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', code);
console.log('Modified CourseContentScreen!');

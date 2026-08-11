const fs = require('fs');
let code = fs.readFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', 'utf8');

const startStr = "    const handleVideoDownload = async (item) => {";
const endStr = "    const renderItemCard = (item) => {";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const newFuncs = `    const handleVideoDownload = async (item) => {
        let videoUrl = item.link || item.url || item.file;
        if (!videoUrl) return onShowAlert({ title: "Error", msg: "Invalid video link.", type: "error" });

        const securePath = \`\${secureStoragePath}/f_\${item.id}.dat\`;

        try {
            const res = await AsyncStorage.getItem('my_downloads');
            const existingDownloads = res ? JSON.parse(res) : [];
            const isDownloaded = existingDownloads.find(d => String(d.id) === String(item.id));

            if (isDownloaded) {
                return onShowAlert({ title: "Already Downloaded", msg: "You can find this video in My Downloads section or Play Offline.", type: "warning" });
            } else {
                if (await RNFS.exists(securePath)) {
                    await RNFS.unlink(securePath);
                }
            }
        } catch (e) {
            console.log(e);
        }

        updateGlobalProgress(item.id, 0); // initial state

        // 🔥 Zoom Shareable Link Extractor NATIVE 🔥
        if (videoUrl.includes('zoom.us/rec/share') || videoUrl.includes('zoom.us/rec/play')) {
            updateGlobalProgress(item.id, '...');
            setDownloadingItems(prev => ({ ...prev, [item.id]: true }));
            
            try {
                const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
                
                const res1 = await fetch(videoUrl, { headers: { 'User-Agent': ua } });
                const html1 = await res1.text();
                
                const mIdMatch = html1.match(/meetingId:\\s*'([^']+)'/);
                if (!mIdMatch) throw new Error("Could not find meetingId in Zoom page.");
                const meetingId = mIdMatch[1];
                
                const res2 = await fetch(\`https://zoom.us/nws/recording/1.0/play/share-info/\${meetingId}\`, {
                    headers: { 'User-Agent': ua, 'Referer': videoUrl }
                });
                const json2 = await res2.json();
                if (!json2.result || !json2.result.redirectUrl) throw new Error("Failed to get redirect URL from Zoom API.");
                const redirectUrl = json2.result.redirectUrl;
                
                const res3 = await fetch(\`https://zoom.us\${redirectUrl}\`, {
                    headers: { 'User-Agent': ua, 'Referer': videoUrl }
                });
                const html3 = await res3.text();
                
                const fIdMatch = html3.match(/fileId:\\s*'([^']+)'/);
                if (!fIdMatch) throw new Error("Could not find fileId in Zoom redirect page.");
                const fileId = fIdMatch[1];
                
                const res4 = await fetch(\`https://zoom.us/nws/recording/1.0/play/info/\${fileId}?continueMode=true\`, {
                    headers: { 'User-Agent': ua, 'Referer': \`https://zoom.us\${redirectUrl}\` }
                });
                const json4 = await res4.json();
                if (!json4.result || !json4.result.viewMp4Url) throw new Error("Failed to extract final MP4 URL.");
                
                const finalMp4Url = json4.result.viewMp4Url;
                
                let finalUrl = finalMp4Url;
                let finalHeaders = {
                    'User-Agent': ua,
                    'Referer': \`https://zoom.us\${redirectUrl}\`
                };

                const token = await AsyncStorage.getItem('userToken');

                let downloadConfig = {
                    path: securePath,
                    fileCache: true,
                    overwrite: true,
                    followRedirect: true
                };

                if (Platform.OS === 'ios') {
                    downloadConfig.IOSBackgroundTask = true;
                }

                updateGlobalProgress(item.id, 0);

                const response = await ReactNativeBlobUtil.config(downloadConfig)
                    .fetch('GET', finalUrl, finalHeaders)
                    .progress((received, total) => {
                        if (total > 0) {
                            let percentage = Math.floor((received / total) * 100);
                            updateGlobalProgress(item.id, percentage);
                        } else {
                            updateGlobalProgress(item.id, '...');
                        }
                    });

                let status = response.info().status;
                if (status >= 400) {
                    throw new Error("Server rejected the download.");
                }

                const myDownloads = await AsyncStorage.getItem('my_downloads');
                let downloads = myDownloads ? JSON.parse(myDownloads) : [];

                const itemToSave = {
                    id: item.id,
                    title: item.title || item.fileName || 'Video Lesson',
                    subjectName: item.subjectName || subjectName || 'Subject',
                    type: item.link ? 'video' : 'document',
                    downloadedAt: new Date().toISOString(),
                    fileName: \`f_\${item.id}.dat\`,
                    thumbnail: item.thumbnail
                };

                downloads.push(itemToSave);
                await AsyncStorage.setItem('my_downloads', JSON.stringify(downloads));

                onShowAlert({ title: "Download Complete", msg: "Video has been saved successfully.", type: "success" });

            } catch (error) {
                console.log(error);
                onShowAlert({ title: "Download Error", msg: error.message || "Failed to download the video.", type: "error" });
                if (await RNFS.exists(securePath)) await RNFS.unlink(securePath);
            } finally {
                updateGlobalProgress(item.id, null);
                setDownloadingItems(prev => {
                    const newState = { ...prev };
                    delete newState[item.id];
                    return newState;
                });
            }
            return;
        }

        // For direct MP4/Native API links, use standard backend download (omitted for now since this app uses Zoom heavily)
        // Wait, let's keep the standard download logic for non-zoom URLs.
        try {
            setDownloadingItems(prev => ({ ...prev, [item.id]: true }));
            
            const token = await AsyncStorage.getItem('userToken');
            
            let downloadConfig = {
                path: securePath,
                fileCache: true,
                overwrite: true,
                followRedirect: true
            };

            if (Platform.OS === 'ios') {
                downloadConfig.IOSBackgroundTask = true;
            }
            
            let finalHeaders = {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
            };
            
            if (!videoUrl.includes('zoom.us') && !videoUrl.includes('cloudfront.net') && !videoUrl.includes('awssdk.com')) {
                finalHeaders['Authorization'] = \`Bearer \${token}\`;
            }

            const response = await ReactNativeBlobUtil.config(downloadConfig)
                .fetch('GET', videoUrl, finalHeaders)
                .progress((received, total) => {
                    if (total > 0) {
                        let percentage = Math.floor((received / total) * 100);
                        updateGlobalProgress(item.id, percentage);
                    } else {
                        updateGlobalProgress(item.id, '...');
                    }
                });

            let status = response.info().status;
            if (status >= 400) {
                throw new Error("Server rejected the download.");
            }

            const myDownloads = await AsyncStorage.getItem('my_downloads');
            let downloads = myDownloads ? JSON.parse(myDownloads) : [];

            const itemToSave = {
                id: item.id,
                title: item.title || item.fileName || 'Video Lesson',
                subjectName: item.subjectName || subjectName || 'Subject',
                type: item.link ? 'video' : 'document',
                downloadedAt: new Date().toISOString(),
                fileName: \`f_\${item.id}.dat\`,
                thumbnail: item.thumbnail
            };

            downloads.push(itemToSave);
            await AsyncStorage.setItem('my_downloads', JSON.stringify(downloads));

            onShowAlert({ title: "Download Complete", msg: "Item has been saved successfully.", type: "success" });

        } catch (error) {
            console.log(error);
            onShowAlert({ title: "Download Error", msg: error.message || "Failed to download.", type: "error" });
            if (await RNFS.exists(securePath)) await RNFS.unlink(securePath);
        } finally {
            updateGlobalProgress(item.id, null);
            setDownloadingItems(prev => {
                const newState = { ...prev };
                delete newState[item.id];
                return newState;
            });
        }
    };

`;
    code = code.substring(0, startIdx) + newFuncs + code.substring(endIdx);
    fs.writeFileSync('/root/IMA-Campus/MobileApp/src/screens/CourseContentScreen.jsx', code);
    console.log('Fixed correctly!');
} else {
    console.log('Could not find indices', startIdx, endIdx);
}

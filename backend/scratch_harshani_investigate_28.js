const fs = require('fs');

const mainLayoutPath = '/root/IMA-Campus/frontend/src/components/layouts/MainLayout.jsx';
let mainLayout = fs.readFileSync(mainLayoutPath, 'utf8');

// If zoom is not applied, let's inject a zoom style into the main div
if (!mainLayout.includes('style={{ zoom:')) {
    mainLayout = mainLayout.replace(
        '<div className={`font-sans flex items-center justify-center w-full overflow-hidden antialiased text-gray-100 transition-all duration-1000 fixed inset-0 m-0 p-0 ${getBackgroundClass()}`} style={getBackgroundStyle()}>',
        `
        const getZoomLevel = () => {
          if (window.innerWidth <= 1024) return 0.75;
          if (window.innerWidth <= 1280) return 0.85;
          if (window.innerWidth <= 1440) return 0.9;
          return 1;
        };
        const [zoomLevel, setZoomLevel] = useState(1);
        
        useEffect(() => {
          setZoomLevel(getZoomLevel());
          const handleResize = () => setZoomLevel(getZoomLevel());
          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        }, []);

        return (
        <div className={\`font-sans flex items-center justify-center w-full overflow-hidden antialiased text-gray-100 transition-all duration-1000 fixed inset-0 m-0 p-0 \${getBackgroundClass()}\`} style={{ ...getBackgroundStyle(), zoom: zoomLevel }}>
        `
    );
    
    // Need to make sure we don't break existing return (
    mainLayout = mainLayout.replace('return (', ''); // Wait, the replace above replaces the whole div, but I also need to insert the hooks BEFORE the return.
    
    // Safer way:
    let parts = mainLayout.split('return (');
    if (parts.length >= 2) {
        let beforeReturn = parts[0];
        let afterReturn = parts.slice(1).join('return (');
        
        let newBefore = beforeReturn + `
  const getZoomLevel = () => {
    if (window.innerWidth <= 1024) return 0.75;
    if (window.innerWidth <= 1366) return 0.85;
    if (window.innerWidth <= 1440) return 0.9;
    return 1;
  };
  const [zoomLevel, setZoomLevel] = useState(1);
  useEffect(() => {
    setZoomLevel(getZoomLevel());
    const handleResizeZoom = () => setZoomLevel(getZoomLevel());
    window.addEventListener('resize', handleResizeZoom);
    return () => window.removeEventListener('resize', handleResizeZoom);
  }, []);
  
`;
        let newAfter = afterReturn.replace(
            '<div className={`font-sans flex items-center justify-center w-full overflow-hidden antialiased text-gray-100 transition-all duration-1000 fixed inset-0 m-0 p-0 ${getBackgroundClass()}`} style={getBackgroundStyle()}>',
            '<div className={`font-sans flex items-center justify-center w-full overflow-hidden antialiased text-gray-100 transition-all duration-1000 fixed inset-0 m-0 p-0 ${getBackgroundClass()}`} style={{ ...getBackgroundStyle(), zoom: zoomLevel }}>'
        );
        fs.writeFileSync(mainLayoutPath, newBefore + 'return (' + newAfter);
        console.log("Injected zoom level into MainLayout!");
    }
}

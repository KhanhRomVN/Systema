import React, { useState } from 'react';
import { AppSelector } from '../../components/AppSelector';
import { TrafficDashboard } from '../../components/TrafficDashboard';

const ScannerPage: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);

  const handleSelectApp = async (appName: string, proxyUrl: string) => {
    // Start proxy
    // Extract port from url for now, hardcoded 8081
    await window.api.invoke('proxy:start', 8081);

    // Launch App
    const launched = await window.api.invoke('app:launch', appName, proxyUrl);

    if (launched) {
      setIsScanning(true);
    } else {
      alert('Failed to launch app');
    }
  };

  const handleBack = async () => {
    await window.api.invoke('proxy:stop');
    setIsScanning(false);
  };

  if (isScanning) {
    return <TrafficDashboard onBack={handleBack} />;
  }

  return <AppSelector onSelect={handleSelectApp} />;
};

export default ScannerPage;

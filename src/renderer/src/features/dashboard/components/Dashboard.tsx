import { useState, useEffect } from 'react';

interface ProxyConfig {
    url: string;
    type: string;
}

interface TrackedRequest {
    id: string;
    method: string;
    url: string;
    status: number;
    size: number;
    timestamp: Date;
}

const Dashboard = () => {
    const [proxyUrl, setProxyUrl] = useState('');
    const [proxyType, setProxyType] = useState('http');
    const [isTesting, setIsTesting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [trackedRequests, setTrackedRequests] = useState<TrackedRequest[]>([]);

    const handleTestProxy = async () => {
        if (!proxyUrl) return;

        setIsTesting(true);
        setTestResult(null);

        try {
            // Gọi API kiểm tra proxy
            const result = await (window as any).api?.proxy?.testProxy?.({ url: proxyUrl, type: proxyType });
            if (result) {
                setIsConnected(result.success);
                setTestResult(result.message);
            } else {
                throw new Error('API không khả dụng');
            }
        } catch (error: any) {
            setIsConnected(false);
            setTestResult(`Lỗi khi kiểm tra proxy: ${error.message}`);
            console.error(error);
        } finally {
            setIsTesting(false);
        }
    };

    const handleStartTracking = async () => {
        if (!isConnected) {
            alert('Vui lòng kiểm tra proxy thành công trước khi bắt đầu tracking');
            return;
        }

        setIsTracking(true);
        try {
            await (window as any).api?.tracking?.startTracking?.({ proxyUrl, proxyType });
        } catch (error) {
            console.error(error);
            setIsTracking(false);
        }
    };

    const handleStopTracking = async () => {
        setIsTracking(false);
        try {
            await (window as any).api?.tracking?.stopTracking?.();
        } catch (error) {
            console.error(error);
        }
    };

    // Listen for real tracked requests from main process
    useEffect(() => {
        const handleRequestTracked = (request: any) => {
            setTrackedRequests(prev => {
                // Check if request already exists
                const existingIndex = prev.findIndex(req => req.id === request.id);
                if (existingIndex !== -1) {
                    // Update existing request
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        ...request,
                        timestamp: new Date(request.timestamp || Date.now())
                    };
                    return updated;
                } else {
                    // Add new request (limit to 100 requests)
                    const newRequest: TrackedRequest = {
                        id: request.id || Date.now().toString(),
                        method: request.method || 'GET',
                        url: request.url || 'Unknown',
                        status: request.status || 0,
                        statusText: request.statusText || 'Pending',
                        size: request.size || 0,
                        timestamp: new Date(request.timestamp || Date.now()),
                        headers: request.headers || {},
                        responseHeaders: request.responseHeaders
                    };
                    return [newRequest, ...prev.slice(0, 99)];
                }
            });
        };

        // Setup IPC listener
        if ((window as any).api?.tracking?.onRequestTracked) {
            (window as any).api.tracking.onRequestTracked(handleRequestTracked);

            // Cleanup
            return () => {
                if ((window as any).api?.tracking?.offRequestTracked) {
                    (window as any).api.tracking.offRequestTracked(handleRequestTracked);
                }
            };
        }
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Systema - HTTP Proxy Tracker</h1>
                <p className="text-muted-foreground">Công cụ theo dõi HTTP request/response thông qua proxy
                </p>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Card Proxy Configuration */}
                <div className="border rounded-lg bg-card shadow-sm">
                    <div className="p-6 border-b">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">Cấu hình Proxy</h2>
                            {isConnected ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Đã kết nối
                                </span>
                            ) : (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Chưa kết nối
                                </span>
                            )}

                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Nhập proxy (HTTP/HTTPS/SOCKS5) để bắt đầu tracking

                        </p>

                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Loại Proxy
                            </label>
                            <div className="flex gap-2">
                                {['http', 'https', 'socks5'].map((type) => (
                                    <button
                                        key={type}
                                        className={`px-3 py-1.5 text-sm rounded-md ${proxyType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                                        onClick={() => setProxyType(type)}
                                    >
                                        {type.toUpperCase()}

                                    </button>
                                ))}

                            </div>

                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">URL Proxy
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={`Ví dụ: ${proxyType}://proxy.example.com:8080`}
                                value={proxyUrl}
                                onChange={(e) => setProxyUrl(e.target.value)}
                                disabled={isConnected}
                            />

                        </div>

                        <div className="flex gap-2">
                            <button
                                className={`px-4 py-2 rounded-md ${!proxyUrl || isTesting || isConnected ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                onClick={handleTestProxy}
                                disabled={!proxyUrl || isTesting || isConnected}
                            >
                                {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra Proxy'}

                            </button>

                            {isConnected && (
                                <button
                                    className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                    onClick={() => {
                                        setIsConnected(false);
                                        setProxyUrl('');
                                        setTestResult(null);
                                    }}
                                >
                                    Đổi Proxy

                                </button>
                            )}

                        </div>

                        {testResult && (
                            <div className={`p-3 rounded-md ${isConnected ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                <p className="text-sm">{testResult}
                                </p>

                            </div>
                        )}

                    </div>

                </div>

                {/* Card Tracking Control */}
                <div className="border rounded-lg bg-card shadow-sm">
                    <div className="p-6 border-b">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">Tracking Control</h2>
                            {isTracking && <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 animate-pulse">Đang tracking
                            </span>}

                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            Bắt đầu/dừng theo dõi HTTP request/response

                        </p>

                    </div>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                                Sau khi proxy được kết nối thành công, nhấn nút bắt đầu để tracking các HTTP request.

                            </p>

                        </div>

                        <div className="flex gap-2">
                            <button
                                className={`px-6 py-3 rounded-md text-lg ${!isConnected || isTracking ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                onClick={handleStartTracking}
                                disabled={!isConnected || isTracking}
                            >
                                {isTracking ? 'Đang tracking...' : 'Bắt đầu Tracking'}

                            </button>

                            {isTracking && (
                                <button
                                    className="px-6 py-3 border rounded-md text-lg hover:bg-gray-50"
                                    onClick={handleStopTracking}
                                >
                                    Dừng Tracking

                                </button>
                            )}

                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Trạng thái:
                            </p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="text-sm">
                                    {isTracking ? 'Đang theo dõi HTTP request...' : 'Chưa tracking'}

                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {/* Tracked Requests */}
            <div className="border rounded-lg bg-card shadow-sm">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold">HTTP Requests Tracked</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Danh sách các request đã được track (hiển thị 10 request gần nhất)

                    </p>

                </div>
                <div className="p-6">
                    {trackedRequests.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Chưa có request nào được track. Hãy bắt đầu tracking để xem request.

                        </div>
                    ) : (
                        <div className="space-y-3">
                            {trackedRequests.map((req) => (
                                <div key={req.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-1 text-xs rounded-md ${req.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                                                    req.method === 'POST' ? 'bg-green-100 text-green-800' :
                                                        req.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                    }`}>
                                                    {req.method}

                                                </span>
                                                <span className="font-mono text-sm truncate">{req.url}
                                                </span>

                                            </div>
                                            <div className="flex gap-4 text-xs text-gray-500">
                                                <span>Status: <span className={`font-medium ${req.status >= 200 && req.status < 300 ? 'text-green-600' :
                                                    req.status >= 400 ? 'text-red-600' : 'text-yellow-600'
                                                    }`}>{req.status}
                                                </span>
                                                </span>
                                                <span>Size: {req.size} bytes
                                                </span>
                                                <span>Time: {req.timestamp.toLocaleTimeString()}
                                                </span>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
};

export default Dashboard;

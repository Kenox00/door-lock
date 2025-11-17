import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { logsApi } from '../../api/logsApi';
import { useWebSocket } from '../../hooks/useWebSocket';
import { formatDateTime, timeAgo } from '../../utils/format';

export const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // WebSocket connection for real-time updates
  const { isConnected } = useWebSocket({
    autoConnect: true,
    handlers: {
      device_event: (event) => {
        // Add new device event to logs in real-time
        if (event) {
          setLogs(prevLogs => [event, ...prevLogs]);
        }
      },
      command_executed: (event) => {
        // Add command execution event
        if (event) {
          setLogs(prevLogs => [event, ...prevLogs]);
        }
      },
    }
  });

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 20,
      };

      // Add event type filter if not 'all'
      if (filter !== 'all') {
        params.eventType = filter;
      }

      const response = await logsApi.getActivityLogs(params);
      
      if (response?.data) {
        // Handle different response structures
        let logsData = [];
        if (Array.isArray(response.data)) {
          logsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          logsData = response.data.data;
        }
        
        if (page === 1) {
          setLogs(logsData);
        } else {
          setLogs(prev => [...prev, ...logsData]);
        }
        setHasMore(logsData.length === 20);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleExport = async () => {
    try {
      const blob = await logsApi.exportLogs({ type: filter !== 'all' ? filter : undefined });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert('Failed to export logs');
    }
  };

  const getLogIcon = (eventType) => {
    const type = eventType || '';
    
    if (type.includes('connected') && !type.includes('disconnected')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (type.includes('disconnected')) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }
    if (type.includes('motion')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    }
    if (type.includes('command')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (type.includes('error')) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (type.includes('battery')) {
      return (
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    // Default
    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const getLogBgColor = (eventType) => {
    const type = eventType || '';
    if (type.includes('connected') && !type.includes('disconnected')) return 'bg-green-100';
    if (type.includes('disconnected')) return 'bg-red-100';
    if (type.includes('motion')) return 'bg-green-100';
    if (type.includes('command')) return 'bg-blue-100';
    if (type.includes('error')) return 'bg-red-100';
    if (type.includes('battery')) return 'bg-orange-100';
    return 'bg-gray-100';
  };

  const filterOptions = [
    { id: 'all', label: 'All Activity' },
    { id: 'device_connected', label: 'Connections' },
    { id: 'device_disconnected', label: 'Disconnections' },
    { id: 'motion_detected', label: 'Motion' },
    { id: 'command_executed', label: 'Commands' },
    { id: 'status_changed', label: 'Status Changes' },
    { id: 'error_occurred', label: 'Errors' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
            <p className="text-gray-500 mt-1">View all activity from your smart devices</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {filterOptions.map(option => (
            <button
              key={option.id}
              onClick={() => { setFilter(option.id); setPage(1); }}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${filter === option.id
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Logs List */}
        <Card padding={false}>
          <div className="divide-y divide-gray-200">
            {error ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 mx-auto mb-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 font-medium mb-2">Error loading logs</p>
                <p className="text-gray-500 text-sm mb-4">{error}</p>
                <Button variant="primary" onClick={loadLogs}>Retry</Button>
              </div>
            ) : loading && logs.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-600">Loading logs...</p>
              </div>
            ) : logs.length > 0 ? (
              <>
                {logs.map((log, index) => (
                  <div key={log._id || log.id || index} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getLogBgColor(log.eventType || log.type)}`}>
                        {getLogIcon(log.eventType || log.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.message || log.eventType || 'Device Event'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {log.deviceName || 'Unknown Device'}
                              {log.username && ` • By ${log.username}`}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs text-gray-500">{timeAgo(log.timestamp || log.createdAt)}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDateTime(log.timestamp || log.createdAt)}</p>
                          </div>
                        </div>

                        {/* Additional Details */}
                        {log.payload && Object.keys(log.payload).length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                            {JSON.stringify(log.payload, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Load More */}
                {hasMore && (
                  <div className="p-4 text-center border-t border-gray-200">
                    <Button variant="outline" onClick={handleLoadMore} loading={loading}>
                      Load More
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>No activity logs found</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ServerIcon, 
  PlayIcon, 
  TrashIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

interface SystemStatus {
  server_time: string;
  timezone: string;
  php_version: string;
  memory_usage: number;
  memory_limit: string;
  database: {
    connected: boolean;
    cache_entries?: number;
    error?: string;
  };
  disk_space: {
    free: number;
    total: number;
  };
}

interface CronStatus {
  last_run: string;
  seconds_ago?: number;
  status: string;
  next_expected?: string;
}

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState('LUT');
  const [lastAction, setLastAction] = useState<string>('');

  const apiKey = user?.apiKey || 'ksadh8324oijcff45rfdsvcvhoids44';

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `${window.location.protocol}//${window.location.hostname}:8374`
        : 'http://localhost:8374';
        
      // Load system status
      const statusResponse = await fetch(`${baseUrl}/admin.php?action=status&api_key=${apiKey}`);
      const statusData = await statusResponse.json();
      if (statusData.success) {
        setSystemStatus(statusData.data);
      }

      // Load cron status
      const cronResponse = await fetch(`${baseUrl}/admin.php?action=cron_status&api_key=${apiKey}`);
      const cronData = await cronResponse.json();
      if (cronData.success) {
        setCronStatus(cronData.data);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
    setLoading(false);
  };

  const manualFetch = async () => {
    setFetchLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `${window.location.protocol}//${window.location.hostname}:8374`
        : 'http://localhost:8374';
        
      const response = await fetch(`${baseUrl}/admin.php?action=fetch&api_key=${apiKey}&translation=${selectedTranslation}`);
      const data = await response.json();
      
      if (data.success) {
        setLastAction(`✓ Manual fetch completed for ${selectedTranslation} in ${data.data.duration_ms}ms`);
        loadStatus(); // Refresh status
      } else {
        setLastAction(`✗ Fetch failed: ${data.error}`);
      }
    } catch (error) {
      setLastAction(`✗ Fetch error: ${error}`);
    }
    setFetchLoading(false);
  };

  const clearCache = async () => {
    setClearLoading(true);
    try {
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `${window.location.protocol}//${window.location.hostname}:8374`
        : 'http://localhost:8374';
        
      const response = await fetch(`${baseUrl}/admin.php?action=clear_cache&api_key=${apiKey}`);
      const data = await response.json();
      
      if (data.success) {
        setLastAction(`✓ Cleared ${data.data.deleted_entries} cache entries`);
        loadStatus(); // Refresh status
      } else {
        setLastAction(`✗ Clear failed: ${data.error}`);
      }
    } catch (error) {
      setLastAction(`✗ Clear error: ${error}`);
    }
    setClearLoading(false);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-subtle py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-gray-900 mb-2">
            System Administration
          </h1>
          <p className="text-gray-600">
            Überwache und steuere die BibleScraper Pro API
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <PlayIcon className="w-6 h-6 text-royal-600" />
              <h3 className="font-heading text-lg font-semibold">Manual Fetch</h3>
            </div>
            
            <div className="space-y-3">
              <select
                value={selectedTranslation}
                onChange={(e) => setSelectedTranslation(e.target.value)}
                className="input-field"
              >
                <option value="LUT">Lutherbibel 2017</option>
                <option value="HFA">Hoffnung für alle</option>
                <option value="ELB">Elberfelder</option>
                <option value="BIGS">BIGS</option>
              </select>
              
              <motion.button
                onClick={manualFetch}
                disabled={fetchLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {fetchLoading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayIcon className="w-4 h-4" />
                )}
                <span>{fetchLoading ? 'Fetching...' : 'Fetch Now'}</span>
              </motion.button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrashIcon className="w-6 h-6 text-red-600" />
              <h3 className="font-heading text-lg font-semibold">Clear Cache</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Löscht den heutigen Cache. Nächster API-Call wird neu gefetcht.
            </p>
            
            <motion.button
              onClick={clearCache}
              disabled={clearLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary w-full flex items-center justify-center space-x-2 hover:bg-red-50 hover:text-red-600"
            >
              {clearLoading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
              <span>{clearLoading ? 'Clearing...' : 'Clear Today'}</span>
            </motion.button>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ArrowPathIcon className="w-6 h-6 text-blue-600" />
              <h3 className="font-heading text-lg font-semibold">Refresh Status</h3>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Aktualisiert alle Systemstatistiken.
            </p>
            
            <motion.button
              onClick={loadStatus}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-secondary w-full flex items-center justify-center space-x-2"
            >
              {loading ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowPathIcon className="w-4 h-4" />
              )}
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </motion.button>
          </div>
        </div>

        {/* Last Action */}
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg ${
              lastAction.startsWith('✓') 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {lastAction}
          </motion.div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Status */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <ServerIcon className="w-6 h-6 text-royal-600" />
              <h3 className="font-heading text-xl font-semibold">System Status</h3>
            </div>

            {systemStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Server Time:</span>
                    <p className="font-medium">{systemStatus.server_time}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">PHP Version:</span>
                    <p className="font-medium">{systemStatus.php_version}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory Usage:</span>
                    <p className="font-medium">{formatBytes(systemStatus.memory_usage)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Memory Limit:</span>
                    <p className="font-medium">{systemStatus.memory_limit}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {systemStatus.database.connected ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">Database</span>
                  </div>
                  {systemStatus.database.connected ? (
                    <p className="text-sm text-gray-600">
                      {systemStatus.database.cache_entries} cache entries
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">
                      {systemStatus.database.error}
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <span className="text-gray-500 text-sm">Disk Space:</span>
                  <div className="mt-1">
                    <div className="flex justify-between text-sm">
                      <span>Free: {formatBytes(systemStatus.disk_space.free)}</span>
                      <span>Total: {formatBytes(systemStatus.disk_space.total)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-royal-600 h-2 rounded-full" 
                        style={{ 
                          width: `${((systemStatus.disk_space.total - systemStatus.disk_space.free) / systemStatus.disk_space.total) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>

          {/* Cron Status */}
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-6">
              <ClockIcon className="w-6 h-6 text-royal-600" />
              <h3 className="font-heading text-xl font-semibold">Cron Status</h3>
            </div>

            {cronStatus ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {cronStatus.status === 'active' ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : cronStatus.status === 'inactive' ? (
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  ) : (
                    <ClockIcon className="w-6 h-6 text-gray-400" />
                  )}
                  <span className={`font-medium capitalize ${
                    cronStatus.status === 'active' ? 'text-green-600' :
                    cronStatus.status === 'inactive' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {cronStatus.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Last Run:</span>
                    <p className="font-medium">{cronStatus.last_run}</p>
                  </div>
                  
                  {cronStatus.seconds_ago && (
                    <div>
                      <span className="text-gray-500">Time Since:</span>
                      <p className="font-medium">
                        {cronStatus.seconds_ago < 60 
                          ? `${cronStatus.seconds_ago} seconds ago`
                          : cronStatus.seconds_ago < 3600
                          ? `${Math.floor(cronStatus.seconds_ago / 60)} minutes ago`
                          : `${Math.floor(cronStatus.seconds_ago / 3600)} hours ago`
                        }
                      </p>
                    </div>
                  )}

                  {cronStatus.next_expected && (
                    <div>
                      <span className="text-gray-500">Next Expected:</span>
                      <p className="font-medium">{cronStatus.next_expected}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <ArrowPathIcon className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
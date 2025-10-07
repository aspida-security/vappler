import React, { useState, useEffect } from 'react';
import { workspaceService } from '../../services/workspaceService'; // --- CHANGE 1: Import the service ---
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import WorkspaceCard from './components/WorkspaceCard';
import WorkspaceTable from './components/WorkspaceTable';
import WorkspaceSummary from './components/WorkspaceSummary';
import AddClientModal from './components/AddClientModal';
import BulkActionsBar from './components/BulkActionsBar';
import ClientProfileModal from './components/ClientProfileModal';

const ClientWorkspaceManager = () => {
  // --- CHANGE 2: Update state for live data ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workspaces, setWorkspaces] = useState([]); // Initialize with an empty array

  // --- Existing UI state ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('clientName');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedWorkspaces, setSelectedWorkspaces] = useState([]);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isClientProfileModalOpen, setIsClientProfileModalOpen] = useState(false);

  // --- CHANGE 3: Add useEffect to fetch data on component mount ---
  useEffect(() => {
    const fetchWorkspaces = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await workspaceService.getWorkspaces();

      if (error) {
        setError(error);
        setWorkspaces([]);
      } else if (data) {
        // --- CHANGE 4: Map Supabase data to match the component's expected structure ---
        const formattedWorkspaces = data.map(ws => ({
          id: ws.id,
          clientName: ws.name, // Map 'name' from Supabase to 'clientName'
          industry: ws.industry,
          assetCount: ws.assets[0]?.count || 0, // Extract count from nested array
          lastScanDate: ws.last_scan_date, // Map snake_case to camelCase
          riskScore: ws.risk_score,
          criticalVulns: ws.critical_vulns_count || 0,
          highVulns: ws.high_vulns_count || 0,
          mediumVulns: ws.medium_vulns_count || 0,
          lowVulns: ws.low_vulns_count || 0,
          isActive: ws.is_active,
          contactEmail: ws.contact_email,
          contactPhone: ws.contact_phone
        }));
        setWorkspaces(formattedWorkspaces);
      }
      setIsLoading(false);
    };

    fetchWorkspaces();
  }, []); // Empty array ensures this runs once on load

  // --- All your existing logic for sorting, filtering, and event handlers remains the same ---
  // ... (summaryData calculation, filterOptions, filteredAndSortedWorkspaces, handlers, etc.) ...
  
  // NOTE: This will now be calculated based on the live data
  const summaryData = {
    totalClients: workspaces?.length,
    averageRiskScore: workspaces?.length > 0 ? Math.round(workspaces.reduce((sum, ws) => sum + ws.riskScore, 0) / workspaces.length) : 0,
    activeScans: 3, // This can be fetched with another service call later
    scheduledScans: 8 // This can also be fetched
  };

  const filteredAndSortedWorkspaces = workspaces?.filter(/* ... your existing filter logic ... */);
  // ... rest of your component logic remains here ...

  // --- CHANGE 5: Add Loading and Error UI states ---
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading workspaces...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">Error: {error}</div>;
  }

  // --- Your existing return statement with all the JSX ---
  return (
    <div className="min-h-screen bg-background">
      {/* ... your existing Header, Sidebar, and main content JSX ... */}
    </div>
  );
};

export default ClientWorkspaceManager;
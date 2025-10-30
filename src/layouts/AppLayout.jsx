// src/layouts/AppLayout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { workspaceService } from '../services/workspaceService';
import { useAuth } from '../contexts/AuthContext';
import NewScanModal from '../components/modals/NewScanModal';
import { scannerApiService } from '../services/scannerApiService';
import { assetService } from '../services/assetService';
import { vulnerabilityService } from '../services/vulnerabilityService';
// --- FIX 1: Import the Supabase client ---
import { supabase } from '../lib/supabase';
import Icon from '../components/AppIcon'; // Import Icon for status messages

// Helper to map scanner severity string to DB enum value
const mapSeverity = (severity) => {
    if (!severity) return 'Medium';
    const lower = severity.toLowerCase();
    if (lower.includes('critical')) return 'Critical';
    if (lower.includes('high')) return 'High';
    if (lower.includes('medium')) return 'Medium';
    if (lower.includes('low')) return 'Low';
    return 'Info';
};

/**
 * Handles the logic for finding or creating a network asset.
 * @param {object} hostDetails - The asset details from the scanner.
 * @param {string} workspaceId - The current workspace ID.
 * @returns {Promise<string>} The ID of the upserted asset.
 */
const upsertAsset = async (hostDetails, workspaceId) => {
  if (!hostDetails?.ip_address) {
    throw new Error("Cannot save asset: IP address is missing from scan data.");
  }

  const assetData = {
    workspace_id: workspaceId,
    hostname: hostDetails.host,
    ip_address: hostDetails.ip_address,
    operating_system: hostDetails.os, // Map from scanner if available
    // os_version: hostDetails.os_version,
    // mac_address: hostDetails.mac_address,
    // open_ports: hostDetails.open_ports,
    last_scan_at: new Date().toISOString(),
    is_active: true,
  };

  // 1. Check for existing asset by IP
  const { data: existing, error: findError } = await supabase
    .from('assets')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('ip_address', assetData.ip_address)
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error("[AppLayout] Asset lookup raw error:", findError);
    throw new Error(`Asset lookup failed: ${findError.message}`);
  }

  // 2. Update or Insert
  if (existing) {
    // Update existing asset
    const { error: updateError } = await assetService.updateAsset(existing.id, {
      hostname: assetData.hostname,
      last_scan_at: assetData.last_scan_at,
      operating_system: assetData.operating_system,
      is_active: true,
    });
    if (updateError) {
      console.error("[AppLayout] Asset update raw error:", updateError);
      throw new Error(`Failed to update asset ${existing.id}: ${updateError.message}`);
    }
    console.log(`[AppLayout] Asset ${assetData.ip_address} (ID: ${existing.id}) updated.`);
    return existing.id;
  } else {
    // Create new asset
    const { data: newAsset, error: createError } = await assetService.createAsset(assetData);
    if (createError) {
      console.error("[AppLayout] Asset creation raw error:", createError);
      throw new Error(`Failed to create asset ${assetData.ip_address}: ${createError.message}`);
    }
    if (!newAsset) {
      throw new Error("Asset creation returned no data despite no error.");
    }
    console.log(`[AppLayout] Asset ${assetData.ip_address} (ID: ${newAsset.id}) created.`);
    return newAsset.id;
  }
};

/**
 * Handles the logic for finding or creating a vulnerability for a specific asset.
 * @param {object} vuln - The vulnerability details from the scanner.
 * @param {string} assetId - The ID of the parent asset.
 * @param {string} workspaceId - The current workspace ID.
 * @param {string} scanId - The ID of the scan that found this vulnerability.
 */
const upsertVulnerability = async (vuln, assetId, workspaceId, scanId) => {
  if (!vuln || !vuln.name) {
    console.warn("[AppLayout] Skipping empty vulnerability data.", vuln);
    return; // Skip this vulnerability
  }

  const vulnData = {
    workspace_id: workspaceId,
    asset_id: assetId,
    // VULCAN FIX: Use the actual scanId passed from Celery result
    scan_id: scanId || null, 
    // VULCAN FIX: Use the actual CVE ID
    cve_id: vuln.cve || null, 
    title: vuln.name || vuln.id_from_source || 'Unknown Vulnerability',
    description: vuln.details,
    // VULCAN FIX: Map severity string to the database ENUM
    severity: mapSeverity(vuln.severity),
    // VULCAN FIX: Use the actual CVSS score (default to 0.0)
    cvss_score: vuln.cvss_score || 0.0,
    status: 'open',
    port: vuln.port,
    service: vuln.service,
    remediation_steps: 'Check Nmap output or CVE details.', // Placeholder
    discovered_at: new Date().toISOString()
    // "references": vuln.references, // Add if available
  };

  // 1. Check for existing vulnerability (based on constraints)
  let query = supabase
    .from('vulnerabilities')
    .select('id, status')
    .eq('asset_id', assetId)
    .eq('title', vulnData.title);

  // If port is present, include it in the uniqueness check
  if (vulnData.port) {
    query = query.eq('port', vulnData.port);
  } else {
    // If port is null (asset-level vulnerability), explicitly check for null
    query = query.is('port', null);
  }

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) {
    console.error("[AppLayout] Vuln lookup raw error:", findError);
    throw new Error(`Vulnerability lookup failed: ${findError.message}`);
  }

  // 2. Update or Insert
  if (existing) {
    // Found, update its status if it wasn't 'open'
    if (existing.status !== 'open') {
      const { error: updateError } = await supabase
        .from('vulnerabilities')
        .update({ status: 'open', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) {
        console.error("[AppLayout] Vuln update raw error:", updateError);
        throw new Error(`Failed to update vuln status: ${updateError.message}`);
      }
      console.log(`[AppLayout] Vuln "${vulnData.title}" status reset to 'open'.`);
    }
  } else {
    // Not found, create it
    const { error: createError } = await vulnerabilityService.createVulnerability(vulnData);
    if (createError) {
      console.error("[AppLayout] Vuln creation raw error:", createError);
      throw new Error(`Failed to create vuln: ${createError.message}`);
    }
    console.log(`[AppLayout] Vuln "${vulnData.title}" created.`);
  }
};


const AppLayout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [isNewScanModalOpen, setIsNewScanModalOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);
    const [selectedWorkspace, setSelectedWorkspace] = useState('');
    
    // VULCAN FIX: Destructure userProfile to use for default workspace name
    const { user, userProfile } = useAuth(); 
    const navigate = useNavigate();

    const [isScanning, setIsScanning] = useState(false);
    const [scanTaskId, setScanTaskId] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scanStatusMessage, setScanStatusMessage] = useState('');
    const [scanResult, setScanResult] = useState(null);

    /**
     * Main function to process the full report from Celery,
     * upsert assets, and upsert vulnerabilities.
     */
    const processAndSaveScanResults = async (result) => {
        if (!selectedWorkspace) {
            setScanError("Cannot save results: No workspace is selected.");
            setScanStatusMessage('');
            return;
        }
        if (!result?.vulnerability_details || result.vulnerability_details.length === 0) {
            setScanStatusMessage('Scan complete. No hosts or vulnerabilities found.');
            setScanError(null);
            return;
        }

        console.log("[AppLayout] Processing scan results...", result);
        setScanStatusMessage('Processing and saving scan results...');
        
        const hostDetailsList = result.vulnerability_details || [];
        // VULCAN FIX: The scan_id is now correctly injected by the Python worker task.
        const scanId = result.scan_id; 
        let accumulatedErrors = [];

        for (const hostDetails of hostDetailsList) {
            if (!hostDetails) {
                console.warn("[AppLayout] Skipping empty hostDetails item.");
                continue;
            }
          
            let assetId = null;
            const hostIdentifier = hostDetails.host || hostDetails.ip_address;
            
            try {
                // --- 1. Upsert Asset ---
                setScanStatusMessage(`Processing asset: ${hostIdentifier}...`);
                assetId = await upsertAsset(hostDetails, selectedWorkspace);

                // --- 2. Process Vulnerabilities for this asset ---
                const vulnerabilities = hostDetails.vulnerabilities || [];
                if (vulnerabilities.length > 0) {
                    setScanStatusMessage(`Saving ${vulnerabilities.length} vulnerabilities for ${hostIdentifier}...`);
                    for (const vuln of vulnerabilities) {
                        try {
                            // Pass scanId to the upsert function
                            await upsertVulnerability(vuln, assetId, selectedWorkspace, scanId);
                        } catch (vulnError) {
                            console.error(vulnError);
                            accumulatedErrors.push(vulnError.message);
                        }
                    }
                }

            } catch (assetError) {
                console.error(assetError);
                accumulatedErrors.push(assetError.message);
                setScanStatusMessage(`Failed to save asset ${hostIdentifier}. See console.`);
                // Stop processing this host if asset upsert failed
                continue;
            }
        } // End loop through hosts

        // --- 3. Final Status ---
        if (accumulatedErrors.length > 0) {
            setScanError(`Scan complete, but ${accumulatedErrors.length} errors occurred during saving. Check console.`);
            setScanStatusMessage('');
            console.error("Accumulated save errors:", accumulatedErrors);
        } else {
            setScanError(null);
            setScanStatusMessage('Scan results processed and saved successfully!');
            
            // VULCAN FIX: Add a brief pause and then force refresh to update dashboard
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
    };

    // Effect to fetch user workspaces
    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // VULCAN FIX: Guard against running workspace fetch until userProfile is loaded.
        if (!userProfile) {
            return;
        }

        const fetchWorkspaces = async () => {
            try {
                const { data, error } = await workspaceService.getWorkspaces();

                if (error) {
                    console.error("[AppLayout] Error fetching workspaces:", error);
                    setWorkspaces([]); // Ensure it's an array on error
                    throw new Error(error.message || 'Unknown error fetching workspaces');
                }

                if (Array.isArray(data)) {
                    console.log(`[AppLayout] Found ${data.length} workspaces.`);
                    setWorkspaces(data);
                    
                    if (data.length > 0) {
                        // Select existing workspace or the first one if current is invalid
                        if (!selectedWorkspace || !data.some(w => w.id === selectedWorkspace)) {
                            console.log(`[AppLayout] Auto-selecting first workspace: ${data[0].id}`);
                            setSelectedWorkspace(data[0].id);
                        }
                    } else {
                        // VULCAN FIX: REMOVED client-side provisioning. 
                        // Rely on the server-side trigger (handle_new_user) now.
                        console.warn("[AppLayout] User has no workspaces. RLS link likely failed or is missing.");
                        setSelectedWorkspace(''); // Explicitly clear selectedWorkspace, forcing MainDashboard to show 'No Workspace Selected' UI.
                    }
                } else {
                    console.warn("[AppLayout] Received non-array data for workspaces, setting to empty.", data);
                    setWorkspaces([]);
                    setSelectedWorkspace('');
                }

            } catch (error) {
                console.error("[AppLayout] Failed to fetch workspaces (catch block):", error.message);
                setWorkspaces([]);
                setScanError(`Failed to load workspaces: ${error.message}`);
            }
        };

        fetchWorkspaces();
    // VULCAN FIX: Add userProfile to dependency array
    }, [user, navigate, selectedWorkspace, userProfile]); 


    // Effect to poll for scan results
    useEffect(() => {
        if (!scanTaskId) return; // Do nothing if there's no task ID

        console.log(`[AppLayout] Starting polling for task ID: ${scanTaskId}`);
        const pollInterval = setInterval(async () => {
            console.log(`[AppLayout] Polling results for task ID: ${scanTaskId}`);
            try {
                const data = await scannerApiService.getScanResults(scanTaskId);
                console.log(`[AppLayout] Poll response for ${scanTaskId}:`, data);

                if (data.state === 'SUCCESS') {
                    console.log(`[AppLayout] Task ${scanTaskId} SUCCESS.`);
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan complete! Processing results...');
                    setScanResult(data.result);
                    setIsScanning(false);
                    setScanTaskId(null);
                    await processAndSaveScanResults(data.result);

                } else if (data.state === 'FAILURE') {
                    console.error(`[AppLayout] Task ${scanTaskId} FAILURE. Info:`, data.status);
                    clearInterval(pollInterval);
                    setScanStatusMessage('Scan failed.');
                    setScanError(data.status || 'An unknown error occurred during the scan.');
                    setIsScanning(false);
                    setScanTaskId(null);
                } else {
                    setScanStatusMessage(`Scan in progress... (State: ${data.state})`);
                }
            } catch (err) {
                console.error(`[AppLayout] Error polling results for task ${scanTaskId}:`, err);
                clearInterval(pollInterval);
                setScanError(`Failed to get scan results: ${err.message}`);
                setIsScanning(false);
                setScanTaskId(null);
            }
        }, 5000); // Poll every 5 seconds

        // Cleanup function
        return () => {
            console.log(`[AppLayout] Clearing poll interval for task ID: ${scanTaskId}`);
            clearInterval(pollInterval);
        };
    }, [scanTaskId, selectedWorkspace]);


    const handleWorkspaceChange = (workspaceId) => {
        console.log(`[AppLayout] Workspace changed to: ${workspaceId}`);
        setSelectedWorkspace(workspaceId);
        // Clear scan status when changing workspace
        setScanTaskId(null);
        setScanResult(null);
        setScanError(null);
        setScanStatusMessage('');
        setIsScanning(false);
    };

    const openNewScanModal = () => {
        if (!selectedWorkspace) {
            setScanError("Please select a workspace before starting a scan.");
            return;
        }
        console.log("[AppLayout] Opening New Scan Modal.");
        setScanResult(null);
        setScanError(null);
        setScanStatusMessage('');
        setIsNewScanModalOpen(true);
    };
    const closeNewScanModal = () => {
        console.log("[AppLayout] Closing New Scan Modal.");
        setIsNewScanModalOpen(false);
    };

    const handleScanSubmit = async (scanData) => {
        setIsNewScanModalOpen(false);
        if (!selectedWorkspace) {
            setScanError("Cannot start scan: No workspace selected.");
            return;
        }
        console.log(`[AppLayout] Submitting scan for target: ${scanData.target} in workspace: ${selectedWorkspace}`);
        setScanError(null);
        setScanResult(null);
        setIsScanning(true);
        setScanStatusMessage('Requesting new scan...');
        try {
            // FIX: Pass selectedWorkspace to the scanner API service
            const response = await scannerApiService.startScan(scanData.target, selectedWorkspace);
            console.log("[AppLayout] Scan request successful. Task ID:", response.task_id);
            setScanTaskId(response.task_id);
            setScanStatusMessage(`Scan requested successfully. Task ID: ${response.task_id}. Waiting for results...`);
        } catch (error) {
            console.error("[AppLayout] Failed to start scan:", error);
            setScanError(`Failed to start scan: ${error.message}`);
            setIsScanning(false);
            setScanStatusMessage('');
        }
    };

    const contextValue = {
        openNewScanModal,
        workspaces: Array.isArray(workspaces) ? workspaces : [],
        selectedWorkspace,
        handleWorkspaceChange
    };

    return (
        <div className="flex h-screen bg-background text-foreground">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                workspaces={Array.isArray(workspaces) ? workspaces : []}
                selectedWorkspace={selectedWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onNewScanClick={openNewScanModal}
            />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header
                    onMenuToggle={() => setSidebarOpen(!isSidebarOpen)}
                    isMenuOpen={isSidebarOpen}
                    onNewScanClick={openNewScanModal}
                />
                <main className="flex-1 overflow-y-auto bg-background p-6 pt-6">
                    {/* Scan Status/Error Display */}
                    {(scanStatusMessage && !scanError) && (
                        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-lg mb-6 text-sm">
                           <div className="flex items-center space-x-2">
                               <Icon name={isScanning ? "Loader" : "CheckCircle"} size={16} className={isScanning ? "animate-spin" : ""} />
                               <span>{scanStatusMessage}</span>
                           </div>
                        </div>
                    )}
                    {scanError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-lg mb-6 text-sm">
                           <div className="flex items-center space-x-2">
                               <Icon name="AlertTriangle" size={16} />
                               <span>Error: {scanError}</span>
                           </div>
                        </div>
                    )}
                    
                    {/* Render child route components */}
                    <Outlet context={contextValue} />
                </main>
                <NewScanModal
                    isOpen={isNewScanModalOpen}
                    onClose={closeNewScanModal}
                    onSubmit={handleScanSubmit}
                />
            </div>
        </div>
    );
};

export function useAppLayout() {
    const context = useOutletContext();
    if (context === undefined) {
        throw new Error('useAppLayout must be used within an AppLayout Outlet context');
    }
    return context;
}

export default AppLayout;
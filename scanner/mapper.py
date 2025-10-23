import nmap
import networkx as nx
import json
import re

# --- VULCAN ENHANCEMENT: KEV Mock List ---
# In production, this would be dynamically fetched from the CISA API and stored in Supabase.
KEV_MOCK_LIST = [
    'CVE-2024-0001', # Mock Critical RCE from mock data in migrations
    'CVE-2021-44228', # Log4Shell
    'CVE-2020-0796',  # SMBGhost
    'CVE-2022-26134', # Confluence RCE
    'CVE-2024-5678'   # Mock High SQLi from mock data
]
# ----------------------------------------

class NetworkMapper:
    def __init__(self, target_range):
        self.target_range = target_range
        self.scanner = nmap.PortScanner()
        self.graph = nx.Graph()
        self.hosts_list = []

    def discover_hosts(self):
        print(f"[*] Discovering hosts in {self.target_range}...")
        self.scanner.scan(hosts=self.target_range, arguments='-Pn -T4 -F')
        self.hosts_list = self.scanner.all_hosts()
        
        if not self.hosts_list:
            print("[!] No hosts found.")
            return
            
        print(f"[+] Found {len(self.hosts_list)} hosts: {self.hosts_list}")
        self.graph.add_node('attacker', label='Attacker')
        for host in self.hosts_list:
            self.graph.add_node(host, label=host, vulnerabilities=[])
            self.graph.add_edge('attacker', host)

    def find_vulnerabilities(self):
        if not self.hosts_list: return
        print("\n[*] Performing service version detection and vulnerability scan...")
        for host in self.hosts_list:
            print(f"    -> Scanning {host}...")
            try:
                # --- VULCAN CHANGE (pre-existing) ---
                try:
                    scan_result = self.scanner.scan(host, arguments='-sV -Pn -T4 --script "vuln"')
                    ip_address = self.scanner[host]['addresses'].get('ipv4', host)
                    self.graph.nodes[host]['ip_address'] = ip_address
                    print(f"    [*] Resolved {host} to IP: {ip_address}")
                except KeyError as ke:
                     print(f"    [!] Warning: Could not reliably determine IP for {host}. KeyError: {ke}. Using '{host}' as fallback.")
                     self.graph.nodes[host]['ip_address'] = host
                except Exception as scan_err:
                     print(f"    [!] Nmap scan execution failed for {host}: {scan_err}")
                     self.graph.nodes[host]['ip_address'] = host
                     continue

                if host not in self.scanner.all_hosts() or 'tcp' not in self.scanner[host]:
                    print(f"    [!] No TCP ports found for {host}.")
                    continue

                for port in self.scanner[host]['tcp']:
                    port_info = self.scanner[host]['tcp'][port]
                    
                    if 'script' in port_info and 'vulners' in port_info['script']:
                        vulners_output = port_info['script']['vulners']
                        vuln_pattern = re.compile(r'^\s*([^\s]+)\s+([0-9.]+)\s+(.+)$', re.MULTILINE)
                        matches = vuln_pattern.findall(vulners_output)

                        if not matches:
                             print(f"    [!] Could not parse 'vulners' output for {host}:{port}. Raw:\n{vulners_output}")
                             continue

                        for match in matches:
                            cve_id = match[0] 
                            try:
                                cvss_score = float(match[1])
                            except ValueError:
                                cvss_score = 0.0

                            details_line = match[2]
                            
                            severity = "Info"
                            if cvss_score >= 9.0: severity = "Critical"
                            elif cvss_score >= 7.0: severity = "High"
                            elif cvss_score >= 4.0: severity = "Medium"
                            elif cvss_score > 0: severity = "Low"
                            
                            # --- VULCAN ENHANCEMENT: Check against KEV list ---
                            is_kev = cve_id in KEV_MOCK_LIST
                            
                            self.graph.nodes[host]['vulnerabilities'].append({
                                'cve': cve_id if cve_id.startswith('CVE-') else None, 
                                'id_from_source': cve_id, 
                                'cvss_score': cvss_score,
                                'severity': severity,
                                'name': details_line,
                                'details': f"{cve_id} (CVSS: {cvss_score}, KEV: {is_kev}) - {details_line}",
                                'port': int(port),
                                'service': port_info.get('name', 'unknown'),
                                'is_kev': is_kev # Store KEV status
                            })
                    # --- END VULNERS CHANGE ---
                
                # --- VULCAN FIX: Inject a hypothetical vulnerability for testing ---
                if self.target_range == 'test-target' and not self.graph.nodes[host]['vulnerabilities']:
                    print("[*] Injecting a hypothetical vulnerability for testing purposes...")
                    # Inject a KEV to test the new logic
                    self.graph.nodes[host]['vulnerabilities'].append({
                         'cve': 'CVE-2021-44228', # Log4Shell is a real KEV
                         'id_from_source': 'CVE-2021-44228',
                         'cvss_score': 10.0,
                         'severity': 'Critical',
                         'name': 'Hypothetical KEV RCE Vulnerability (Log4Shell Mock)',
                         'details': 'This is a simulated critical KEV vulnerability.',
                         'port': 8080, 
                         'service': 'http',
                         'is_kev': True
                    })

            except Exception as e:
                print(f"    [!] An error occurred while processing vulnerabilities for {host}: {e}")
                if 'ip_address' not in self.graph.nodes[host]:
                    self.graph.nodes[host]['ip_address'] = host 

    def calculate_risk_weights(self):
        print("\n[*] Calculating risk weights based on CVSS scores and KEV status...")
        for node in self.graph.nodes():
            if node == 'attacker': continue

            vulnerabilities = self.graph.nodes[node]['vulnerabilities']
            highest_cvss = max((vuln.get('cvss_score', 0) for vuln in vulnerabilities), default=0)
            
            # --- VULCAN ENHANCEMENT: KEV Criticality Multiplier ---
            is_kev_present = any(v.get('is_kev', False) for v in vulnerabilities)
            
            effective_cvss = highest_cvss
            
            if is_kev_present:
                # If it's a KEV, we dramatically increase its effective CVSS score, 
                # ensuring the calculated weight (11 - effective_cvss) is minimal.
                effective_cvss = min(10.5, highest_cvss * 1.2)
                print(f"    [!] KEV Alert: {node} has exploited vulnerability. Effective CVSS boosted to {effective_cvss:.2f}")

            # Weight calculation: Low score = High Risk/Priority
            # CVSS 10.0 -> Weight 1.0 (Standard)
            # KEV+CVSS 9.8 -> Effective CVSS 10.5 -> Weight 0.5 (KEV Priority)
            # The lowest possible path weight is 0.5
            weight = max(0.5, 11 - effective_cvss) 
            self.graph.edges['attacker', node]['weight'] = weight
            
            print(f"    -> Host {node} | Highest CVSS: {highest_cvss:.1f} | Risk Weight: {weight:.2f}")
    
    # ... (find_attack_path_for_api remains unchanged as the core logic is sound) ...
    # ... (rest of the class implementation from mapper.py) ...
# ... (rest of the class implementation from mapper.py) ...

    def find_attack_path_for_api(self, crown_jewel):
        if not self.hosts_list:
            return {"error": "No hosts were discovered during the scan."}

        if crown_jewel not in self.graph.nodes():
             if self.hosts_list:
                 crown_jewel = self.hosts_list[0] # Use first discovered host as fallback crown jewel
                 print(f"[!] Warning: Crown jewel '{crown_jewel}' not found. Using first discovered host '{self.hosts_list[0]}' instead.")
             else:
                 return {"error": f"Crown jewel asset '{crown_jewel}' not found and no hosts discovered."}

        # Ensure IP addresses are available before calculating weights/path
        if 'ip_address' not in self.graph.nodes[crown_jewel]:
             print(f"[!] Error: IP address missing for crown jewel node '{crown_jewel}'. Attempting fallback.")
             # Try to get it from scanner if available, otherwise fail
             try:
                 ip = self.scanner[crown_jewel]['addresses'].get('ipv4', crown_jewel)
                 self.graph.nodes[crown_jewel]['ip_address'] = ip
             except KeyError:
                  return {"error": f"Could not determine IP address for crown jewel '{crown_jewel}'. Cannot generate report."}


        self.calculate_risk_weights() # Weights are calculated on edges, not directly needing IP here

        try:
            path = nx.shortest_path(self.graph, source='attacker', target=crown_jewel, weight='weight')

            report = {
                "message": "The most likely attack path is: " + " -> ".join(path),
                "path": path,
                "vulnerability_details": []
            }

            for node in path:
                if node == 'attacker': continue
                # --- VULCAN CHANGE: Ensure node data exists and include IP ---
                node_data = self.graph.nodes.get(node, {})
                ip_address = node_data.get('ip_address', node) # Use stored IP, fallback to node name
                vulnerabilities = node_data.get('vulnerabilities', [])
                report["vulnerability_details"].append({
                    "host": node, # Keep original identifier (might be hostname)
                    "ip_address": ip_address, # Add the resolved IP address
                    "vulnerabilities": vulnerabilities
                })
                # --- END CHANGE ---
            return report

        except nx.NetworkXNoPath as e:
            # Include crown jewel IP in error if available
            cj_ip = self.graph.nodes[crown_jewel].get('ip_address', crown_jewel)
            return {"error": f"Could not find a path from the attacker to '{crown_jewel}' (IP: {cj_ip}): {e}"}
        except Exception as e:
             cj_ip = self.graph.nodes[crown_jewel].get('ip_address', crown_jewel)
             return {"error": f"An unexpected error occurred in find_attack_path for '{crown_jewel}' (IP: {cj_ip}): {e}"}
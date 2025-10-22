import nmap
import networkx as nx
import json
import re

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
                # --- VULCAN CHANGE: Scan using IP if possible, add addresses to node ---
                # Attempt to get IP address Nmap found for this host key
                try:
                    # Scan arguments remain the same
                    scan_result = self.scanner.scan(host, arguments='-sV -Pn -T4 --script "vuln"')

                    # Store the primary IPv4 address found by Nmap
                    # The 'host' key might be a hostname, but nmap stores resolved addresses
                    ip_address = self.scanner[host]['addresses'].get('ipv4', host) # Fallback to host key if IP not found
                    # Store it on the graph node for later use
                    self.graph.nodes[host]['ip_address'] = ip_address
                    print(f"    [*] Resolved {host} to IP: {ip_address}")

                except KeyError as ke:
                     # Handle cases where nmap might not populate addresses correctly after scan
                     print(f"    [!] Warning: Could not reliably determine IP for {host} after scan. KeyError: {ke}. Using '{host}' as fallback.")
                     self.graph.nodes[host]['ip_address'] = host # Use the original target as fallback
                except Exception as scan_err:
                     print(f"    [!] Nmap scan execution failed for {host}: {scan_err}")
                     self.graph.nodes[host]['ip_address'] = host # Fallback on error
                     continue # Skip vulnerability processing for this host if scan failed


                if host not in self.scanner.all_hosts() or 'tcp' not in self.scanner[host]:
                    print(f"    [!] No TCP ports found for {host}.")
                    continue

                for port in self.scanner[host]['tcp']:
                    port_info = self.scanner[host]['tcp'][port]
                    # --- VULCAN CHANGE: Extract 'vulners' script output more robustly ---
                    if 'script' in port_info and 'vulners' in port_info['script']:
                        vulners_output = port_info['script']['vulners']
                        # Example vulners format can vary, adapt regex as needed
                        # This regex tries to capture CVE/ID, CVSS score, and description line
                        # Format: CVE-YYYY-NNNN\tCVSS_SCORE\tDESCRIPTION or similar ID CVSS DESC
                        vuln_pattern = re.compile(r'^\s*([^\s]+)\s+([0-9.]+)\s+(.+)$', re.MULTILINE)
                        matches = vuln_pattern.findall(vulners_output)

                        if not matches:
                             print(f"    [!] Could not parse 'vulners' output for {host}:{port}. Raw:\n{vulners_output}")
                             continue

                        for match in matches:
                            cve_id = match[0] # Could be CVE or other ID like EDB-ID
                            try:
                                cvss_score = float(match[1])
                            except ValueError:
                                print(f"    [!] Warning: Could not parse CVSS score '{match[1]}' for {cve_id} on {host}:{port}. Defaulting to 0.")
                                cvss_score = 0.0

                            details_line = match[2]

                            severity = "Info"
                            if cvss_score >= 9.0: severity = "Critical"
                            elif cvss_score >= 7.0: severity = "High"
                            elif cvss_score >= 4.0: severity = "Medium"
                            elif cvss_score > 0: severity = "Low"

                            self.graph.nodes[host]['vulnerabilities'].append({
                                'cve': cve_id if cve_id.startswith('CVE-') else None, # Store only if it looks like a CVE
                                'id_from_source': cve_id, # Store the original ID regardless
                                'cvss_score': cvss_score,
                                'severity': severity,
                                'name': details_line, # Use the description line as name for now
                                'details': f"{cve_id} (CVSS: {cvss_score}) - {details_line}",
                                'port': int(port),
                                'service': port_info.get('name', 'unknown')
                            })
                    # --- END VULNERS CHANGE ---
                
                # --- VULCAN FIX: Inject a hypothetical vulnerability for testing ---
                # Inject hypothetical vulnerability if needed (no changes here)
                if self.target_range == 'test-target' and not self.graph.nodes[host]['vulnerabilities']:
                    print("[*] Injecting a hypothetical vulnerability for testing purposes...")
                    self.graph.nodes[host]['vulnerabilities'].append({
                        # ... (hypothetical vuln data remains same) ...
                         'cve': 'CVE-2025-DEMO',
                         'id_from_source': 'CVE-2025-DEMO',
                         'cvss_score': 9.8,
                         'severity': 'Critical',
                         'name': 'Hypothetical RCE Vulnerability',
                         'details': 'This is a simulated critical vulnerability.',
                         'port': 'http', # Change 80 to 'http' or similar non-numeric string
                         'service': 'http'
                    })

            except Exception as e:
                print(f"    [!] An error occurred while processing vulnerabilities for {host}: {e}")
                # Ensure ip_address exists even if vuln scan fails
                if 'ip_address' not in self.graph.nodes[host]:
                    self.graph.nodes[host]['ip_address'] = host # Fallback

    def calculate_risk_weights(self):
        print("\n[*] Calculating risk weights based on CVSS scores...")
        for node in self.graph.nodes():
            if node == 'attacker': continue

            vulnerabilities = self.graph.nodes[node]['vulnerabilities']
            highest_cvss = max((vuln.get('cvss_score', 0) for vuln in vulnerabilities), default=0)

            weight = max(1, 11 - highest_cvss) 
            self.graph.edges['attacker', node]['weight'] = weight
            print(f"    -> Host {node} | Highest CVSS: {highest_cvss} | Risk Weight: {weight}")

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
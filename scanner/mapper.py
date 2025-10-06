import nmap
import networkx as nx
import json
import matplotlib.pyplot as plt

class NetworkMapper:
    """
    A class to scan a network, find vulnerabilities, and visualize the attack path.
    """
    # THIS IS THE MISSING METHOD
    def __init__(self, target_range):
        self.target_range = target_range
        self.scanner = nmap.PortScanner()
        self.graph = nx.Graph()
        self.hosts_list = []

    def discover_hosts(self):
        """
        Discovers active hosts using a more robust scan that skips ping checks.
        """
        print(f"[*] Discovering hosts in {self.target_range}...")
        # -Pn: Skips the ping check and assumes the host is online.
        # -F: Scans the 100 most common ports.
        # This is far more reliable inside restrictive networks like Docker.
        self.scanner.scan(hosts=self.target_range, arguments='-Pn -F')
        
        self.hosts_list = [host for host in self.scanner.all_hosts()]
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
        print("\n[*] Performing service version detection (this may take a few minutes)...")
        for host in self.hosts_list:
            print(f"    -> Scanning {host}...")
            try:
                # FINAL SCAN COMMAND: -sV is for version detection, which is fast and reliable.
                self.scanner.scan(host, arguments='-sV -Pn')
                
                for port in self.scanner[host].get('tcp', {}):
                    port_info = self.scanner[host]['tcp'][port]
                    # We will treat the discovered software version as the "vulnerability" detail
                    if port_info.get('product') or port_info.get('version'):
                        version_info = f"{port_info.get('product', '')} {port_info.get('version', '')}".strip()
                        self.graph.nodes[host]['vulnerabilities'].append({
                            'port': port,
                            'service': port_info.get('name', 'unknown'),
                            'details': version_info
                        })
            except Exception as e:
                print(f"    [!] An error occurred while scanning {host}: {e}")

    def calculate_risk_weights(self):
        print("\n[*] Calculating risk weights...")
        for node in self.graph.nodes():
            if node == 'attacker': continue
            risk_score = 100
            num_vulns = len(self.graph.nodes[node]['vulnerabilities'])
            if num_vulns > 0:
                risk_score -= (num_vulns * 20)
            weight = max(1, risk_score)
            self.graph.edges['attacker', node]['weight'] = weight
            print(f"    -> Host {node} | Vulnerabilities: {num_vulns} | Risk Weight: {weight}")

    def find_attack_path_for_api(self, crown_jewel):
        """
        Finds the attack path and returns it as a dictionary for API use.
        """
        if crown_jewel not in self.graph.nodes():
            return {"error": f"Crown jewel asset '{crown_jewel}' not found."}
        
        self.calculate_risk_weights()
        
        try:
            path = nx.shortest_path(self.graph, source='attacker', target=crown_jewel, weight='weight')
            
            # Build a structured report
            report = {
                "message": "The most likely attack path is: " + " -> ".join(path),
                "path": path,
                "vulnerability_details": []
            }

            for node in path:
                if node == 'attacker': continue
                vulnerabilities = self.graph.nodes[node]['vulnerabilities']
                if vulnerabilities:
                    report["vulnerability_details"].append({
                        "host": node,
                        "vulnerabilities": vulnerabilities
                    })
            return report

        except nx.NetworkXNoPath:
            return {"error": f"Could not find a path from the attacker to '{crown_jewel}'."}

# --- Main execution block ---
if __name__ == '__main__':
    target = '45.33.32.156'
    crown_jewel_asset = '45.33.32.156'

    mapper = NetworkMapper(target)
    mapper.discover_hosts()
    mapper.find_vulnerabilities()

    # --- ADD THIS TEST CODE ---
    print("\n[*] Injecting a hypothetical vulnerability for testing purposes...")
    mapper.graph.nodes['45.33.32.156']['vulnerabilities'].append({
        'port': 80,
        'service': 'http',
        'details': 'Hypothetical Critical RCE Vulnerability (CVE-2025-XXXX)'
    })
    # --- END OF TEST CODE ---

    attack_path = mapper.find_attack_path(crown_jewel=crown_jewel_asset)
    if attack_path:
        mapper.draw_attack_graph(attack_path)
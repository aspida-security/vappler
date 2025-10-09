import nmap
import networkx as nx
import json
import matplotlib.pyplot as plt

class NetworkMapper:
    def __init__(self, target_range):
        self.target_range = target_range
        self.scanner = nmap.PortScanner()
        self.graph = nx.Graph()
        self.hosts_list = []

    def discover_hosts(self):
        print(f"[*] Discovering hosts in {self.target_range}...")
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
                self.scanner.scan(host, arguments='-sV -Pn')
                
                for port in self.scanner[host].get('tcp', {}):
                    port_info = self.scanner[host]['tcp'][port]
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
        target_node = None
        if crown_jewel in self.graph.nodes():
            target_node = crown_jewel
        elif self.hosts_list:
            target_node = self.hosts_list[0]

        if not target_node or target_node not in self.graph.nodes():
            return {"error": f"Crown jewel asset '{crown_jewel}' not found in the discovered hosts."}
        
        self.calculate_risk_weights()
        
        try:
            path = nx.shortest_path(self.graph, source='attacker', target=target_node, weight='weight')
            
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
            return {"error": f"Could not find a path from the attacker to '{target_node}'."}
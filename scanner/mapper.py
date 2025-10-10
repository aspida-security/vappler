import subprocess
import networkx as nx
import json
import re
import xml.etree.ElementTree as ET

class NetworkMapper:

    def _run_nmap_scan(self, target):
        print(f"    -> Executing Nmap with subprocess: {target}")
        nmap_args = ['nmap', '-sV', '-Pn', '--script', 'vuln and not smb-*', '-oX', '-', target]
        try:
            process = subprocess.run(nmap_args, capture_output=True, text=True, check=True, timeout=900)
            return process.stdout
        except subprocess.TimeoutExpired:
            print(f"    [!] Nmap scan for {target} timed out after 15 minutes.")
            return None
        except subprocess.CalledProcessError as e:
            print(f"    [!] Nmap command failed with error: {e.stderr}")
            return None

    def _parse_nmap_xml(self, xml_output):
        graph = nx.Graph()
        graph.add_node('attacker', label='Attacker')
        if not xml_output: return graph
        root = ET.fromstring(xml_output)
        for host in root.findall('host'):
            ip_address = host.find('address').get('addr')
            print(f"    -> Parsing results for host: {ip_address}")
            graph.add_node(ip_address, label=ip_address, vulnerabilities=[])
            graph.add_edge('attacker', ip_address)
            for port in host.findall('.//port'):
                port_id = port.get('portid')
                service_elem = port.find('service')
                service_name = service_elem.get('name') if service_elem is not None else 'unknown'
                for script in port.findall('script'):
                    if script.get('id') and script.get('output'):
                        graph.nodes[ip_address]['vulnerabilities'].append({
                            'port': port_id,
                            'service': service_name,
                            'script_id': script.get('id'),
                            'details': script.get('output'),
                            'cvss': self._extract_highest_cvss(script.get('output'))
                        })
        return graph

    def _extract_highest_cvss(self, script_output):
        """Extracts the HIGHEST CVSS score from a script's output."""
        if not script_output: return 0.0
        
        # Regex to find all occurrences of CVSS scores, including those in vulners output
        # It looks for a floating point number preceded by a tab or "CVSS: "
        scores = re.findall(r'(?:CVSS:\s*|^\s+|\t)(\d+\.\d+)', script_output, re.IGNORECASE | re.MULTILINE)
        
        if not scores:
            return 0.0
            
        # Convert all found scores to float and return the maximum
        return max(float(score) for score in scores)

    def _calculate_risk_weights(self, graph):
        print("\n[*] Calculating risk weights based on CVSS scores...")
        for node in graph.nodes():
            if node == 'attacker': continue
            highest_cvss = 0.0
            for vuln in graph.nodes[node]['vulnerabilities']:
                cvss_score = float(vuln.get('cvss', 0.0))
                if cvss_score > highest_cvss:
                    highest_cvss = cvss_score
            weight = max(1, 11.0 - highest_cvss)
            if graph.has_edge('attacker', node):
                 graph.edges['attacker', node]['weight'] = weight
            print(f"    -> Host {node} | Highest CVSS: {highest_cvss} | Risk Weight: {weight}")
        return graph

    def scan_and_report(self, target, crown_jewel):
        xml_output = self._run_nmap_scan(target)
        if not xml_output:
            return {"error": f"Nmap scan failed for target {target}."}
        graph = self._parse_nmap_xml(xml_output)
        graph = self._calculate_risk_weights(graph)
        scanned_hosts = [node for node in graph.nodes() if node != 'attacker']
        if not scanned_hosts:
             return {"error": "Could not find any scannable hosts in the Nmap output."}
        target_node = scanned_hosts[0]
        try:
            path = nx.shortest_path(graph, source='attacker', target=target_node, weight='weight')
            report = { "message": "The most likely attack path is: " + " -> ".join(path), "path": path, "vulnerability_details": [] }
            for node in path:
                if node == 'attacker': continue
                vulnerabilities = graph.nodes[node].get('vulnerabilities', [])
                if vulnerabilities:
                    report["vulnerability_details"].append({ "host": node, "vulnerabilities": vulnerabilities })
            return report
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return {"error": f"Could not find an attack path to '{target_node}'."}
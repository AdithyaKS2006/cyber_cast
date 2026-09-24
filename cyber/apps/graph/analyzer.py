import logging
from decimal import Decimal
from django.db.models import Count
from apps.graph.models import MuleNode, MuleEdge
from apps.graph.engine import MuleGraphEngine
from apps.complaints.models import Complaint, TransactionHop

logger = logging.getLogger('crimecast.graph')


class MuleNetworkAnalyzer:
    """
    Analyzes the financial transaction network graph for cross-complaint 
    mule linkages and outputs confirmed mule classifications.
    Unique CrimeCast Differentiator: Aggregates intelligence across all 1930 calls.
    """

    def __init__(self):
        self.engine = MuleGraphEngine()

    def sync_all_complaint_hops_to_graph(self):
        """
        Synchronizes all TransactionHop records from the complaints database
        into the Mule graph network so the full national topology is current.
        """
        hops = TransactionHop.objects.select_related('complaint').all()
        synced_count = 0
        for hop in hops:
            if not hop.from_account or not hop.to_account:
                continue
            tx_ref = getattr(hop, 'transaction_id', None) or f"TX-HOP-{hop.complaint_id}-{hop.hop_number}"
            try:

                self.engine.add_edge(
                    from_account=hop.from_account,
                    from_ifsc=hop.from_ifsc or 'UNKNOWN',
                    to_account=hop.to_account,
                    to_ifsc=hop.to_ifsc or 'UNKNOWN',
                    amount=hop.amount or Decimal('0.00'),
                    transaction_ref=tx_ref,
                    timestamp=hop.timestamp,
                    hop_number=hop.hop_number,
                    complaint=hop.complaint
                )
                synced_count += 1
            except Exception as exc:
                logger.debug(f"Hop sync skip: {exc}")
        return synced_count

    def detect_confirmed_mules(self, threshold: int = 2) -> list:
        """
        Identifies accounts appearing across multiple distinct complaints.
        Accounts appearing in >= threshold complaints are classified as 'CONFIRMED_MULE'.
        """
        # Ensure graph has latest data
        self.sync_all_complaint_hops_to_graph()

        confirmed_mules = []
        nodes = MuleNode.objects.all()

        for node in nodes:
            out_c = set(MuleEdge.objects.filter(source_node=node, linked_complaint__isnull=False).values_list('linked_complaint_id', flat=True))
            in_c = set(MuleEdge.objects.filter(target_node=node, linked_complaint__isnull=False).values_list('linked_complaint_id', flat=True))
            linked = out_c.union(in_c)
            count = len(linked)

            if count >= threshold:
                if node.node_type != 'CONFIRMED_MULE':
                    node.node_type = 'CONFIRMED_MULE'
                node.risk_score = min(1.0, max(0.85, 0.70 + 0.10 * count))
                node.save(update_fields=['node_type', 'risk_score'])

                complaint_numbers = list(
                    Complaint.objects.filter(id__in=linked).values_list('complaint_number', flat=True)
                )

                confirmed_mules.append({
                    'node_id': str(node.id),
                    'account_hash': node.account_hash,
                    'bank_ifsc': node.bank_ifsc,
                    'bank_name': node.bank_name or node.bank_ifsc[:4],
                    'complaint_count': count,
                    'complaints': complaint_numbers,
                    'risk_score': node.risk_score,
                    'total_volume': float(node.total_volume),
                    'freeze_status': node.freeze_status
                })

        return confirmed_mules

    def get_cross_complaint_network(self, min_complaints: int = 1, bank_ifsc: str = None, max_nodes: int = 250) -> dict:
        """
        Returns full cross-complaint network topology formatted for React Flow graph visualizer.
        Annotates nodes with cross-case linkage frequency and Confirmed Mule classifications.
        """
        self.sync_all_complaint_hops_to_graph()
        self.detect_confirmed_mules(threshold=2)

        edges_qs = MuleEdge.objects.select_related('source_node', 'target_node', 'linked_complaint').all()
        if bank_ifsc:
            edges_qs = edges_qs.filter(source_node__bank_ifsc__icontains=bank_ifsc) | edges_qs.filter(target_node__bank_ifsc__icontains=bank_ifsc)

        nodes_map = {}
        edges_list = []
        confirmed_mules_count = 0
        total_volume = Decimal('0.00')

        for edge in edges_qs[:max_nodes * 2]:
            src = edge.source_node
            tgt = edge.target_node

            for node in (src, tgt):
                if node.id not in nodes_map:
                    out_c = set(MuleEdge.objects.filter(source_node=node, linked_complaint__isnull=False).values_list('linked_complaint__complaint_number', flat=True))
                    in_c = set(MuleEdge.objects.filter(target_node=node, linked_complaint__isnull=False).values_list('linked_complaint__complaint_number', flat=True))
                    linked_cases = list(out_c.union(in_c))
                    c_count = len(linked_cases)

                    is_confirmed = (c_count >= 2) or (node.node_type == 'CONFIRMED_MULE')
                    if is_confirmed:
                        confirmed_mules_count += 1

                    nodes_map[node.id] = {
                        'id': str(node.id),
                        'account_hash': node.account_hash,
                        'masked_account': f"•••• {node.account_hash[-4:].upper()}",
                        'bank_ifsc': node.bank_ifsc,
                        'bank_name': node.bank_name or node.bank_ifsc[:4],
                        'node_type': 'CONFIRMED_MULE' if is_confirmed else node.node_type,
                        'is_confirmed_mule': is_confirmed,
                        'complaint_count': c_count,
                        'complaints': linked_cases,
                        'risk_score': node.risk_score,
                        'total_volume': float(node.total_volume),
                        'transaction_count': node.transaction_count,
                        'freeze_status': node.freeze_status,
                        'lat': node.last_known_lat,
                        'lon': node.last_known_lon
                    }

            total_volume += edge.amount
            edges_list.append({
                'id': str(edge.id),
                'source': str(src.id),
                'target': str(tgt.id),
                'amount': float(edge.amount),
                'transaction_ref': edge.transaction_ref,
                'hop_number': edge.hop_number,
                'complaint_number': edge.linked_complaint.complaint_number if edge.linked_complaint else 'Direct Link',
                'timestamp': edge.timestamp.isoformat() if edge.timestamp else None
            })

        # Filter nodes if min_complaints > 1
        filtered_nodes = list(nodes_map.values())
        if min_complaints > 1:
            filtered_nodes = [n for n in filtered_nodes if n['complaint_count'] >= min_complaints]
            valid_ids = {n['id'] for n in filtered_nodes}
            edges_list = [e for e in edges_list if e['source'] in valid_ids and e['target'] in valid_ids]

        return {
            'nodes': filtered_nodes[:max_nodes],
            'edges': edges_list,
            'summary': {
                'total_nodes': len(filtered_nodes),
                'total_edges': len(edges_list),
                'confirmed_mules_count': confirmed_mules_count,
                'total_fraud_volume_inr': float(total_volume),
                'multi_case_rate': round((confirmed_mules_count / max(1, len(filtered_nodes))) * 100, 1)
            }
        }

import hashlib
import logging
from decimal import Decimal
from django.utils import timezone
from apps.graph.models import MuleNode, MuleEdge

logger = logging.getLogger('crimecast.graph')


class MuleGraphEngine:
    """
    Engine for creating, maintaining, and querying the financial transaction network graph.
    """

    @staticmethod
    def compute_account_hash(account_number: str, ifsc: str) -> str:
        """
        Computes deterministic SHA-256 hash for Account Number + IFSC combination.
        """
        raw_str = f"{account_number}{ifsc}".strip()
        return hashlib.sha256(raw_str.encode('utf-8')).hexdigest()

    def get_or_create_node(self, account_number: str, ifsc: str, node_type: str = 'UNKNOWN') -> MuleNode:
        """
        Gets or creates a MuleNode based on computed account hash.
        Updates details and transaction counter.
        """
        account_hash = self.compute_account_hash(account_number, ifsc)

        node, created = MuleNode.objects.get_or_create(
            account_hash=account_hash,
            defaults={
                'bank_ifsc': ifsc,
                'node_type': node_type,
                'transaction_count': 1
            }
        )

        if not created:
            if node.node_type == 'UNKNOWN' and node_type != 'UNKNOWN':
                node.node_type = node_type
            if not node.bank_ifsc:
                node.bank_ifsc = ifsc
            node.transaction_count += 1
            node.save()

        return node

    def add_edge(self, from_account: str, from_ifsc: str, to_account: str, to_ifsc: str,
                 amount, transaction_ref: str, timestamp=None, hop_number: int = 1, complaint=None) -> MuleEdge:
        """
        Inserts a directed financial flow edge between source and target MuleNodes.
        Updates node classifications based on hop sequence and updates transaction volume.
        """
        if timestamp is None:
            timestamp = timezone.now()

        amount_dec = Decimal(str(amount))

        source_node = self.get_or_create_node(from_account, from_ifsc)
        target_node = self.get_or_create_node(to_account, to_ifsc)

        # Update node typing based on hop sequence
        if hop_number == 1 and source_node.node_type in ('UNKNOWN', 'VICTIM'):
            source_node.node_type = 'LAYER_1'
            source_node.save(update_fields=['node_type'])
        elif hop_number == 2 and source_node.node_type in ('UNKNOWN', 'LAYER_1'):
            source_node.node_type = 'LAYER_2'
            source_node.save(update_fields=['node_type'])

        edge, created = MuleEdge.objects.get_or_create(
            source_node=source_node,
            target_node=target_node,
            transaction_ref=transaction_ref,
            defaults={
                'amount': amount_dec,
                'timestamp': timestamp,
                'hop_number': hop_number,
                'linked_complaint': complaint
            }
        )

        # Update source node total volume
        source_node.total_volume = Decimal(str(source_node.total_volume)) + amount_dec
        source_node.save(update_fields=['total_volume'])

        logger.info("Graph Edge added: %s -> %s (₹%s, Hop %s, Ref %s)",
                    source_node.account_hash[:8], target_node.account_hash[:8], amount_dec, hop_number, transaction_ref)

        return edge

    def get_graph_for_complaint(self, complaint_id) -> dict:
        """
        Retrieves all nodes and edges linked to a specific complaint formatted for D3.js visualization.
        """
        edges = MuleEdge.objects.filter(linked_complaint_id=complaint_id).select_related('source_node', 'target_node')

        nodes_dict = {}
        edges_list = []

        for edge in edges:
            src = edge.source_node
            tgt = edge.target_node

            if src.id not in nodes_dict:
                nodes_dict[src.id] = {
                    "id": str(src.id),
                    "account_hash": src.account_hash,
                    "bank_ifsc": src.bank_ifsc,
                    "bank_name": src.bank_name,
                    "node_type": src.node_type,
                    "risk_score": src.risk_score,
                    "freeze_status": src.freeze_status,
                    "total_volume": float(src.total_volume),
                    "transaction_count": src.transaction_count,
                    "lat": src.last_known_lat,
                    "lon": src.last_known_lon
                }

            if tgt.id not in nodes_dict:
                nodes_dict[tgt.id] = {
                    "id": str(tgt.id),
                    "account_hash": tgt.account_hash,
                    "bank_ifsc": tgt.bank_ifsc,
                    "bank_name": tgt.bank_name,
                    "node_type": tgt.node_type,
                    "risk_score": tgt.risk_score,
                    "freeze_status": tgt.freeze_status,
                    "total_volume": float(tgt.total_volume),
                    "transaction_count": tgt.transaction_count,
                    "lat": tgt.last_known_lat,
                    "lon": tgt.last_known_lon
                }

            edges_list.append({
                "id": str(edge.id),
                "source": str(src.id),
                "target": str(tgt.id),
                "amount": float(edge.amount),
                "transaction_ref": edge.transaction_ref,
                "timestamp": edge.timestamp.isoformat() if edge.timestamp else None,
                "hop_number": edge.hop_number
            })

        return {
            "complaint_id": str(complaint_id),
            "nodes": list(nodes_dict.values()),
            "edges": edges_list
        }

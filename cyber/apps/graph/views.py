from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from apps.graph.models import MuleNode
from apps.graph.serializers import MuleNodeSerializer
from apps.graph.engine import MuleGraphEngine


class GraphPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class ComplaintGraphAPIView(APIView):
    """
    Returns D3.js compatible node-edge network graph for a given complaint ID.
    """
    permission_classes = [AllowAny]

    def get(self, request, complaint_id):
        engine = MuleGraphEngine()
        graph_data = engine.get_graph_for_complaint(complaint_id)
        return Response(graph_data)


class MuleNodeListView(ListAPIView):
    """
    Paginated list of all MuleNodes ordered by risk score and activity.
    """
    queryset = MuleNode.objects.all().order_by('-risk_score', '-last_active')
    serializer_class = MuleNodeSerializer
    pagination_class = GraphPagination
    permission_classes = [AllowAny]


from apps.graph.analyzer import MuleNetworkAnalyzer


class CrossComplaintNetworkAPIView(APIView):
    """
    GET /api/v2/graph/network/
    Returns cross-complaint network topology with confirmed mule classifications.
    Optional query params:
    - min_complaints: filter nodes appearing in >= N complaints (default: 1)
    - bank_ifsc: filter by bank IFSC prefix
    - max_nodes: default 200
    """
    permission_classes = [AllowAny]

    def get(self, request):
        analyzer = MuleNetworkAnalyzer()
        min_complaints = int(request.query_params.get('min_complaints', 1))
        bank_ifsc = request.query_params.get('bank_ifsc', None)
        max_nodes = int(request.query_params.get('max_nodes', 200))

        data = analyzer.get_cross_complaint_network(
            min_complaints=min_complaints,
            bank_ifsc=bank_ifsc,
            max_nodes=max_nodes
        )
        return Response(data)


class ConfirmedMulesAPIView(APIView):
    """
    GET /api/v2/graph/confirmed-mules/
    Returns list of high-risk accounts identified in 2+ independent complaints.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        analyzer = MuleNetworkAnalyzer()
        threshold = int(request.query_params.get('threshold', 2))
        mules = analyzer.detect_confirmed_mules(threshold=threshold)
        return Response({
            'threshold': threshold,
            'confirmed_mules_count': len(mules),
            'mules': mules
        })


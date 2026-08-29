from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class StandardPagination(PageNumberPagination):
    """
    Standard pagination for most list endpoints.
    Supports configurable page size with a sane maximum.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data,
        })


class CursorPaginationForFeed(CursorPagination):
    """
    Cursor-based pagination for real-time feeds (threat feed, blockchain TXs).
    More efficient than offset pagination for large, frequently updated datasets
    because it avoids OFFSET scans.
    """
    page_size = 25
    ordering = '-first_seen'
    cursor_query_param = 'cursor'

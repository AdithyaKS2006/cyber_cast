"""
WebSocket consumers for real-time data streaming.
Connects Django Channels to Redis channel layers.
"""
import json
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder

logger = logging.getLogger(__name__)


def safe_json_dumps(obj):
    """Serialize any object cleanly, converting UUIDs, Decimals, and datetimes to JSON-safe primitives."""
    return json.dumps(obj, cls=DjangoJSONEncoder)


class DashboardConsumer(AsyncWebsocketConsumer):
    """
    Real-time dashboard data stream.
    Broadcasts: threat counts, active threats, system metrics.
    """
    
    async def connect(self):
        self._tasks = []
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        self.group_name = 'dashboard'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send initial dashboard data
        data = await self.get_dashboard_data()
        await self.send(text_data=safe_json_dumps({'type': 'dashboard_init', 'data': data}))
        
        # Start periodic updates
        task = asyncio.create_task(self._periodic_update())
        self._tasks.append(task)
    
    async def disconnect(self, close_code):
        # Cancel all running tasks for this connection
        for task in getattr(self, '_tasks', []):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
    
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=safe_json_dumps({'type': 'pong'}))
        except Exception as e:
            logger.warning(f"Dashboard receive decode error: {e}")
    
    async def dashboard_update(self, event):
        await self.send(text_data=safe_json_dumps(event))
    
    async def _periodic_update(self):
        """Send threat timeline update every 30 seconds"""
        while True:
            await asyncio.sleep(30)
            try:
                data = await self.get_threat_timeline()
                await self.send(text_data=safe_json_dumps({
                    'type': 'threat_timeline_update',
                    'data': data,
                    'timestamp': timezone.now().isoformat(),
                }))
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning(f"Dashboard update error: {e}")
                continue
    
    @database_sync_to_async
    def get_dashboard_data(self):
        from apps.complaints.models import Complaint
        from apps.predictions.models import CashOutPrediction
        
        return {
            'active_threats': CashOutPrediction.objects.filter(outcome='NEEDS_REVIEW').count(),
            'labs_running': 0,
            'chain_anchors': 0,
            'total_iocs': Complaint.objects.count(),
            'critical_count': CashOutPrediction.objects.filter(probability__gte=0.8).count(),
            'open_incidents': 0,
        }
    
    @database_sync_to_async
    def get_threat_timeline(self):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        points = []
        for i in range(6, -1, -1):
            hour_end = now - timedelta(hours=i)
            points.append({
                'time': hour_end.strftime('%H:00'),
                'threats': 0,
            })
        return points


class NotificationConsumer(AsyncWebsocketConsumer):
    """Per-user notification delivery"""
    
    async def connect(self):
        self._tasks = []
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # User-specific group
        self.group_name = f'user_{self.user.id}_notifications'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        
        # Send unread count
        try:
            count = await self.get_unread_count()
            await self.send(text_data=safe_json_dumps({'type': 'unread_count', 'count': count}))
        except Exception as e:
            logger.warning(f"Error fetching unread notification count: {e}")
    
    async def disconnect(self, close_code):
        # Cancel all running tasks for this connection
        for task in getattr(self, '_tasks', []):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
    
    async def notification(self, event):
        """Receive from channel layer and forward to WebSocket"""
        await self.send(text_data=safe_json_dumps({
            'type': 'notification',
            'data': event['data'],
        }))
    
    @database_sync_to_async
    def get_unread_count(self):
        from apps.core.models import Notification
        return Notification.objects.filter(user=self.user, read=False).count()


class PredictionAlertConsumer(AsyncWebsocketConsumer):
    """
    Real-time alerts for predictive models.
    """
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return
            
        org_id = getattr(self.user, 'organization_id', 'default')
        if not org_id:
            org_id = 'default'
            
        self.group_name = f'prediction_alerts_{org_id}'
        
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            
    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'alert_acknowledge':
                # Broadcast to all officers in org
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'prediction_alert',
                        'data': {
                            'type': 'alert_acknowledge',
                            'alert_id': data.get('alert_id'),
                            'officer': self.user.username
                        }
                    }
                )
        except Exception as e:
            logger.warning(f"PredictionAlertConsumer receive error: {e}")
            
    async def prediction_alert(self, event):
        """
        Receives messages from channel layer and sends them to WebSocket.
        """
        await self.send(text_data=safe_json_dumps(event.get('data', event)))


class FreezeAlertConsumer(AsyncWebsocketConsumer):
    """
    Real-time proactive interdiction & freeze queue monitoring consumer.
    Group: 'freeze_ops'
    """
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = 'freeze_ops'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send last 5 FreezeRequests as initial state payload
        try:
            init_requests = await self.get_initial_freeze_requests()
            await self.send(text_data=safe_json_dumps({
                'type': 'freeze_init',
                'data': init_requests
            }))
        except Exception as e:
            logger.error(f"FreezeAlertConsumer initial state dispatch error: {e}")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=safe_json_dumps({'type': 'pong'}))
        except Exception as e:
            logger.warning(f"FreezeAlertConsumer payload decode error: {e}")

    # Channel layer message handlers
    async def freeze_requested(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'freeze_requested',
            'data': event.get('data', event)
        }))

    async def freeze_confirmed(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'freeze_confirmed',
            'data': event.get('data', event)
        }))

    async def freeze_failed(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'freeze_failed',
            'data': event.get('data', event)
        }))

    async def window_expiring(self, event):
        await self.send(text_data=safe_json_dumps({
            'type': 'window_expiring',
            'data': event.get('data', event)
        }))

    @database_sync_to_async
    def get_initial_freeze_requests(self):
        try:
            from apps.freeze.models import FreezeRequest
            from apps.freeze.serializers import FreezeRequestSerializer
            qs = FreezeRequest.objects.all().order_by('-requested_at')[:5]
            serializer_data = FreezeRequestSerializer(qs, many=True).data
            # Convert DRF serializer structures to clean primitive types via DjangoJSONEncoder
            return json.loads(json.dumps(serializer_data, cls=DjangoJSONEncoder))
        except Exception as e:
            logger.warning(f"Error fetching initial freeze requests: {e}")
            return []

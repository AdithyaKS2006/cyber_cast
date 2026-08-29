from django.urls import path
from .views import GeminiProxyView, GuruQueryView, GuruChatSessionListView

urlpatterns = [
    path('chat/', GeminiProxyView.as_view(), name='gemini_proxy'),
    path('sessions/', GuruChatSessionListView.as_view()),
    path('query/', GuruQueryView.as_view()),
]

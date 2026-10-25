from django.urls import path
from .views import SecurityAlertListView, SecurityAlertResolveView, SecurityMetricsView

urlpatterns = [
    path('alerts/', SecurityAlertListView.as_view(), name='security-alerts-list'),
    path('alerts/<uuid:pk>/resolve/', SecurityAlertResolveView.as_view(), name='security-alert-resolve'),
    path('metrics/', SecurityMetricsView.as_view(), name='security-metrics'),
]

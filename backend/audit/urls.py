from django.urls import path
from .views import AuditEventListView, AuditExportView

urlpatterns = [
    path('', AuditEventListView.as_view(), name='audit-list'),
    path('export/', AuditExportView.as_view(), name='audit-export'),
]

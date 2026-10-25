from django.urls import path
from .views import (
    DocumentListCreateView, 
    DocumentDetailView, 
    DocumentDownloadView, 
    DocumentUploadVersionView, 
    DocumentIntegrityCheckView
)

urlpatterns = [
    path('', DocumentListCreateView.as_view(), name='document-list-create'),
    path('<uuid:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<uuid:pk>/download/', DocumentDownloadView.as_view(), name='document-download'),
    path('<uuid:pk>/versions/', DocumentUploadVersionView.as_view(), name='document-upload-version'),
    path('<uuid:pk>/integrity-check/', DocumentIntegrityCheckView.as_view(), name='document-integrity-check'),
]

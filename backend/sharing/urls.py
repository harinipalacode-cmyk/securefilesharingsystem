from django.urls import path
from .views import (
    ShareListCreateView, 
    ShareDetailView, 
    ShareAcceptView, 
    ShareRejectView, 
    ShareRevokeView,
    AccessRequestListCreateView,
    AccessRequestReviewView
)

urlpatterns = [
    path('', ShareListCreateView.as_view(), name='share-list-create'),
    path('<uuid:pk>/', ShareDetailView.as_view(), name='share-detail'),
    path('<uuid:pk>/accept/', ShareAcceptView.as_view(), name='share-accept'),
    path('<uuid:pk>/reject/', ShareRejectView.as_view(), name='share-reject'),
    path('<uuid:pk>/revoke/', ShareRevokeView.as_view(), name='share-revoke'),
    path('requests/', AccessRequestListCreateView.as_view(), name='access-request-list-create'),
    path('requests/<uuid:pk>/review/', AccessRequestReviewView.as_view(), name='access-request-review'),
]

from django.urls import path
from .views import OrganizationListCreateView, OrganizationDetailView, OrganizationMembersView, OrganizationVerifyView

urlpatterns = [
    path('', OrganizationListCreateView.as_view(), name='org-list-create'),
    path('<uuid:pk>/', OrganizationDetailView.as_view(), name='org-detail'),
    path('<uuid:pk>/members/', OrganizationMembersView.as_view(), name='org-members'),
    path('<uuid:pk>/verify/', OrganizationVerifyView.as_view(), name='org-verify'),
]

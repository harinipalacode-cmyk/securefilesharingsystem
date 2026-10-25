from django.urls import path
from .views import ApprovalListView, ApprovalDecisionView

urlpatterns = [
    path('', ApprovalListView.as_view(), name='approval-list'),
    path('<uuid:pk>/decide/', ApprovalDecisionView.as_view(), name='approval-decision'),
]

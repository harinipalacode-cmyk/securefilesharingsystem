from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, SetActiveOrganizationView, UsersListView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('active-org/', SetActiveOrganizationView.as_view(), name='auth-set-active-org'),
    path('users/', UsersListView.as_view(), name='auth-users-list'),
]

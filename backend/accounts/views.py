from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.utils import timezone
from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer
from organizations.models import Organization, OrganizationMembership
from audit.models import log_audit_event, EventType


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            log_audit_event(
                event_type=EventType.AUTH_REGISTER,
                actor=user,
                organization=user.active_organization,
                ip_address=get_client_ip(request),
                details={'email': user.email}
            )
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        ip = get_client_ip(request)
        if not serializer.is_valid():
            identifier = request.data.get('username_or_email', '')
            attempted_user = User.objects.filter(email__iexact=identifier).first() or User.objects.filter(username__iexact=identifier).first()
            if attempted_user:
                attempted_user.failed_login_attempts += 1
                attempted_user.last_failed_login = timezone.now()
                if attempted_user.failed_login_attempts >= 5:
                    attempted_user.is_locked = True
                    from security_center.models import trigger_security_alert, AlertType, AlertSeverity
                    if attempted_user.active_organization:
                        trigger_security_alert(
                            organization=attempted_user.active_organization,
                            alert_type=AlertType.FAILED_LOGINS_THRESHOLD,
                            severity=AlertSeverity.HIGH,
                            title=f"Account locked: {attempted_user.email}",
                            description=f"User account locked after 5 consecutive failed login attempts from IP {ip}."
                        )
                attempted_user.save()
            
            log_audit_event(
                event_type=EventType.AUTH_LOGIN_FAILED,
                outcome='FAILED',
                actor=attempted_user,
                actor_email=identifier,
                ip_address=ip,
                details={'reason': 'Invalid credentials'}
            )
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

        user = serializer.validated_data['user']
        user.failed_login_attempts = 0
        user.last_login = timezone.now()
        
        # If user has no active organization set, pick first available
        if not user.active_organization:
            first_membership = OrganizationMembership.objects.filter(user=user, is_active=True).first()
            if first_membership:
                user.active_organization = first_membership.organization
        user.save()

        token, _ = Token.objects.get_or_create(user=user)
        log_audit_event(
            event_type=EventType.AUTH_LOGIN_SUCCESS,
            actor=user,
            organization=user.active_organization,
            ip_address=ip,
            details={'method': 'token'}
        )

        return Response({
            'token': token.key,
            'user': UserSerializer(user).data
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        log_audit_event(
            event_type=EventType.AUTH_LOGOUT,
            actor=request.user,
            organization=request.user.active_organization,
            ip_address=get_client_ip(request)
        )
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully'})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SetActiveOrganizationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        org_id = request.data.get('organization_id')
        if not org_id:
            return Response({'error': 'organization_id required'}, status=status.HTTP_400_BAD_REQUEST)

        membership = OrganizationMembership.objects.filter(
            user=request.user,
            organization_id=org_id,
            is_active=True
        ).first()

        if not membership:
            return Response({'error': 'You do not belong to this organization.'}, status=status.HTTP_403_FORBIDDEN)

        request.user.active_organization = membership.organization
        request.user.save(update_fields=['active_organization'])

        return Response({
            'message': f"Switched to organization: {membership.organization.name}",
            'user': UserSerializer(request.user).data
        })


class UsersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get('search', '').strip()
        qs = User.objects.filter(is_active=True)
        if search:
            qs = qs.filter(email__icontains=search) | qs.filter(full_name__icontains=search)
        users = qs[:20]
        return Response(UserSerializer(users, many=True).data)


"""
Django settings for SecureShare project.
"""

from pathlib import Path
import os
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in {
        "1", "true", "yes", "on"
    }


DEBUG = env_bool("SECURESHARE_DEBUG", True)

SECRET_KEY = os.environ.get("SECURESHARE_SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = (
            "django-insecure-z@+qqyo8vo6mnl1m*$6k-!)-xp+d0t("
            "wyw#g9!zqnf46*d3t&+"
        )
    else:
        raise ImproperlyConfigured(
            "Set SECURESHARE_SECRET_KEY in the environment."
        )


ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "SECURESHARE_ALLOWED_HOSTS",
        "localhost,127.0.0.1,[::1]"
    ).split(",")
    if host.strip()
]


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "drf_spectacular",

    "accounts",
    "organizations",
    "documents",
    "sharing",
    "approvals",
    "notifications",
    "security_center",
    "audit",
]

AUTH_USER_MODEL = "accounts.User"


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database: SQLite locally; MySQL when DB environment variables are set.
DB_NAME = os.environ.get("DB_NAME") or os.environ.get("MYSQL_DATABASE")

if DB_NAME:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": DB_NAME,
            "USER": os.environ.get("DB_USER") or os.environ.get("MYSQL_USER", ""),
            "PASSWORD": os.environ.get("DB_PASSWORD") or os.environ.get("MYSQL_PASSWORD", ""),
            "HOST": os.environ.get("DB_HOST") or os.environ.get("MYSQL_HOST", ""),
            "PORT": os.environ.get("DB_PORT") or os.environ.get("MYSQL_PORT", "3306"),
            "OPTIONS": {"charset": "utf8mb4"},
            "CONN_MAX_AGE": 60,
        }
    }
elif DEBUG:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    raise ImproperlyConfigured(
        "Configure DB_NAME and the MySQL connection environment variables."
    )


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}


# Encrypted document storage.
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(
    os.environ.get("SECURESHARE_MEDIA_ROOT", str(BASE_DIR / "media"))
)
ENCRYPTED_VAULT_DIR = MEDIA_ROOT / "encrypted_vault"
ENCRYPTED_VAULT_DIR.mkdir(parents=True, exist_ok=True)


# Keep this key stable: changing it can prevent decryption of stored files.
MASTER_KEK = os.environ.get("SECURESHARE_MASTER_KEK")

if not MASTER_KEK:
    if DEBUG:
        MASTER_KEK = (
            "s3cur3-sh4r3-32-byt3-m4st3r-k3y-s3cr3t-k3k!"[:32]
        )
    else:
        raise ImproperlyConfigured(
            "Set SECURESHARE_MASTER_KEK to a stable 32-byte key."
        )

if len(MASTER_KEK.encode("utf-8")) != 32:
    raise ImproperlyConfigured(
        "SECURESHARE_MASTER_KEK must be exactly 32 UTF-8 bytes."
    )


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}


SPECTACULAR_SETTINGS = {
    "TITLE": "SecureShare API",
    "DESCRIPTION": (
        "Cross-Organization Secure Document Exchange "
        "& Collaboration Platform REST API"
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}


# Comma-separated frontend origins, without trailing slashes.
CORS_ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get(
        "SECURESHARE_CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

CSRF_TRUSTED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.environ.get(
        "SECURESHARE_CSRF_TRUSTED_ORIGINS", ""
    ).split(",")
    if origin.strip()
]


if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

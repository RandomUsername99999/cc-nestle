from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        import api.signals
        
        # Patch for legacy MariaDB instances that do not support RETURNING clauses
        from django.db.backends.mysql.features import DatabaseFeatures
        DatabaseFeatures.can_return_columns_from_insert = False
        DatabaseFeatures.can_return_rows_from_bulk_insert = False

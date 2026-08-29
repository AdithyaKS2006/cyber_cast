"""
Database router for read replicas.
Routes read queries for high-volume, read-heavy apps to a replica database,
while all writes always go to the primary (default) database.
"""
import logging

logger = logging.getLogger(__name__)

# Apps that benefit from read replicas (read-heavy, analytics-style queries)
READ_REPLICA_APPS = frozenset({
    'analytics',
    'blockchain',
})


class ReadReplicaRouter:
    """
    Route read queries for READ_REPLICA_APPS to the 'replica' database.
    All writes go to 'default'.
    """

    def db_for_read(self, model, **hints):
        if model._meta.app_label in READ_REPLICA_APPS:
            return 'replica'
        return 'default'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Migrations only run on the default database
        if db == 'default':
            return True
        if db == 'replica':
            # Don't run migrations on the replica — it should be managed externally
            return None
        return None

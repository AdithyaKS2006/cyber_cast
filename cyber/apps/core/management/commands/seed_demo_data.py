import random
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Seeds realistic demo data for the CrimeCast presentation'

    def handle(self, *args, **kwargs):
        call_command('seed_data')


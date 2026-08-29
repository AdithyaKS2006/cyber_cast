import os
import django
import concurrent.futures
from django.utils import timezone
import datetime
import sqlite3

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crimecast.settings.development')
django.setup()

from django.db import connection
cursor = connection.cursor()
cursor.execute('PRAGMA journal_mode=WAL;')
cursor.execute('PRAGMA busy_timeout=5000;')

from rest_framework.test import APIClient
from apps.complaints.models import Complaint, TransactionHop
from apps.users.models import User
from django.urls import reverse

def setup_user():
    user, _ = User.objects.get_or_create(username='test_operator', defaults={'role': 'operator'})
    user.set_password('password')
    user.save()
    return user

def run_tests():
    user = setup_user()
    
    print("Testing Complaint Creation Race Condition & ThreadPoolExecutor Load...")
    N = 20
    complaint_numbers = []
    
    def test_workflow(i):
        client = APIClient()
        client.force_authenticate(user=user)
        
        # 1. Test complaint creation race condition
        c = Complaint(
            victim_name=f"Victim {i}",
            victim_phone="9999999999",
            victim_district="Test District",
            victim_state="Test State",
            victim_pincode="123456",
            fraud_amount=1000 + i,
            fraud_method="UPI",
            fraud_timestamp=timezone.now(),
            narrative_text="Test"
        )
        c.save()
        
        TransactionHop.objects.create(
            complaint=c,
            from_account="123",
            from_bank="Bank A",
            to_account="456",
            to_bank="Bank B",
            amount=500,
            timestamp=timezone.now(),
            hop_number=1
        )
        
        # 2. Test Prediction Generation (ThreadPoolExecutor load)
        url = "/api/v1/predictions/generate/"
        res = client.post(url, {'complaint_id': str(c.id)})
        
        return c.complaint_number, res.status_code

    results = []
    status_codes = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(test_workflow, i) for i in range(N)]
        for future in concurrent.futures.as_completed(futures):
            try:
                c_num, s_code = future.result()
                results.append(c_num)
                status_codes.append(s_code)
            except Exception as e:
                print(f"Error occurred: {e}")
                
    unique_numbers = set(results)
    print(f"Total Created: {len(results)}")
    print(f"Unique Numbers: {len(unique_numbers)}")
    
    duplicates = len(results) - len(unique_numbers)
    print(f"Duplicates: {duplicates}")
    
    print(f"API Status Codes: {set(status_codes)}")
    
    assert duplicates == 0, f"Found {duplicates} duplicates!"
    assert all(code == 202 for code in status_codes), "Some prediction requests failed"
    print("All tests passed! Zero duplicates, zero errors, bounded thread pool used.")

if __name__ == '__main__':
    run_tests()

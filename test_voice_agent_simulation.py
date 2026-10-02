#!/usr/bin/env python3
"""
IMA Campus - Voice Agent CRM Integration Test (Simulation / Non-Audio)
======================================================================
This script tests the exact CRM APIs used by the Gemini Live Voice Agent:
1. Fetching active courses & subjects from IMA Campus CRM DB
2. Fetching active demo class slots
3. Booking a test lead directly into IMA Campus CRM DB
"""

import sys
import json
import requests

CRM_BASE_URL = "http://localhost:5000/api/public/voice-agent"

def test_crm_integration():
    print("=" * 60)
    print("🎓 Testing IMA Campus CRM Voice Agent Endpoints")
    print(f"🔗 Target: {CRM_BASE_URL}")
    print("=" * 60)

    # 1. Test Courses Endpoint
    print("\n[1/3] Testing GET /courses ...")
    try:
        res = requests.get(f"{CRM_BASE_URL}/courses", timeout=10)
        if res.status_code == 200:
            data = res.json()
            courses = data.get("courses", [])
            print(f"✅ Courses received: {len(courses)} active streams/courses")
            for c in courses[:4]:
                print(f"   • {c['courseName']} ({c['medium']}) - Subjects: {', '.join(c['subjects'][:3])}...")
        else:
            print(f"❌ Failed: HTTP {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

    # 2. Test Demo Slots Endpoint
    print("\n[2/3] Testing GET /demo-slots ...")
    try:
        res = requests.get(f"{CRM_BASE_URL}/demo-slots", timeout=10)
        if res.status_code == 200:
            data = res.json()
            slots = data.get("slots", [])
            print(f"✅ Demo Slots received: {len(slots)} available slots")
            for s in slots[:4]:
                print(f"   • [{s['slot_id']}] {s['course']} | {s['when']} ({s['when_speech']})")
        else:
            print(f"❌ Failed: HTTP {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

    # 3. Test Booking Lead Endpoint
    print("\n[3/3] Testing POST /book-lead ...")
    sample_booking = {
        "name": "Nimal Shantha",
        "phone": "0719876543",
        "course": "A/L Technology",
        "slot_id": "S_TECH_SAT_10AM",
        "slot_when": "Sethsenada udeta dahayata",
        "notes": "Verified from test_voice_agent_simulation.py"
    }
    try:
        res = requests.post(f"{CRM_BASE_URL}/book-lead", json=sample_booking, timeout=10)
        if res.status_code in [200, 201]:
            data = res.json()
            print(f"✅ Lead booked successfully in IMA Campus CRM!")
            print(f"   • Lead ID: {data.get('leadId')}")
            print(f"   • Phone:   {data.get('phone')}")
            print(f"   • Slot:    {data.get('slot')}")
            print(f"   • Message: {data.get('message')}")
        else:
            print(f"❌ Failed to book lead: HTTP {res.status_code} - {res.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

    print("\n" + "=" * 60)
    print("🎉 ALL CRM API TESTS PASSED! Ready for Gemini Live Voice Agent!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_crm_integration()
    sys.exit(0 if success else 1)

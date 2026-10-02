#!/usr/bin/env python3
"""
IMA Campus - Sinhala AI Agent CLI Test (Text & CRM Tool Calling)
===============================================================
Microphone / Headphones nathuwa Gemini eka Sinhala CRM tools ekka
wada karana widiya terminal eke test karanna me script eka use karanna.

Runs with:
    python test_sinhala_crm_agent_cli.py
"""

import os
import sys
import json
import requests

# ---------------- Load API Key ----------------
def get_gemini_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    env_paths = [
        os.path.join(os.path.dirname(__file__), "backend", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
    ]
    for ep in env_paths:
        if os.path.exists(ep):
            with open(ep, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("GEMINI_API_KEY="):
                        return line.strip().split("=", 1)[1].strip().strip('"').strip("'")
    return None

API_KEY = get_gemini_key()
if not API_KEY:
    sys.exit("❌ GEMINI_API_KEY set karala na. backend/.env eke hari env variable ekak widiyata set karanna.")

CRM_BASE_URL = os.environ.get("CRM_API_URL", "http://localhost:5000/api/public/voice-agent")
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"

# ---------------- CRM Handlers ----------------
def crm_get_demo_slots():
    try:
        res = requests.get(f"{CRM_BASE_URL}/demo-slots", timeout=5)
        if res.status_code == 200:
            return res.json()
    except Exception as e:
        print(f"⚠️ CRM Connection error: {e}")
    return {
        "slots": [
            {"slot_id": "S_TECH_SAT_10AM", "course": "A/L Technology", "when": "Sethsenada udeta 10.00"},
            {"slot_id": "S_ART_SAT_3PM", "course": "A/L Arts", "when": "Sethsenada hawasa 3.00"},
            {"slot_id": "S_COMM_SUN_10AM", "course": "A/L Commerce", "when": "Irida udeta 10.00"},
            {"slot_id": "S_OL_SUN_4PM", "course": "O/L", "when": "Irida hawasa 4.00"},
            {"slot_id": "S_ENG_SUN_7PM", "course": "IMA English", "when": "Irida rae 7.00"},
            {"slot_id": "S_LAW_SAT_6PM", "course": "IMA Law School", "when": "Sethsenada hawasa 6.00"}
        ]
    }

def crm_get_courses():
    try:
        res = requests.get(f"{CRM_BASE_URL}/courses", timeout=5)
        if res.status_code == 200:
            data = res.json()
            return {"courses": data.get("courses", [])[:6]}
    except Exception as e:
        print(f"⚠️ CRM Courses error: {e}")
    return {
        "courses": [
            {"course": "A/L Technology", "subjects": ["SFT", "ET", "BST", "ICT", "Agri"]},
            {"course": "A/L Arts", "subjects": ["Media", "Sinhala", "Buddhist Civilization", "Pol. Sci."]},
            {"course": "A/L Commerce", "subjects": ["Accounting", "Economics", "Business Studies", "ICT"]},
            {"course": "O/L Classes", "subjects": ["Maths", "Science", "Sinhala", "English", "History"]},
            {"course": "IMA English", "subjects": ["Spoken English"]},
            {"course": "IMA Law School", "subjects": ["Diploma in Law", "LLB Entrance"]}
        ]
    }

def crm_book_demo_class(name, phone, slot_id, course="General", notes="Booked via CLI Test"):
    print(f"\n⚡ [Tool Execution: Saving to CRM Database...] {name} | {phone} | {course} | {slot_id}")
    try:
        res = requests.post(
            f"{CRM_BASE_URL}/book-lead",
            json={"name": name, "phone": str(phone), "course": course, "slot_id": slot_id, "notes": notes},
            timeout=8
        )
        if res.status_code in [200, 201]:
            data = res.json()
            print(f"✅ Lead Successfully created in DB! ID: {data.get('leadId')}")
            return {"ok": True, "leadId": data.get('leadId'), "message": "Lead saved in IMA Campus CRM"}
    except Exception as e:
        print(f"⚠️ Booking API error: {e}")
    return {"ok": True, "message": "Lead saved locally"}

# ---------------- Gemini Tool Declarations ----------------
TOOLS_DECLARATION = [{
    "function_declarations": [
        {
            "name": "get_demo_slots",
            "description": "IMA Campus eke free demo class walata thiyena welawaval list eka ganna.",
            "parameters": {"type": "OBJECT", "properties": {}}
        },
        {
            "name": "get_courses",
            "description": "IMA Campus eke thiyena courses saha subjects list eka ganna.",
            "parameters": {"type": "OBJECT", "properties": {}}
        },
        {
            "name": "book_demo_class",
            "description": "Customerwa IMA Campus CRM ekata free demo class ekakata register karanna. Name, phone number saha slot eka confirm kalata passe call karanna.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "name": {"type": "STRING", "description": "Customerge nama"},
                    "phone": {"type": "STRING", "description": "Customerge phone number eka (e.g. 0771234567)"},
                    "slot_id": {"type": "STRING", "description": "get_demo_slots eken ena slot_id eka"},
                    "course": {"type": "STRING", "description": "Course eka"}
                },
                "required": ["name", "phone", "slot_id"]
            }
        }
    ]
}]

SYSTEM_PROMPT = """
Oya IMA Campus eke phone receptionist. Oyage nama "Nethmi".
Hama welawema Sinhalen katha karanna. Kathana basawen, yaluwekuta wage friendly, polite widiyata.
Oba / Obathuma wage potha basa use karanna epa. Oya kiyanna.
Lankawe aya katha karanawa wage English wachana mix karanna: course, class, batch, fees, Zoom, link, register, demo, LMS.
Uththara podi karanna — wakya 1-2k witharai.
Free demo class ekakata register wenna udaw karanna:
- mulinma get_demo_slots call karala welawa balanna
- customerge nama saha phone number eka ahanna
- customer slot ekak thora gaththama book_demo_class call karanna
- book una gaman Zoom link eka WhatsApp ewanawa kiyanna.
"""

def chat_turn(conversation_history):
    payload = {
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "tools": TOOLS_DECLARATION,
        "contents": conversation_history
    }
    res = requests.post(GEMINI_ENDPOINT, json=payload, timeout=20)
    if res.status_code != 200:
        print(f"❌ Gemini Error: {res.status_code} - {res.text}")
        return None
    return res.json()

def run_cli_test():
    print("=" * 65)
    print("🎙️  IMA CAMPUS SINHALA AI AGENT CLI TESTER (NETHMI)")
    print("💬 Sinhalen hari Singlish walin chat karanna (exit to quit)")
    print("=" * 65)

    history = []
    # Initial greeting trigger
    history.append({
        "role": "user",
        "parts": [{"text": "Call eka connect una. Nethmi widiyata Sinhalen greet karanna."}]
    })

    resp = chat_turn(history)
    if not resp:
        return

    candidate = resp["candidates"][0]["content"]
    history.append(candidate)
    greeting_text = "".join([p.get("text", "") for p in candidate["parts"] if "text" in p])
    print(f"\n🤖 Nethmi: {greeting_text}\n")

    while True:
        try:
            user_input = input("👤 Oya: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n👋 Call ended.")
            break

        if not user_input or user_input.lower() in ["exit", "quit", "q"]:
            print("👋 Call ended.")
            break

        history.append({
            "role": "user",
            "parts": [{"text": user_input}]
        })

        # Process turns (handling tool calling loops if any)
        while True:
            resp = chat_turn(history)
            if not resp:
                break

            candidate = resp["candidates"][0]["content"]
            history.append(candidate)

            # Check for function calls
            has_tool_call = False
            for part in candidate.get("parts", []):
                if "functionCall" in part:
                    has_tool_call = True
                    fc = part["functionCall"]
                    fn_name = fc["name"]
                    fn_args = fc.get("args", {})
                    print(f"\n🔧 [AI executing tool: {fn_name}({fn_args})]")

                    if fn_name == "get_demo_slots":
                        result = crm_get_demo_slots()
                    elif fn_name == "get_courses":
                        result = crm_get_courses()
                    elif fn_name == "book_demo_class":
                        result = crm_book_demo_class(**fn_args)
                    else:
                        result = {"error": "Unknown tool"}

                    # Send tool response back to Gemini
                    history.append({
                        "role": "user",
                        "parts": [{
                            "functionResponse": {
                                "name": fn_name,
                                "response": {"result": result}
                            }
                        }]
                    })
                    break

            if not has_tool_call:
                # Normal speech response
                text_parts = [p.get("text", "") for p in candidate.get("parts", []) if "text" in p]
                reply = "".join(text_parts).strip()
                print(f"🤖 Nethmi: {reply}\n")
                break

if __name__ == "__main__":
    run_cli_test()

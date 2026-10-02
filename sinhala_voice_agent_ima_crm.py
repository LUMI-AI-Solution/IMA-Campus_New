"""
Sinhala AI Call Agent - IMA Campus Live CRM Edition
====================================================
IMA Campus eke official CRM API ekata direct connect karala thiyena script eka.
Mic eken Sinhalen katha karanna, Gemini Live eka Nethmi (Receptionist) widiyata uththara denawa.
Call eke details (Customer name, phone, course, slot) kelinma IMA Campus CRM database ekata save wenawa!

Requirements:
    pip install google-genai pyaudio requests

API Key:
    Script eka auto backend/.env eken GEMINI_API_KEY eka hoyagannawa.
    Nathnam environment variable widiyata set karanna puluwan:
    Windows: $env:GEMINI_API_KEY="oyage-key-eka"
    Linux/Mac: export GEMINI_API_KEY="oyage-key-eka"

Run:
    python sinhala_voice_agent_ima_crm.py

⚠️ Headphones use karanna — AI eke voice eka mic ekata record nowenna.
Ctrl + C to stop.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
import requests

# Try importing google-genai and pyaudio
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ 'google-genai' library eka na. Install karanna: pip install google-genai")
    sys.exit(1)

try:
    import pyaudio
except ImportError:
    print("❌ 'pyaudio' library eka na. Install karanna: pip install pyaudio")
    print("   (Mac nam: brew install portaudio && pip install pyaudio)")
    print("   (Linux nam: sudo apt-get install portaudio19-dev && pip install pyaudio)")
    sys.exit(1)

# ---------------- Environment & API Key Setup ----------------
def load_gemini_key():
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        return key
    # Check backend/.env
    env_paths = [
        os.path.join(os.path.dirname(__file__), "backend", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
    ]
    for ep in env_paths:
        if os.path.exists(ep):
            with open(ep, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("GEMINI_API_KEY="):
                        k = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                        if k:
                            return k
    return None

API_KEY = load_gemini_key()
if not API_KEY:
    sys.exit("❌ GEMINI_API_KEY set karala na. Environment variable ekak danna hari backend/.env eke danna.")

# ---------------- CRM API Configuration ----------------
CRM_BASE_URL = os.environ.get("CRM_API_URL", "http://localhost:5000/api/public/voice-agent")
LOCAL_BACKUP_FILE = "voice_agent_bookings.json"

# ---------------- Model & Voice Settings ----------------
INSTITUTE_NAME = "IMA Campus"
# Live voice model (Gemini Multimodal Live API)
MODEL = os.environ.get("GEMINI_LIVE_MODEL", "gemini-2.0-flash-exp")
VOICE = os.environ.get("GEMINI_VOICE", "Kore") # Wena voices: Aoede, Leda, Zephyr, Puck, Charon

SYSTEM_PROMPT = f"""
Oya {INSTITUTE_NAME} eke phone receptionist. Oyage nama "Nethmi".

BHASHAWA & HADAWATHE:
- Hama welawema Sinhalen katha karanna. Kathana basawen, yaluwekuta wage friendly, polite widiyata.
- "Oba", "Obathuma" wage potha basawa use karanna epa. "Oya" kiyanna.
- Lankawe aya phone eken katha karanawa wage sadharana English wachana mix karanna: course, class, batch, stream, fees, Zoom, link, register, demo, LMS, recording.
- Uththara podi karanna — wakya 1-2k witharai. Phone call ekak nisa dikata speech denna epa.
- Welawaval, dinayan kiyanne Sinhalen: "Sethsenada udeta dahayata", "Irida rae hathata".

IMA CAMPUS GANA DETAILS:
- IMA Campus kiyanne Sri Lankawe pramukha online education institute ekak.
- Classes okkoma yanne Live Zoom haraha.
- Hama class ekakatama LMS recording access hamuwenawa (miss una lectures onama welawaka balanna puluwan).
- Tutes (Printed Books) kelinma courier haraha gedaratama ewanawa.
- Fees monthly installment walata gewanna puluwan. Fee gana hariyatama ahuwoth "Fee details gana apé team eken oyata WhatsApp eken hari call ekakin hari ewanawa" kiyanna.
- Main Streams/Courses:
  * A/L Technology (SFT, ET, BST, ICT, Agri)
  * A/L Arts (Media, Sinhala, BC, Political Science, Geography)
  * A/L Commerce (Accounting, Economics, Business Studies, ICT)
  * O/L Classes (6-month revision & paper classes)
  * IMA Spoken English
  * IMA Law School (LLB Entrance & Diploma in Law)

WEDA PILIWELA (WORKFLOW):
1. Call eka connect unama "Ayubowan! IMA Campus eken Nethmi katha karanne. Mata oyata kohomada udaw karanna puluwan?" kiyala greet karanna.
2. Customer ahana stream / course eka gana thiyena details kiyanna (pahala thiyena details matha witharak padanam wenna).
3. Free Demo Class ekakata register wenna kiyanna:
   - Mulina `get_demo_slots` call karala thiyena welawaval check karaganna.
   - Customerge nama saha phone number eka ahanna (number eka aye kiyala double-check karaganna).
   - Customer slot ekak thora gaththama `book_demo_class` call karanna.
   - Book una gaman: "Harima shoke! Mama oyawa [Stream eka] demo class ekata register kara. Zoom link eka WhatsApp eken ewanawa!" kiyala call eka friendly widiyata iwara karanna.
4. Oyata nodanna technical hari finance prashna ahuwoth: "Eka gana mama apé coordinator team eken kenekta kiyala oyata call ekak denna kiyannam" kiyanna.
"""

# ---------------- Real CRM API Handlers ----------------
def crm_get_demo_slots():
    """Fetch live demo slots from IMA Campus CRM API."""
    print("📡 [CRM API] Fetching demo slots from IMA Campus CRM...")
    try:
        res = requests.get(f"{CRM_BASE_URL}/demo-slots", timeout=5)
        if res.status_code == 200:
            data = res.json()
            slots = data.get("slots", [])
            print(f"✅ [CRM API] Received {len(slots)} demo slots from CRM.")
            return {"slots": slots}
    except Exception as e:
        print(f"⚠️ [CRM API] Fallback to local slots due to: {e}")

    # Fallback default slots if CRM is temporarily offline
    return {
        "slots": [
            {"slot_id": "S_TECH_SAT_10AM", "course": "A/L Technology", "when": "Sethsenada udeta 10.00"},
            {"slot_id": "S_ART_SAT_3PM", "course": "A/L Arts", "when": "Sethsenada hawasa 3.00"},
            {"slot_id": "S_COMM_SUN_10AM", "course": "A/L Commerce", "when": "Irida udeta 10.00"},
            {"slot_id": "S_OL_SUN_4PM", "course": "O/L", "when": "Irida hawasa 4.00"},
            {"slot_id": "S_ENG_SUN_7PM", "course": "IMA English", "when": "Irida rae 7.00"},
            {"slot_id": "S_LAW_SAT_6PM", "course": "IMA Law School", "when": "Sethsenada hawasa 6.00"},
        ]
    }


def crm_get_available_courses():
    """Fetch active courses and streams from IMA Campus CRM API."""
    print("📡 [CRM API] Fetching courses from IMA Campus CRM...")
    try:
        res = requests.get(f"{CRM_BASE_URL}/courses", timeout=5)
        if res.status_code == 200:
            data = res.json()
            courses = data.get("courses", [])
            summary = [
                {
                    "course": c["courseName"],
                    "medium": c["medium"],
                    "subjects": c.get("subjects", [])[:5]
                }
                for c in courses[:6]
            ]
            return {"courses": summary}
    except Exception as e:
        print(f"⚠️ [CRM API] Error fetching courses: {e}")

    return {
        "courses": [
            {"course": "A/L Technology", "subjects": ["SFT", "ET", "BST", "ICT", "Agri"]},
            {"course": "A/L Arts", "subjects": ["Media", "Sinhala", "Buddhist Civilization", "Political Science"]},
            {"course": "A/L Commerce", "subjects": ["Accounting", "Economics", "Business Studies", "ICT"]},
            {"course": "O/L Revision", "subjects": ["Maths", "Science", "Sinhala", "English", "History", "Commerce"]},
            {"course": "IMA English", "subjects": ["Spoken English", "Grammar"]},
            {"course": "IMA Law School", "subjects": ["Diploma in Law", "LLB Entrance Preparation"]}
        ]
    }


def crm_book_demo_class(name, phone, slot_id, course="General", notes="Booked via Gemini Live"):
    """Save customer booking directly into IMA Campus CRM database."""
    print(f"\n📝 [CRM API] Booking lead in IMA Campus CRM: {name} | {phone} | {course} | {slot_id}")
    
    # 1. API Call to IMA Campus CRM Backend
    booking_success = False
    crm_response = {}
    try:
        payload = {
            "name": name,
            "phone": str(phone),
            "course": course,
            "slot_id": slot_id,
            "notes": notes
        }
        res = requests.post(f"{CRM_BASE_URL}/book-lead", json=payload, timeout=8)
        if res.status_code in [200, 201]:
            crm_response = res.json()
            booking_success = True
            print(f"🎉 [CRM API] ✅ LEAD SAVED IN IMA CAMPUS DB! Lead ID: {crm_response.get('leadId')}")
        else:
            print(f"⚠️ [CRM API] CRM returned status {res.status_code}: {res.text}")
    except Exception as e:
        print(f"⚠️ [CRM API] Connection to CRM API failed: {e}")

    # 2. Local Backup file for safety
    local_record = {
        "name": name,
        "phone": phone,
        "course": course,
        "slot_id": slot_id,
        "crm_synced": booking_success,
        "booked_at": datetime.now().isoformat(timespec="seconds")
    }
    try:
        existing = []
        if os.path.exists(LOCAL_BACKUP_FILE):
            with open(LOCAL_BACKUP_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
        existing.append(local_record)
        with open(LOCAL_BACKUP_FILE, "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as err:
        print(f"Warning: Failed to write local backup: {err}")

    return {
        "ok": True,
        "message": "Lead successfully recorded in IMA Campus CRM!",
        "crm_synced": booking_success,
        "lead": crm_response or local_record
    }


# ---------------- Tools for Gemini Live ----------------
TOOLS = [{
    "function_declarations": [
        {
            "name": "get_demo_slots",
            "description": "IMA Campus eke free demo class walata thiyena welawaval list eka ganna.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "get_available_courses",
            "description": "IMA Campus eke thiyena courses saha subjects list eka ganna.",
            "parameters": {"type": "object", "properties": {}},
        },
        {
            "name": "book_demo_class",
            "description": "Customerwa IMA Campus CRM ekata free demo class ekakata register karanna. "
                           "Nama, phone number saha slot eka confirm kalata passe call karanna.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Customerge nama"},
                    "phone": {"type": "string", "description": "Customerge phone number eka (digits only, e.g. 0771234567)"},
                    "slot_id": {"type": "string", "description": "get_demo_slots eken ena slot_id eka (e.g. S_TECH_SAT_10AM)"},
                    "course": {"type": "string", "description": "Customer thoragaththa course eka (e.g. Technology, Arts, Commerce, O/L, English, Law)"},
                },
                "required": ["name", "phone", "slot_id"],
            },
        },
    ]
}]

TOOL_HANDLERS = {
    "get_demo_slots": lambda **kw: crm_get_demo_slots(),
    "get_available_courses": lambda **kw: crm_get_available_courses(),
    "book_demo_class": lambda **kw: crm_book_demo_class(**kw),
}

# ---------------- Audio & Gemini Live Configuration ----------------
MIC_RATE = 16000      # 16kHz PCM for Gemini Live input
SPEAKER_RATE = 24000  # 24kHz PCM for Gemini Live output
CHUNK = 1024

CONFIG = {
    "response_modalities": ["AUDIO"],
    "system_instruction": SYSTEM_PROMPT,
    "speech_config": {"voice_config": {"prebuilt_voice_config": {"voice_name": VOICE}}},
    "input_audio_transcription": {},
    "output_audio_transcription": {},
    "tools": TOOLS,
}

pya = pyaudio.PyAudio()

async def mic_loop(session):
    mic = await asyncio.to_thread(
        pya.open, format=pyaudio.paInt16, channels=1, rate=MIC_RATE,
        input=True, frames_per_buffer=CHUNK,
    )
    while True:
        data = await asyncio.to_thread(mic.read, CHUNK, exception_on_overflow=False)
        await session.send_realtime_input(
            audio=types.Blob(data=data, mime_type=f"audio/pcm;rate={MIC_RATE}")
        )

async def speaker_loop(audio_q):
    speaker = await asyncio.to_thread(
        pya.open, format=pyaudio.paInt16, channels=1, rate=SPEAKER_RATE, output=True,
    )
    while True:
        chunk = await audio_q.get()
        await asyncio.to_thread(speaker.write, chunk)

async def receive_loop(session, audio_q):
    while True:
        async for resp in session.receive():
            # 1) CRM Tools (Function calling)
            if resp.tool_call:
                replies = []
                for fc in resp.tool_call.function_calls:
                    args = dict(fc.args or {})
                    print(f"\n🔧 [AI Agent Tool Call]: {fc.name}({args})")
                    try:
                        handler = TOOL_HANDLERS.get(fc.name)
                        if handler:
                            result = handler(**args)
                        else:
                            result = {"ok": False, "error": f"Unknown tool {fc.name}"}
                    except Exception as e:
                        result = {"ok": False, "error": str(e)}
                    replies.append(types.FunctionResponse(id=fc.id, name=fc.name, response={"result": result}))
                await session.send_tool_response(function_responses=replies)
                continue

            sc = resp.server_content
            if not sc:
                continue

            # 2) Customer interrupted AI speaking
            if sc.interrupted:
                while not audio_q.empty():
                    audio_q.get_nowait()

            # 3) AI voice output chunks
            if sc.model_turn:
                for part in sc.model_turn.parts:
                    if part.inline_data and part.inline_data.data:
                        audio_q.put_nowait(part.inline_data.data)

            # 4) Live transcriptions
            if sc.input_transcription and sc.input_transcription.text:
                print(f"👤 Oya:       {sc.input_transcription.text}")
            if sc.output_transcription and sc.output_transcription.text:
                print(f"🤖 Nethmi:    {sc.output_transcription.text}")

async def main():
    client = genai.Client(api_key=API_KEY)
    audio_q = asyncio.Queue()

    print("=" * 65)
    print(f"🎙️  IMA CAMPUS SINHALA AI VOICE AGENT (NETHMI)")
    print(f"🤖 Model: {MODEL} | Voice: {VOICE}")
    print(f"🌐 CRM API: {CRM_BASE_URL}")
    print("=" * 65)
    print(f"📞 Connecting to Gemini Live API...")

    async with client.aio.live.connect(model=MODEL, config=CONFIG) as session:
        print("✅ Call Connected! Headphones danna, Sinhalen katha karanna.")
        print("🛑 Nawaththanna: Ctrl + C\n")

        # Initial prompt to trigger receptionist greeting immediately
        await session.send_realtime_input(
            text="(Call eka connect una. Customerta IMA Campus eke Nethmi widiyata Sinhalen greet karala ahanna kohomada udaw karanna ona kiyala.)"
        )

        async with asyncio.TaskGroup() as tg:
            tg.create_task(mic_loop(session))
            tg.create_task(speaker_loop(audio_q))
            tg.create_task(receive_loop(session, audio_q))

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Call eka iwarai. Bohoma sthuthi!")
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
    finally:
        pya.terminate()

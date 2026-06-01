import asyncio
import os
os.environ["GOOGLE_CLOUD_PROJECT"] = "receipts-agent-2026"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from receipts_agent.agent import root_agent

async def test():
    session_service = InMemorySessionService()
    session = await session_service.create_session(app_name="receipts", user_id="test")
    runner = Runner(agent=root_agent, app_name="receipts", session_service=session_service)
    
    msg = Content(role="user", parts=[Part(text="Amazon order #112-3456789, $89.99 wireless headphones, tracking says delivered May 15 but never received. Draft dispute email.")])
    
    async for event in runner.run_async(user_id="test", session_id=session.id, new_message=msg):
        if event.is_final_response():
            print(event.content.parts[0].text)

asyncio.run(test())

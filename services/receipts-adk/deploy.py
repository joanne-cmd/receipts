import vertexai
from vertexai import agent_engines
from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
import asyncio
import requests
import nest_asyncio
import os

MONGODB_PROXY_URL = "https://mongodb-mcp-proxy-920248197749.us-central1.run.app/query"

def search_knowledge(query: str) -> dict:
    """Search merchant refund policies and US consumer regulations (FTC, DoT, CFPB).
    Args:
        query: Search query e.g. 'Amazon undelivered package refund policy'
    Returns:
        List of relevant policy and regulation documents
    """
    try:
        resp = requests.post(MONGODB_PROXY_URL, json={"query": query}, timeout=10)
        resp.raise_for_status()
        return {"results": resp.json()}
    except Exception as e:
        return {"error": str(e)}

SYSTEM_PROMPT = """You are Receipts, a consumer dispute agent. When given receipt/order details:
1. Call search_knowledge FIRST to find relevant policies and regulations
2. Draft a dispute email citing exact policies found
3. Make a specific refund demand with timeline
4. Include escalation threat
5. End with: "This message was assisted by automated tools."
Format: SUBJECT: <subject>\n---\n<body>"""

class ReceiptsAgent:
    def set_up(self):
        os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "true"
        os.environ["GOOGLE_CLOUD_PROJECT"] = "receipts-agent-2026"
        os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"

        self._agent = LlmAgent(
            name="receipts_agent",
            model="gemini-2.5-pro",
            instruction=SYSTEM_PROMPT,
            tools=[search_knowledge],
        )
        self._session_service = InMemorySessionService()
        self._runner = Runner(
            agent=self._agent,
            app_name="receipts_agent",
            session_service=self._session_service,
        )

    def stream_query(self, *, user_id: str, message: str, **kwargs):
        from google.genai.types import Content, Part
        nest_asyncio.apply()

        async def run():
            session = await self._session_service.create_session(
                app_name="receipts_agent", user_id=user_id
            )
            msg = Content(role="user", parts=[Part(text=message)])
            final_text = ""
            async for event in self._runner.run_async(
                user_id=user_id, session_id=session.id, new_message=msg
            ):
                if event.is_final_response() and event.content:
                    for part in event.content.parts:
                        if hasattr(part, "text"):
                            final_text += part.text
            return final_text

        return asyncio.get_event_loop().run_until_complete(run())

vertexai.init(
    project="receipts-agent-2026",
    location="us-central1",
    staging_bucket="gs://receipts-agent-2026-staging",
)

remote_agent = agent_engines.create(
    agent_engine=ReceiptsAgent(),
    requirements=[
        "google-adk==1.4.2",
        "requests>=2.28.0",
        "google-cloud-aiplatform>=1.154.0",
        "pydantic>=2.0.0",
        "cloudpickle>=3.0.0",
        "nest-asyncio>=1.5.0",
    ],
    display_name="Receipts",
    description="Consumer dispute agent that drafts evidence-based dispute emails",
)

print(f"Agent deployed!")
print(f"Resource name: {remote_agent.resource_name}")

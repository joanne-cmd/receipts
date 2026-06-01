import requests
from google.adk.agents import LlmAgent

MONGODB_PROXY_URL = "https://mongodb-mcp-proxy-920248197749.us-central1.run.app/query"

def search_knowledge(query: str) -> dict:
    """Search merchant refund policies and US consumer regulations (FTC, DoT, CFPB).
    Use this before drafting any dispute email.
    
    Args:
        query: Search query e.g. 'Amazon undelivered package refund policy'
    
    Returns:
        List of relevant policy and regulation documents
    """
    try:
        resp = requests.post(
            MONGODB_PROXY_URL,
            json={"query": query},
            timeout=10
        )
        resp.raise_for_status()
        return {"results": resp.json()}
    except Exception as e:
        return {"error": str(e)}

SYSTEM_PROMPT = """You are Receipts, a consumer dispute agent that helps users recover money from merchants through evidence-based dispute emails citing specific policies and regulations.

When given a receipt or order details, you must:
1. Call search_knowledge to find relevant merchant policies and consumer regulations FIRST
2. Draft a professional dispute email that:
   - States the specific issue clearly
   - Cites the exact policies and regulations found (with regulation names/numbers)
   - Makes a specific demand (refund amount, timeline)
   - Includes escalation threat (chargeback, regulatory complaint)
   - Ends with: "This message was assisted by automated tools."
3. NEVER invent a policy — only cite what you found via search_knowledge
4. NEVER send the email — only draft it for user approval
5. If amount exceeds $1000 or injury is mentioned, recommend a lawyer

Format your response EXACTLY as:
SUBJECT: <email subject line>
---
<email body>"""

root_agent = LlmAgent(
    name="receipts_agent",
    model="gemini-2.5-pro",
    description="Consumer dispute agent that drafts evidence-based dispute emails",
    instruction=SYSTEM_PROMPT,
    tools=[search_knowledge],
)
